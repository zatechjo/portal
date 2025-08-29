(() => {
  const LS_KEY = 'zatech_opps_v1';

  // status → color class (same pill behavior as expenses)
  const statusClass = (val) => {
    const t = String(val||"").toLowerCase();
    if (t === "won")        return "ok";
    if (t === "lost")       return "bad";
    if (t === "in review")  return "warn";
    return "null"; // Proposed / other
  };
  const applyStatusClass = (el) => {
    el.classList.remove("badge-ok","badge-bad","badge-warn","badge-null");
    el.classList.add("badge-" + statusClass(el.value));
  };

  const STATUS_OPTIONS = ["Proposed","In Review","Won","Lost"];
  const fmt$ = n => "$" + Number(n||0).toLocaleString();

  // storage
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
  const save = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr || []));

  // seed
  let rows = load();
  if (!rows.length) {
    rows = [
      { id:"OPP-1021", name:"Corporate Site Revamp", client:"Acme LLC",     status:"In Review", value:8000, last:"2025-08-15", notes:"" },
      { id:"OPP-1016", name:"SEO & Ads Bundle",      client:"Nasma Group",  status:"Proposed",  value:3500, last:"2025-08-14", notes:"" },
      { id:"OPP-1012", name:"Shop Setup",            client:"Riada Co",     status:"Won",       value:5400, last:"2025-08-10", notes:"Kickoff scheduled" },
      { id:"OPP-1010", name:"Brand Refresh",         client:"Orbit Labs",   status:"Lost",      value:4200, last:"2025-07-30", notes:"Client paused budget" }
    ];
    save(rows);
  }

  // table render
  function statusSelect(value, id) {
    const cls = statusClass(value);
    return `
      <select class="status-select badge-${cls}" data-id="${id}">
        ${STATUS_OPTIONS.map(o=>`<option value="${o}" ${o===value?"selected":""}>${o}</option>`).join("")}
      </select>
    `;
  }

  function render() {
    const tbody = document.querySelector("#oppsBody");
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.id}</td>
        <td>${r.client}</td>
        <td>${r.name}</td>
        <td>${statusSelect(r.status, r.id)}</td>
        <td>${fmt$(r.value)}</td>
        <td>${r.last}</td>
        <td class="row-actions"><button class="btn2 mini view-opp" data-id="${r.id}">View</button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".status-select").forEach(applyStatusClass);
  }

  // ===== Modal refs =====
  const modal     = document.querySelector("#opp-modal");
  const closeX    = document.querySelector("#oppCloseBtn");
  const closeBtn  = document.querySelector("#closeOppBtn");

  const viewWrap    = document.querySelector("#oppViewFields");
  const editWrap    = document.querySelector("#oppEditFields");
  const viewActions = document.querySelector("#oppViewActions");
  const editActions = document.querySelector("#oppEditActions");

  const newBtn   = document.querySelector("#newOppBtn");
  const editBtn  = document.querySelector("#editOppBtn");
  const saveBtn  = document.querySelector("#saveOppBtn");
  const cancel   = document.querySelector("#cancelOppBtn");
  const err      = document.querySelector("#oppModalError");

  const titleSpan = document.querySelector("#oppTitle");

  // view fields
  const v = {
    id:    document.querySelector("#opp-id"),
    name:  document.querySelector("#opp-name"),
    client:document.querySelector("#opp-client"),
    status:document.querySelector("#opp-status"),
    value: document.querySelector("#opp-value"),
    last:  document.querySelector("#opp-last"),
    notes: document.querySelector("#opp-notes"),
  };

  // edit/create inputs
  const e = {
    name:  document.querySelector("#e-name"),
    client:document.querySelector("#e-client"),
    status:document.querySelector("#e-status"),
    value: document.querySelector("#e-value"),
    last:  document.querySelector("#e-last"),
  };

  let mode = "view"; // view | edit | create
  let currentId = null;

  function openModalView(rec) {
    mode = "view";
    titleSpan.textContent = rec.client || "Client";

    v.id.textContent = rec.id;
    v.name.textContent = rec.name || "—";
    v.client.textContent = rec.client || "—";
    v.status.textContent = rec.status || "—";
    v.value.textContent = fmt$(rec.value || 0);
    v.last.textContent = rec.last || "—";
    v.notes.value = rec.notes || "";

    viewWrap.style.display = "";
    viewActions.style.display = "flex";
    editWrap.style.display = "none";
    editActions.style.display = "none";
    editBtn.style.display = "inline-flex";

    modal.classList.remove("editing");     // <-- ensure read-only mode
    modal.classList.add("show");
  }

  function openModalEdit(rec) {
    mode = "edit";
    titleSpan.textContent = rec.client || "Edit Opportunity";

    e.name.value   = rec.name || "";
    e.client.value = rec.client || "";
    e.status.value = rec.status || "Proposed";
    e.value.value  = rec.value ?? "";
    e.last.value   = rec.last || "";
    v.notes.value  = rec.notes || "";

    viewWrap.style.display = "none";
    viewActions.style.display = "none";
    editWrap.style.display = "grid";
    editActions.style.display = "flex";
    editBtn.style.display = "none";

    modal.classList.add("editing");        // <-- inputs visible & typeable
    modal.classList.add("show");
  }

  function openModalCreate() {
    mode = "create";
    currentId = null;
    titleSpan.textContent = "New Opportunity (client)";

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

    modal.classList.add("editing");        // <-- inputs visible & typeable
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show", "editing"); // <-- clear edit mode on close
    err.textContent = "";
  }

  function validate() {
    if (!e.name.value.trim())  return "Opportunity name is required.";
    if (!e.client.value.trim())return "Client is required.";
    if (!e.last.value)         return "Last contact date is required.";
    if (e.value.value && Number.isNaN(parseFloat(e.value.value))) return "Est. value must be a number.";
    return "";
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();

    // inline status change + persist + instant recolor
    document.querySelector("#oppsBody").addEventListener("change", (evt) => {
      const el = evt.target.closest(".status-select");
      if (!el) return;
      const id = el.getAttribute("data-id");
      const rec = rows.find(x => x.id === id);
      if (rec) rec.status = el.value;
      applyStatusClass(el);
      save(rows);
      el.blur(); // recolor immediately
    });

    // open view
    document.querySelector("#oppsBody").addEventListener("click", (evt) => {
      const btn = evt.target.closest("button.view-opp");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const rec = rows.find(r => r.id === id);
      if (!rec) return;
      currentId = id;
      openModalView(rec);
    });

    // header: new
    document.querySelector("#newOppBtn").addEventListener("click", openModalCreate);

    // Edit in view mode
    document.querySelector("#editOppBtn").addEventListener("click", () => {
      if (!currentId) return;
      const rec = rows.find(r => r.id === currentId);
      if (!rec) return;
      openModalEdit(rec);
    });

    // Save (create or edit)
    document.querySelector("#saveOppBtn").addEventListener("click", () => {
      err.textContent = "";
      const problem = validate();
      if (problem) { err.textContent = problem; return; }

      const payload = {
        name:   e.name.value.trim(),
        client: e.client.value.trim(),
        status: e.status.value,
        value:  e.value.value ? parseFloat(e.value.value) : 0,
        last:   e.last.value,
        notes:  v.notes.value.trim(),
      };

      if (mode === "create") {
        payload.id = "OPP-" + Math.random().toString(36).slice(2, 6).toUpperCase();
        rows.push(payload);
      } else if (mode === "edit" && currentId) {
        const idx = rows.findIndex(x => x.id === currentId);
        if (idx !== -1) rows[idx] = { id: currentId, ...payload };
      }

      save(rows);
      closeModal();
      render();
    });

    // Cancel / Close
    document.querySelector("#cancelOppBtn").addEventListener("click", closeModal);
    document.querySelector("#closeOppBtn").addEventListener("click", closeModal);
    document.querySelector("#oppCloseBtn").addEventListener("click", closeModal);
    document.querySelector("#opp-modal").addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  });
})();
