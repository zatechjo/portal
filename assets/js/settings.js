(() => {
  const $ = (s) => document.querySelector(s);

  // Fields
  const f = {
    name:    $("#coName"),
    email:   $("#coEmail"),
    phone:   $("#coPhone"),
    website: $("#coWebsite"),
    address: $("#coAddress"),
    taxId:   $("#coTaxId"),
  };
  const saveBtn = $("#coSaveBtn");
  const saveMsg = $("#coSaveMsg");

  const readLS = (k, fb) => {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; }
    catch { return fb; }
  };
  const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const LS_KEY = "settings_v1";

  function loadCompany() {
    const all = readLS(LS_KEY, {});
    const co = all.company || {};
    f.name.value    = co.name    || "";
    f.email.value   = co.email   || "";
    f.phone.value   = co.phone   || "";
    f.website.value = co.website || "";
    f.address.value = co.address || "";
    f.taxId.value   = co.taxId   || "";
  }

  function saveCompany() {
    const all = readLS(LS_KEY, {});
    all.company = {
      name:    f.name.value.trim(),
      email:   f.email.value.trim(),
      phone:   f.phone.value.trim(),
      website: f.website.value.trim(),
      address: f.address.value.trim(),
      taxId:   f.taxId.value.trim(),
      updatedAt: new Date().toISOString(),
    };
    writeLS(LS_KEY, all);
    saveMsg.textContent = "Saved.";
    setTimeout(() => (saveMsg.textContent = ""), 1500);
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadCompany();
    saveBtn?.addEventListener("click", saveCompany);

    // Mark page as ready so loader glass can fade (if you’re toggling it elsewhere)
    document.querySelector(".main")?.classList.add("content-ready");
  });

  document.addEventListener('DOMContentLoaded', () => {
    const LS_KEY = "zatech_company_v1";

    const nameEl = document.getElementById("companyName");
    const emailEl = document.getElementById("companyEmail");
    const phoneEl = document.getElementById("companyPhone");
    const addressEl = document.getElementById("companyAddress");
    const saveBtn = document.getElementById("saveCompanyBtn");

    function load() {
        try {
        const data = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
        if (data.name) nameEl.value = data.name;
        if (data.email) emailEl.value = data.email;
        if (data.phone) phoneEl.value = data.phone;
        if (data.address) addressEl.value = data.address;
        } catch {}
    }

    function save() {
        const data = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        address: addressEl.value.trim(),
        };
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        alert("Company details saved locally.");
    }

    saveBtn?.addEventListener("click", save);
    load();
    });

})();
