// /assets/js/opps.js
(() => {
  // ===== Supabase client (assumes global `sb` like other pages) =====
  if (!window.sb) {
    console.error("[opps] Supabase client `sb` not found. Make sure it's initialized globally.");
  }

  // ===== Helpers =====
  const STATUS_OPTIONS = ["Proposed", "In Review", "Won", "Lost"];
  const fmt$ = (n) => "$" + Number(n || 0).toLocaleString();

  const statusClass = (val) => {
    const t = String(val || "").toLowerCase();
    if (t === "won") return "ok";
    if (t === "lost") return "due";
    if (t === "in review") return "warn";
    return "null"; // Proposed / other
  };
  const applyStatusClass = (el) => {
    el.classList.remove("badge-ok", "badge-bad", "badge-warn", "badge-null");
    el.classList.add("badge-" + statusClass(el.value));
  };

  function openSelectDropdown(sel){
  if (typeof sel.showPicker === 'function') { sel.showPicker(); return; }
  sel.focus();
  sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  sel.click();
}


  const statusSelect = (value, id) => {
    return `
      <div class="select-wrap inline" data-id="${id}">
        <select class="filter-select status-select" data-id="${id}">
          ${STATUS_OPTIONS.map(
            (o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`
          ).join("")}
        </select>
      </div>
    `;
  };


  // ===== DOM =====
  const tbody       = document.querySelector("#oppsBody");
  const loader      = document.querySelector("#contentLoader");

  // Modal (view + edit/create)
  const modal       = document.querySelector("#opp-modal");
  const titleSpan   = document.querySelector("#oppTitle");
  const viewWrap    = document.querySelector("#oppViewFields");
  const editWrap    = document.querySelector("#oppEditFields");
  const viewActions = document.querySelector("#oppViewActions");
  const editActions = document.querySelector("#oppEditActions");
  const editBtn     = document.querySelector("#editOppBtn");
  const saveBtn     = document.querySelector("#saveOppBtn");
  const cancelBtn   = document.querySelector("#cancelOppBtn");
  const closeBtns   = [ "#oppCloseBtn", "#closeOppBtn", "#oppCloseBtn" ]
    .map(sel => document.querySelector(sel)).filter(Boolean);
  const err         = document.querySelector("#oppModalError");

  // View fields
  const v = {
    id:       document.querySelector("#opp-id"),
    name:     document.querySelector("#opp-name"),      // opportunity title
    client:   document.querySelector("#opp-client"),    // maps to Supabase 'name' (client name)
    status:   document.querySelector("#opp-status"),
    value:    document.querySelector("#opp-value"),
    last:     document.querySelector("#opp-last"),
    notes:    document.querySelector("#opp-notes"),
  };

  // Edit/Create inputs
  const e = {
    name:     document.querySelector("#e-name"),   // opportunity title
    client:   document.querySelector("#e-client"), // client name (Supabase column 'name')
    status:   document.querySelector("#e-status"),
    value:    document.querySelector("#e-value"),
    last:     document.querySelector("#e-last"),
  };

  // Delete confirm modal
  const delModal    = document.querySelector("#opp-delete-modal");
  const delMsg      = document.querySelector("#opp-delete-msg");
  const delCancel   = document.querySelector("#opp-delete-cancel");
  const delConfirm  = document.querySelector("#opp-delete-confirm");

  // ===== State =====
  let rows = [];
  let mode = "view";      // view | edit | create
  let currentId = null;   // numeric Supabase id
  let pendingDeleteId = null;


  
  // ===== Data =====
  async function loadOpps() {
    showLoader(true);
    const { data, error } = await sb
      .from("opportunities")
      .select("id, opp_no, name, opportunity, status, value, last_contact, notes")
      .order("id", { ascending: false });
    showLoader(false);
    if (error) {
      console.error("[opps] load error:", error);
      tbody.innerHTML = `<tr><td colspan="7" style="color:#ff8b8b;">Failed to load opportunities.</td></tr>`;
      return;
    }
    rows = data || [];
    render();
  }

  async function updateStatus(id, newStatus, selectEl) {
    const { error } = await sb
      .from("opportunities")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      console.error("[opps] status update failed:", error);
      // roll back UI if needed
      const r = rows.find(x => x.id === id);
      if (r) {
        selectEl.value = r.status || "Proposed";
        applyStatusClass(selectEl);
      }
      return;
    }
    // sync local
    const r = rows.find(x => x.id === id);
    if (r) r.status = newStatus;
    applyStatusClass(selectEl);
  }

  async function saveCurrent() {
    err.textContent = "";
    const problem = validate();
    if (problem) { err.textContent = problem; return; }

    const payload = {
      opportunity: e.name.value.trim(),
      name:        e.client.value.trim(),       // Supabase column 'name' = client name
      status:      e.status.value,
      value:       e.value.value ? parseFloat(e.value.value) : 0,
      last_contact:e.last.value,
      notes:       v.notes.value.trim(),
    };

    showLoader(true);
    if (mode === "create") {
      const { data, error } = await sb.from("opportunities").insert(payload).select().single();
      showLoader(false);
      if (error) { console.error("[opps] insert error:", error); err.textContent = "Failed to create opportunity."; return; }
      rows.unshift(data);
      closeModal();
      render();
    } else if (mode === "edit" && currentId != null) {
      const { data, error } = await sb
        .from("opportunities")
        .update(payload)
        .eq("id", currentId)
        .select()
        .single();
      showLoader(false);
      if (error) { console.error("[opps] update error:", error); err.textContent = "Failed to save changes."; return; }
      const idx = rows.findIndex(x => x.id === currentId);
      if (idx !== -1) rows[idx] = data;
      closeModal();
      render();
    }
  }

  async function deleteOpp(id) {
    showLoader(true);
    const { error } = await sb.from("opportunities").delete().eq("id", id);
    showLoader(false);
    if (error) {
      console.error("[opps] delete error:", error);
      // Optional: toast
      return;
    }
    rows = rows.filter(r => r.id !== id);
    render();
  }

  // ===== Render =====
  function render() {
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No opportunities yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.opp_no || ('ZAOPP-' + String(r.id).padStart(3,'0'))}</td>
        <td>${escapeHTML(r.name || "")}</td>
        <td>${escapeHTML(r.opportunity || "")}</td>
        <td><span class="tag ${statusClass(r.status)} status-pill" data-id="${r.id}">${escapeHTML(r.status || "—")}</span></td>
        <td>${fmt$(r.value)}</td>
        <td>${r.last_contact || "—"}</td>
        <td class="row-actions">
          <button class="btn2 mini view-opp" data-id="${r.id}">View</button>
          <button 
            class="mini delete-opp" 
            data-id="${r.id}" 
            style="background:#9C0000;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;"
          >
            🗑️
          </button>

        </td>
      </tr>
    `).join("");

    // recolor selects
    tbody.querySelectorAll(".status-select").forEach(applyStatusClass);
  }

  // ===== Modal control =====
  function openModalView(rec) {
    mode = "view";
    currentId = rec.id;
    titleSpan.textContent = rec.name || "Client";

    v.id.textContent     = rec.opp_no || ('ZAOPP-' + String(rec.id).padStart(3,'0'));
    v.name.textContent   = rec.opportunity || "—";
    v.client.textContent = rec.name || "—";
    v.status.textContent = rec.status || "—";
    v.value.textContent  = fmt$(rec.value || 0);
    v.last.textContent   = rec.last_contact || "—";
    v.notes.value        = rec.notes || "";
    v.notes.readOnly     = true;
    v.notes.style.display = "block";

    viewWrap.style.display = "";
    viewActions.style.display = "flex";
    editWrap.style.display = "none";
    editActions.style.display = "none";
    editBtn.style.display = "inline-flex";

    modal.classList.remove("editing");
    modal.classList.add("show");
  }

  function openModalEdit(rec) {
    mode = "edit";
    currentId = rec.id;
    titleSpan.textContent = (rec.opp_no ? rec.opp_no + " — " : "") + (rec.name || "Edit Opportunity");

    e.name.value   = rec.opportunity || "";
    e.client.value = rec.name || "";
    e.status.value = rec.status || "Proposed";
    e.value.value  = rec.value ?? "";
    e.last.value   = rec.last_contact || "";
    v.notes.value  = rec.notes || "";
    v.notes.readOnly = false;     // editable in edit mode
    v.notes.style.display = "block";

    viewWrap.style.display = "none";
    viewActions.style.display = "none";
    editWrap.style.display = "grid";
    editActions.style.display = "flex";
    editBtn.style.display = "none";

    modal.classList.add("editing");
    modal.classList.add("show");
  }

  function openModalCreate() {
    mode = "create";
    currentId = null;
    titleSpan.textContent = "New Opportunity";

    e.name.value   = "";
    e.client.value = "";
    e.status.value = "Proposed";
    e.value.value  = "";
    e.last.value   = "";
    v.notes.value  = "";

    viewWrap.style.display = "none";
    viewActions.style.display = "none";
    editWrap.style.display = "grid";
    editActions.style.display = "flex";
    editBtn.style.display = "none";

    modal.classList.add("editing");
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show", "editing");
    err.textContent = "";
  }

  function openDeleteModal(rec) {
    pendingDeleteId = rec.id;
    delMsg.textContent = `Are you sure you want to delete opportunity ${rec.opp_no} for ${rec.name} (${rec.opportunity || "Untitled"})?`;
    delModal.classList.add("show");
  }
  function closeDeleteModal() {
    delModal.classList.remove("show");
    pendingDeleteId = null;
  }

  // ===== Validation =====
  function validate() {
    if (!e.name.value.trim())    return "Opportunity name is required.";
    if (!e.client.value.trim())  return "Client is required.";
    if (!e.last.value)           return "Last contact date is required.";
    if (e.value.value && Number.isNaN(parseFloat(e.value.value))) return "Est. value must be a number.";
    return "";
  }

  // ===== Utilities =====
  function showLoader(on) {
    if (!loader) return;
    loader.style.display = on ? "block" : "none";
  }
  function escapeHTML(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // ===== Events =====
  document.addEventListener("DOMContentLoaded", () => {
    loadOpps();

    // Inline status change
    // Click pill -> turn into select (like invoices)
    // Inline status editor (match invoices UX)
    tbody.addEventListener("click", (evt) => {
      const pill = evt.target.closest(".status-pill");
      if (!pill) return;

      const id  = pill.getAttribute("data-id");
      const rec = rows.find(r => String(r.id) === String(id));
      if (!rec) return;

      const initial = rec.status || "Proposed";

      // Build invoices-style dropdown
      const tmp = document.createElement("div");
      tmp.innerHTML = statusSelect(initial, id).trim();
      const wrap = tmp.firstElementChild;                   // <div.select-wrap.inline>
      const sel  = wrap.querySelector(".status-select");    // <select.filter-select.status-select>

      // Swap pill → select
      pill.replaceWith(wrap);

      const restore = (value) => {
        const span = document.createElement("span");
        span.className   = `tag ${statusClass(value)} status-pill`;
        span.dataset.id  = id;
        span.textContent = value;
        wrap.replaceWith(span);
        cleanup();
      };

      const onChange = async () => {
        const next = sel.value;
        if (next === initial) {            // SAME value → just restore pill
          restore(initial);
          return;
        }
        await updateStatus(id, next, sel); // persists to DB
        restore(next);                     // show updated pill
      };

      const onKey = (ev) => {
        if (ev.key === "Escape") restore(initial);
      };

      const onDocDown = (ev) => {
        if (!wrap.contains(ev.target)) restore(initial);
      };

      const cleanup = () => {
        sel.removeEventListener("change", onChange);
        sel.removeEventListener("keydown", onKey);
        document.removeEventListener("pointerdown", onDocDown, true);
      };

      sel.addEventListener("change", onChange);
      sel.addEventListener("keydown", onKey);
      document.addEventListener("pointerdown", onDocDown, true);

      // open native dropdown immediately (same as invoices)
      openSelectDropdown(sel);
    });


    // When select changes, persist then restore pill
    tbody.addEventListener("change", async (evt) => {
      const el = evt.target.closest(".status-select");
      if (!el) return;

      const id  = el.getAttribute("data-id");
      const val = el.value;
      const rec = rows.find(r => String(r.id) === String(id));
      if (!rec) return;

      // Persist using your existing function
      await updateStatus(id, val, el);

      // Restore pill UI (match invoices design)
      const span = document.createElement("span");
      span.className = `tag ${statusClass(val)} status-pill`;
      span.dataset.id = id;
      span.textContent = val;

      el.replaceWith(span);
    });



    // View only
    tbody.addEventListener("click", (evt) => {
      const btn = evt.target.closest("button.view-opp");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const rec = rows.find(r => String(r.id) === String(id));
      if (!rec) return;
      openModalView(rec);
    });

    // Delete only
    tbody.addEventListener("click", (evt) => {
      const btn = evt.target.closest("button.delete-opp");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const rec = rows.find(r => String(r.id) === String(id));
      if (!rec) return;
      openDeleteModal(rec);
    });

    // Header: new
    document.querySelector("#newOppBtn").addEventListener("click", openModalCreate);

    // Edit from view
    editBtn.addEventListener("click", () => {
      if (currentId == null) return;
      const rec = rows.find(r => String(r.id) === String(currentId));
      if (!rec) return;
      openModalEdit(rec);
    });

    // Save (create/edit)
    saveBtn.addEventListener("click", saveCurrent);

    // Cancel / close
    cancelBtn.addEventListener("click", closeModal);
    closeBtns.forEach(btn => btn && btn.addEventListener("click", closeModal));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // Delete confirm modal actions
    delCancel.addEventListener("click", closeDeleteModal);
    delConfirm.addEventListener("click", async () => {
      if (pendingDeleteId == null) return;
      await deleteOpp(pendingDeleteId);
      closeDeleteModal();
    });
    delModal.addEventListener("click", (e) => { if (e.target === delModal) closeDeleteModal(); });
  });
})();
