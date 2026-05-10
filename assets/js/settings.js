// settings.js — Company details (Supabase), Invoice template upload (Storage), User profile (Firebase Auth)
import { sb } from "./supabase.js";
import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const $ = (s) => document.querySelector(s);

const TEMPLATE_BUCKET = "Invoices";
const TEMPLATE_PATH = "Templates/ZAtech Invoice.docx";
const TEMPLATE_PUBLIC_URL =
  "https://eymqvzjwbolgmywpwhgi.supabase.co/storage/v1/object/public/Invoices/Templates/ZAtech%20Invoice.docx";

const fmtDateTime = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
};

const flash = (el, text, ok = true) => {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("ok", ok);
  el.classList.toggle("err", !ok);
  if (text) setTimeout(() => { el.textContent = ""; el.classList.remove("ok", "err"); }, 3000);
};

// ===== Company Details (Supabase: settings_company id=1) =====
const co = {
  name:    () => $("#coName"),
  email:   () => $("#coEmail"),
  phone:   () => $("#coPhone"),
  website: () => $("#coWebsite"),
  address: () => $("#coAddress"),
  taxId:   () => $("#coTaxId"),
  msg:     () => $("#coSaveMsg"),
  updated: () => $("#coUpdatedAt"),
  saveBtn: () => $("#coSaveBtn"),
};

async function loadCompany() {
  const { data, error } = await sb
    .from("settings_company")
    .select("company_name, email, phone, website, address, tax_id, invoice_template_url, invoice_template_updated_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[settings] loadCompany error", error);
    flash(co.msg(), "Could not load settings.", false);
    return null;
  }
  const row = data || {};
  co.name().value    = row.company_name || "";
  co.email().value   = row.email        || "";
  co.phone().value   = row.phone        || "";
  co.website().value = row.website      || "";
  co.address().value = row.address      || "";
  co.taxId().value   = row.tax_id       || "";
  if (co.updated()) {
    co.updated().textContent = row.updated_at ? `Updated ${fmtDateTime(row.updated_at)}` : "";
  }
  return row;
}

async function saveCompany() {
  const btn = co.saveBtn();
  btn.disabled = true;
  const payload = {
    id: 1,
    company_name: co.name().value.trim()    || null,
    email:        co.email().value.trim()   || null,
    phone:        co.phone().value.trim()   || null,
    website:      co.website().value.trim() || null,
    address:      co.address().value.trim() || null,
    tax_id:       co.taxId().value.trim()   || null,
    updated_at:   new Date().toISOString(),
  };

  const { error } = await sb.from("settings_company").upsert(payload, { onConflict: "id" });
  btn.disabled = false;
  if (error) {
    console.error("[settings] saveCompany error", error);
    flash(co.msg(), "Save failed.", false);
    return;
  }
  flash(co.msg(), "Saved.");
  if (co.updated()) co.updated().textContent = `Updated ${fmtDateTime(payload.updated_at)}`;
}

// ===== Invoice Template (Supabase Storage: Invoices/Templates/) =====
const tpl = {
  fileName:    () => $("#tplFileName"),
  status:      () => $("#tplStatus"),
  download:    () => $("#tplDownloadBtn"),
  pickBtn:     () => $("#tplPickBtn"),
  uploadBtn:   () => $("#tplUploadBtn"),
  fileInput:   () => $("#tplFileInput"),
  msg:         () => $("#tplMsg"),
  picked:      () => $("#tplPicked"),
  updatedAt:   () => $("#tplUpdatedAt"),
};

let pickedFile = null;

async function refreshTemplateStatus() {
  // Try storage list to get last-modified
  try {
    const { data, error } = await sb.storage.from(TEMPLATE_BUCKET).list("Templates", {
      search: "ZAtech Invoice.docx",
      limit: 5,
    });
    if (error) throw error;
    const file = (data || []).find((f) => f.name === "ZAtech Invoice.docx");
    if (file) {
      const updated = file.updated_at || file.created_at;
      tpl.status().textContent = updated ? `Last updated ${fmtDateTime(updated)}` : "Available";
      if (tpl.updatedAt()) tpl.updatedAt().textContent = updated ? fmtDateTime(updated) : "";
    } else {
      tpl.status().textContent = "No template uploaded yet.";
    }
  } catch (e) {
    console.warn("[settings] tpl list error", e);
    tpl.status().textContent = "Available";
  }
  // Always wire download to public URL with a cache-busting query
  tpl.download().href = `${TEMPLATE_PUBLIC_URL}?t=${Date.now()}`;
}

function onPick(e) {
  const file = e.target.files?.[0];
  pickedFile = file || null;
  if (!file) {
    tpl.picked().textContent = "";
    tpl.uploadBtn().disabled = true;
    return;
  }
  const isDocx = file.name.toLowerCase().endsWith(".docx");
  if (!isDocx) {
    pickedFile = null;
    tpl.picked().textContent = "";
    tpl.uploadBtn().disabled = true;
    flash(tpl.msg(), "Please select a .docx file.", false);
    tpl.fileInput().value = "";
    return;
  }
  const sizeKB = Math.round(file.size / 1024);
  tpl.picked().textContent = `Selected: ${file.name} (${sizeKB} KB)`;
  tpl.uploadBtn().disabled = false;
}

async function uploadTemplate() {
  if (!pickedFile) return;
  const ok = confirm(
    `Replace the active invoice template with "${pickedFile.name}"?\n\n` +
    `Make sure your .docx uses [[ ]] delimiters (e.g. [[client_name]], [[#lines]]).\n` +
    `Files using {{ }} will not render correctly.`
  );
  if (!ok) return;

  tpl.uploadBtn().disabled = true;
  tpl.pickBtn().disabled = true;
  flash(tpl.msg(), "Uploading…");

  const { error: upErr } = await sb.storage
    .from(TEMPLATE_BUCKET)
    .upload(TEMPLATE_PATH, pickedFile, {
      upsert: true,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      cacheControl: "0",
    });

  if (upErr) {
    console.error("[settings] template upload error", upErr);
    flash(tpl.msg(), `Upload failed: ${upErr.message || upErr}`, false);
    tpl.uploadBtn().disabled = false;
    tpl.pickBtn().disabled = false;
    return;
  }

  // Record on settings_company so we have an audit trail
  const nowIso = new Date().toISOString();
  await sb.from("settings_company").upsert(
    { id: 1, invoice_template_url: TEMPLATE_PUBLIC_URL, invoice_template_updated_at: nowIso },
    { onConflict: "id" }
  );

  flash(tpl.msg(), "Template replaced.");
  pickedFile = null;
  tpl.fileInput().value = "";
  tpl.picked().textContent = "";
  tpl.pickBtn().disabled = false;
  tpl.uploadBtn().disabled = true;
  await refreshTemplateStatus();
}

// ===== User Profile (Firebase Auth) =====
const prof = {
  displayName: () => $("#profDisplayName"),
  email:       () => $("#profEmail"),
  emailHead:   () => $("#profileEmail"),
  saveBtn:     () => $("#profSaveBtn"),
  msg:         () => $("#profMsg"),
  pwCurrent:   () => $("#pwCurrent"),
  pwNew:       () => $("#pwNew"),
  pwConfirm:   () => $("#pwConfirm"),
  pwBtn:       () => $("#pwChangeBtn"),
  pwMsg:       () => $("#pwMsg"),
};

let currentUser = null;

function hydrateProfile(user) {
  currentUser = user;
  if (!user) {
    prof.displayName().value = "";
    prof.email().value = "";
    if (prof.emailHead()) prof.emailHead().textContent = "";
    return;
  }
  prof.displayName().value = user.displayName || "";
  prof.email().value = user.email || "";
  if (prof.emailHead()) prof.emailHead().textContent = user.email || "";
}

async function saveProfile() {
  if (!currentUser) return flash(prof.msg(), "Not signed in.", false);
  const newName = prof.displayName().value.trim();
  if (newName === (currentUser.displayName || "")) {
    flash(prof.msg(), "No changes.");
    return;
  }
  const btn = prof.saveBtn();
  btn.disabled = true;
  try {
    await updateProfile(currentUser, { displayName: newName });
    flash(prof.msg(), "Saved.");
  } catch (e) {
    console.error(e);
    flash(prof.msg(), e.message || "Could not save.", false);
  } finally {
    btn.disabled = false;
  }
}

async function changePassword() {
  if (!currentUser) return flash(prof.pwMsg(), "Not signed in.", false);
  const cur = prof.pwCurrent().value;
  const nw  = prof.pwNew().value;
  const cf  = prof.pwConfirm().value;

  if (!cur || !nw || !cf) return flash(prof.pwMsg(), "Fill in all fields.", false);
  if (nw.length < 8)      return flash(prof.pwMsg(), "Password must be at least 8 characters.", false);
  if (nw !== cf)          return flash(prof.pwMsg(), "Passwords don't match.", false);

  const btn = prof.pwBtn();
  btn.disabled = true;
  try {
    const cred = EmailAuthProvider.credential(currentUser.email, cur);
    await reauthenticateWithCredential(currentUser, cred);
    await updatePassword(currentUser, nw);
    prof.pwCurrent().value = "";
    prof.pwNew().value = "";
    prof.pwConfirm().value = "";
    flash(prof.pwMsg(), "Password updated.");
  } catch (e) {
    console.error(e);
    let msg = e.message || "Could not update password.";
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
      msg = "Current password is incorrect.";
    else if (e.code === "auth/weak-password")
      msg = "New password is too weak.";
    flash(prof.pwMsg(), msg, false);
  } finally {
    btn.disabled = false;
  }
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  loadCompany();
  refreshTemplateStatus();

  co.saveBtn()?.addEventListener("click", saveCompany);

  tpl.pickBtn()?.addEventListener("click", () => tpl.fileInput()?.click());
  tpl.fileInput()?.addEventListener("change", onPick);
  tpl.uploadBtn()?.addEventListener("click", uploadTemplate);

  prof.saveBtn()?.addEventListener("click", saveProfile);
  prof.pwBtn()?.addEventListener("click", changePassword);

  document.querySelector(".main")?.classList.add("content-ready");
});

onAuthStateChanged(auth, (user) => hydrateProfile(user));
