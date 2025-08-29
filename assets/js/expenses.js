(() => {
  const LS_KEY = 'zatech_expenses_v1';
  const STATUS_OPTIONS = ["Unpaid","Paid","Upcoming","Null"];

  // ===== Helpers =====
  const $ = s => document.querySelector(s);
  const fmt$ = n => "$" + Number(n||0).toLocaleString();
  const parseISO = s => new Date(s + "T00:00:00");
  const titleCase = s => String(s||"").replace(/\b\w/g, c => c.toUpperCase());

  const freqOrder = v => {
    const t = String(v||"").toLowerCase();
    if (t.startsWith("month")) return 3;
    if (t.startsWith("year"))  return 2;
    if (t.includes("one"))     return 1;
    return 0;
  };
  const statusOrder = v => {
    const t = String(v||"").toLowerCase();
    if (t === "paid")     return 3;
    if (t === "upcoming") return 2;
    if (t === "unpaid")   return 1;
    return 0; // Null/unknown
  };
  const statusClass = (val) => {
    const t = String(val||"").toLowerCase();
    if (t === "paid")     return "ok";
    if (t === "unpaid")   return "bad";
    if (t === "upcoming") return "warn";
    return "null";
  };
  const applyStatusClass = (el) => {
    el.classList.remove("badge-ok","badge-bad","badge-warn","badge-null");
    el.classList.add("badge-" + statusClass(el.value));
  };

  function inDateRange(rec, filter) {
    const now = new Date();
    const y = now.getFullYear();
    const d = parseISO(rec.date);
    switch (filter) {
      case "this_year": return d.getFullYear() === y;
      case "next_90":   { const end = new Date(now); end.setDate(end.getDate()+90); return d >= now && d <= end; }
      case "last_90":   { const start = new Date(now); start.setDate(start.getDate()-90); return d >= start && d <= now; }
      case "y2024":     return d.getFullYear() === 2024;
      case "y2023":     return d.getFullYear() === 2023;
      case "y2022":     return d.getFullYear() === 2022;
      default:          return true;
    }
  }

  // ===== LocalStorage =====
  function loadExpenses() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  function saveExpenses(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr || []));
  }

  // ===== Seed (if none) =====
  let items = loadExpenses();
  if (!Array.isArray(items) || items.length === 0) {
    items = [
      { id: "e-001", vendor: "Wix",        date: "2025-08-01", serviceType: "email",      description: "6 Emails for ArLAR",        client: "ArLAR",        amount: 29,  frequency: "Monthly",  status: "Paid"     },
      { id: "e-002", vendor: "Google",     date: "2025-09-10", serviceType: "email",      description: "2 Emails for JSR",          client: "JSR",          amount: 110, frequency: "Monthly",  status: "Upcoming" },
      { id: "e-003", vendor: "GoDaddy",    date: "2025-07-18", serviceType: "domain",     description: "1 Domain for Masri Clinic", client: "Masri Clinic", amount: 14,  frequency: "Yearly",   status: "Paid"     },
      { id: "e-004", vendor: "AWS",        date: "2025-06-20", serviceType: "cloud",      description: "EC2 for Nasma",             client: "Nasma",        amount: 450, frequency: "Monthly",  status: "Paid"     },
      { id: "e-005", vendor: "Namecheap",  date: "2024-12-22", serviceType: "domain",     description: "3 Domains for Riada",       client: "Riada",        amount: 36,  frequency: "Yearly",   status: "Paid"     },
      { id: "e-006", vendor: "Figma",      date: "2024-11-03", serviceType: "design",     description: "Team plan",                 client: "Internal",     amount: 180, frequency: "Monthly",  status: "Paid"     },
      { id: "e-007", vendor: "Zapier",     date: "2023-09-09", serviceType: "automation", description: "Zaps for Acme",              client: "Acme",         amount: 95,  frequency: "Monthly",  status: "Unpaid"   },
      { id: "e-008", vendor: "Cloudflare", date: "2022-08-16", serviceType: "cdn",        description: "CDN for Orbit",             client: "Orbit",        amount: 120, frequency: "Monthly",  status: "Paid"     },
    ];
    saveExpenses(items);
  }

  // ===== State =====
  const state = {
    sortKey: "date",
    sortDir: "desc",
    dateFilter: "this_year",
    vendorFilter: "all",
    serviceFilter: "all"
  };

  // ===== Render table =====
  function statusSelect(value, id) {
    const cls = statusClass(value);
    return `
      <select class="status-select badge-${cls}" data-id="${id}">
        ${STATUS_OPTIONS.map(o=>`<option value="${o}" ${o===value?"selected":""}>${o}</option>`).join("")}
      </select>
    `;
  }

  function updateSortIndicators() {
    document.querySelectorAll("#expensesTable thead th[data-sort]").forEach(th => {
      const key  = th.getAttribute("data-sort");
      const base = th.getAttribute("data-label") || th.textContent.replace(/[▲▼]/g,"").trim();
      th.setAttribute("data-label", base);
      th.textContent = (key === state.sortKey)
        ? base + (state.sortDir === "asc" ? " ▲" : " ▼")
        : base;
    });
  }

  function render() {
    const tbody = $("#expensesBody");

    let rows = items
      .filter(x => inDateRange(x, state.dateFilter))
      .filter(x => state.vendorFilter  === "all" ? true : x.vendor      === state.vendorFilter)
      .filter(x => state.serviceFilter === "all" ? true : x.serviceType === state.serviceFilter);

    rows.sort((a,b) => {
      const k = state.sortKey;
      if (k === "date")        return parseISO(a.date) - parseISO(b.date);
      if (k === "amount")      return (a.amount||0) - (b.amount||0);
      if (k === "serviceType") return (a.serviceType||"").localeCompare(b.serviceType||"");
      if (k === "expense")     return (a.vendor + a.description).localeCompare(b.vendor + b.description);
      if (k === "frequency")   return freqOrder(a.frequency) - freqOrder(b.frequency);
      if (k === "status")      return statusOrder(a.status) - statusOrder(b.status);
      return 0;
    });
    if (state.sortDir === "desc") rows.reverse();

    updateSortIndicators();

    tbody.innerHTML = rows.map(r => {
      const expenseLabel = `${r.vendor} — ${r.description||""}`.trim();
      return `
        <tr data-id="${r.id}">
          <td>${expenseLabel}</td>
          <td>${r.date}</td>
          <td>${titleCase(r.serviceType)}</td>
          <td>${fmt$(r.amount)}</td>
          <td>${r.frequency||"—"}</td>
          <td>${statusSelect(r.status, r.id)}</td>
          <td class="row-actions"><button class="mini view-expense" data-id="${r.id}">View</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="7">No expenses for this filter.</td></tr>`;

    // recolor status pills
    tbody.querySelectorAll(".status-select").forEach(applyStatusClass);
  }

  // ===== Modal logic (pattern mirrors clients.js) =====
  const modal = $("#expense-modal");
  const actionsBar = $("#expense-edit-actions");
  const closeX = $("#expenseCloseBtn");

  // view spans
  const disp = {
    titleText: $("#expense-title-text"),
    vendor: $("#exp-vendor"),
    desc:   $("#exp-desc"),
    client: $("#exp-client"),
    service:$("#exp-service"),
    date:   $("#exp-date"),
    amount: $("#exp-amount"),
    freq:   $("#exp-frequency"),
    status: $("#exp-status"),
  };

  // edit/create inputs
  const titleInput = $("#expense-title-input");
  const inputs = {
    vendor: $("#exp-vendor-input"),
    desc:   $("#exp-desc-input"),
    client: $("#exp-client-input"),
    service:$("#exp-service-input"),
    date:   $("#exp-date-input"),
    amount: $("#exp-amount-input"),
    freq:   $("#exp-frequency-input"),
    status: $("#exp-status-input"),
  };

  const editBtn   = $("#editExpenseBtn");
  const saveBtn   = $("#saveExpenseBtn");
  const cancelBtn = $("#cancelExpenseBtn");
  const err       = $("#expenseEditError");
  const newBtn    = $("#newExpenseBtn");

  let mode = 'view';     // 'view' | 'edit' | 'create'
  let currentId = null;  // current expense id

  function openModalView(exp) {
    mode = 'view';
    modal.classList.remove('editing');
    err.textContent = '';

    disp.titleText.textContent = `${exp.vendor || ''} — ${exp.description || ''}`.trim() || 'Expense';
    if (titleInput) titleInput.value = disp.titleText.textContent;

    disp.vendor.textContent  = exp.vendor || '—';
    disp.desc.textContent    = exp.description || '—';
    disp.client.textContent  = exp.client || '—';
    disp.service.textContent = titleCase(exp.serviceType || '');
    disp.date.textContent    = exp.date || '—';
    disp.amount.textContent  = fmt$(exp.amount || 0);
    disp.freq.textContent    = exp.frequency || '—';
    disp.status.textContent  = exp.status || '—';

    editBtn.style.display = 'inline-flex';
    actionsBar.style.display = 'none';
    modal.classList.add('show');
  }

  function openModalEdit(exp) {
    mode = 'edit';
    modal.classList.add('editing');
    err.textContent = '';

    if (titleInput) titleInput.value = `${exp.vendor || ''} — ${exp.description || ''}`.trim();

    inputs.vendor.value  = exp.vendor || '';
    inputs.desc.value    = exp.description || '';
    inputs.client.value  = exp.client || '';
    inputs.service.value = exp.serviceType || 'other';
    inputs.date.value    = exp.date || '';
    inputs.amount.value  = exp.amount ?? '';
    inputs.freq.value    = exp.frequency || 'Monthly';
    inputs.status.value  = exp.status || 'Unpaid';

    editBtn.style.display = 'none';
    actionsBar.style.display = 'flex';
    modal.classList.add('show');
  }

  function openModalCreate() {
    mode = 'create';
    currentId = null;
    disp.titleText.textContent = 'New Expense';

    if (titleInput) titleInput.value = '';
    Object.values(inputs).forEach(el => el.value = '');

    inputs.service.value = 'other';
    inputs.freq.value    = 'Monthly';
    inputs.status.value  = 'Unpaid';

    modal.classList.add('editing');
    err.textContent = '';
    editBtn.style.display = 'none';
    actionsBar.style.display = 'flex';
    modal.classList.add('show');
  }

  function closeModal() {
    modal.classList.remove('show', 'editing');
    err.textContent = '';
  }

  // ===== Wiring =====
  document.addEventListener("DOMContentLoaded", () => {
    // Populate vendor filter
    const vendorSel  = $("#expVendorFilter");
    vendorSel.innerHTML = `<option value="all">All vendors</option>` +
      Array.from(new Set(items.map(x => x.vendor))).sort().map(v => `<option value="${v}">${v}</option>`).join("");

    // Populate service filter
    const serviceSel = $("#expServiceFilter");
    serviceSel.innerHTML = `<option value="all">All services</option>` +
      Array.from(new Set(items.map(x => x.serviceType))).sort().map(sv => `<option value="${sv}">${titleCase(sv)}</option>`).join("");

    // Filters
    $("#expDateFilter").addEventListener("change", e => { state.dateFilter = e.target.value; render(); });
    vendorSel.addEventListener("change", e => { state.vendorFilter = e.target.value; render(); });
    serviceSel.addEventListener("change", e => { state.serviceFilter = e.target.value; render(); });

    // Sorting
    document.querySelectorAll("#expensesTable thead th[data-sort]").forEach(th => {
      const key = th.getAttribute("data-sort");
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        if (state.sortKey === key) {
          state.sortDir = (state.sortDir === "asc" ? "desc" : "asc");
        } else {
          state.sortKey = key;
          state.sortDir = (key === "date" || key === "amount") ? "desc" : "asc";
        }
        render();
      });
    });

    // Inline status change (pill recolors + persist)
    $("#expensesBody").addEventListener("change", (e) => {
      const el = e.target.closest(".status-select");
      if (!el) return;
      const id = el.getAttribute("data-id");
      const rec = items.find(x => x.id === id);
      if (rec) rec.status = el.value;
      applyStatusClass(el);
      saveExpenses(items);
      if (state.sortKey === "status") render();
      el.blur(); // recolor instantly (no second click needed)
    });

    // Row "View →"
    $("#expensesBody").addEventListener("click", (e) => {
      const btn = e.target.closest("button.view-expense");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const exp = items.find(x => x.id === id);
      if (!exp) return;
      currentId = id;
      openModalView(exp);
    });

    // Header "+ New Expense"
    newBtn.addEventListener("click", openModalCreate);

    // Inside modal: Edit button in view mode
    editBtn.addEventListener("click", () => {
      if (!currentId) return;
      const exp = items.find(x => x.id === currentId);
      if (!exp) return;
      openModalEdit(exp);
    });

    // Save (create or edit)
    saveBtn.addEventListener("click", () => {
      err.textContent = '';
      // Basic validation
      const vendor = inputs.vendor.value.trim();
      const date   = inputs.date.value;
      const amount = parseFloat(inputs.amount.value);
      if (!vendor) { err.textContent = 'Vendor is required.'; return; }
      if (!date)   { err.textContent = 'Date is required.'; return; }
      if (Number.isNaN(amount)) { err.textContent = 'Amount must be a number.'; return; }

      const payload = {
        vendor,
        description: inputs.desc.value.trim(),
        client: inputs.client.value.trim(),
        serviceType: inputs.service.value,
        date,
        amount,
        frequency: inputs.freq.value,
        status: inputs.status.value
      };

      if (mode === 'create') {
        payload.id = 'e-' + Math.random().toString(36).slice(2, 8);
        items.push(payload);
      } else if (mode === 'edit' && currentId) {
        const idx = items.findIndex(x => x.id === currentId);
        if (idx !== -1) items[idx] = { id: currentId, ...payload };
      }

      saveExpenses(items);
      closeModal();
      // Repopulate vendor/service filters so new values appear there
      const vendors = Array.from(new Set(items.map(x => x.vendor))).sort();
      vendorSel.innerHTML = `<option value="all">All vendors</option>` + vendors.map(v => `<option value="${v}">${v}</option>`).join("");
      const services = Array.from(new Set(items.map(x => x.serviceType))).sort();
      serviceSel.innerHTML = `<option value="all">All services</option>` + services.map(sv => `<option value="${sv}">${titleCase(sv)}</option>`).join("");
      render();
    });

    cancelBtn.addEventListener("click", closeModal);
    closeX.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // Initial render
    render();
  });
})();
