(() => {
  // ===== Config / Globals =====
  /* global sb */ // expect a global Supabase client (window.sb) created elsewhere
  if (!window.sb) {
    console.error("[expenses:init] Supabase client (window.sb) NOT found. Did you include supabase.js before this file?");
  } else {
    console.log("[expenses:init] Supabase client detected ✅");
  }

  const STATUS_OPTIONS = ["Unpaid", "Paid", "Upcoming", "Null"];

  // ===== Helpers =====
  const $ = (s) => document.querySelector(s);
  const fmt$ = (n) => "$" + Number(n || 0).toLocaleString();
  const parseISO = (s) => s ? new Date(s + "T00:00:00") : new Date("1970-01-01");
  const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

  async function debugSupabaseSmokeTest() {
    console.group("[expenses:smoke]");

    // 0) who am I?
    const { data: u } = await sb.auth.getUser();
    console.log("auth.getUser:", u?.user ? { id: u.user.id, email: u.user.email } : "no user");

    // 1) exact row count without pulling data
    const { count, error: countErr } = await sb
      .from("expenses")
      .select("*", { count: "exact", head: true });

    if (countErr) {
      console.error("count error:", countErr);
    } else {
      console.log("expenses count:", count);
    }

    // 2) fetch first 3 rows, raw
    const { data, error } = await sb
      .from("expenses")
      .select("id,vendor,description,client_name,service,expense_date,amount,frequency,status")
      .order("expense_date", { ascending: false })
      .limit(3);

    if (error) {
      console.error("select error:", error);
    } else {
      console.log("first 3 rows:", data);
    }

    // 3) quick date sanity: are your dates in the current year filter?
    const y = new Date().getFullYear();
    const inThisYear = (data || []).filter(r => (r.expense_date || "").slice(0,4) === String(y)).length;
    console.log(`rows in ${y} (by expense_date):`, inThisYear);

    // 4) OPTIONAL: seed one test row if you want (flip to true temporarily)
    const INSERT_A_TEST_ROW = false;
    if (INSERT_A_TEST_ROW) {
      const payload = {
        vendor: "TestVendor",
        description: "Smoke test expense",
        client_name: "Internal",
        service: "testing",
        expense_date: new Date().toISOString().slice(0,10),
        amount: 1,
        frequency: "One-time",
        status: "Unpaid",
      };
      const ins = await sb.from("expenses").insert(payload).select().single();
      console.log("insert test row result:", ins);
    }

    console.groupEnd();
  }


  const freqOrder = (v) => {
    const t = String(v || "").toLowerCase();
    if (t.startsWith("month")) return 3;
    if (t.startsWith("year")) return 2;
    if (t.includes("one")) return 1;
    return 0;
  };
  const statusOrder = (v) => {
    const t = String(v || "").toLowerCase();
    if (t === "paid") return 3;
    if (t === "upcoming") return 2;
    if (t === "unpaid") return 1;
    return 0; // Null/unknown
  };
  const statusClass = (val) => {
    const t = String(val || "").toLowerCase();
    if (t === "paid") return "ok";
    if (t === "unpaid") return "bad";
    if (t === "upcoming") return "warn";
    return "null";
  };
  const applyStatusClass = (el) => {
    el.classList.remove("badge-ok", "badge-bad", "badge-warn", "badge-null");
    el.classList.add("badge-" + statusClass(el.value));
  };

  function inDateRange(rec, filter) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = parseISO(rec.date);
    switch (filter) {
      case "all":        return true;
      case "this_month": return d.getFullYear() === y && d.getMonth() === m;  // NEW
      case "this_year":  return d.getFullYear() === y;
      case "next_90":    { const end = new Date(now); end.setDate(end.getDate()+90); return d >= now && d <= end; }
      case "last_90":    { const start = new Date(now); start.setDate(start.getDate()-90); return d >= start && d <= now; }
      case "y2024":      return d.getFullYear() === 2024;
      case "y2023":      return d.getFullYear() === 2023;
      case "y2022":      return d.getFullYear() === 2022;
      default:           return true;
    }
  }



  // ===== Data (Supabase) =====
  // UI shape: { id, vendor, description, client, serviceType, date, amount, frequency, status }
  const items = [];

  async function fetchExpenses() {
    console.log("[expenses:fetch] requesting 'expenses' from Supabase…");
    const { data, error } = await sb
      .from("expenses")
      .select(`
        id, vendor, description, client_name, service,
        expense_date, amount, frequency, status, note
      `)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("[expenses:fetch] ERROR:", error);
      return [];
    }

    console.log(`[expenses:fetch] got ${data?.length || 0} rows from DB`);
    const mapped = (data || []).map((r) => ({
      id: r.id,
      vendor: r.vendor || "",
      description: r.description || "",
      client: r.client_name || "",
      serviceType: r.service || "",
      date: r.expense_date || "", // YYYY-MM-DD
      amount: r.amount ?? 0,
      frequency: r.frequency || "",
      status: r.status || "Unpaid",
      note: r.note || ""
    }));

    // Sample of first two rows for sanity:
    console.log("[expenses:fetch] sample rows:", mapped.slice(0, 2));
    return mapped;
  }

  async function refreshData() {
    const rows = await fetchExpenses();
    items.splice(0, items.length, ...rows);
    console.log(`[expenses:refresh] items in memory: ${items.length}`);
  }

  // ===== Filters / Dropdown population =====
  function repopulateFilterDropdownsFromItems() {
    const vendorSel  = document.querySelector("#expVendorFilter");
    const clientSel  = document.querySelector("#expClientFilter");   // ← NEW
    const serviceSel = document.querySelector("#expServiceFilter");

    // Vendors
    const vendors = Array.from(new Set(items.map(x => x.vendor).filter(Boolean))).sort();
    if (vendorSel) {
      vendorSel.innerHTML =
        `<option value="all">All vendors</option>` +
        vendors.map(v => `<option value="${v}">${v}</option>`).join("");
    }

    // Clients (NEW)
    const clients = Array.from(new Set(items.map(x => x.client).filter(Boolean))).sort();
    if (clientSel) {
      clientSel.innerHTML =
        `<option value="all">All clients</option>` +
        clients.map(c => `<option value="${c}">${c}</option>`).join("");
    }

    clientSel?.addEventListener("change", (e) => {
      state.clientFilter = e.target.value;
      console.log("[expenses:ui] set clientFilter ->", state.clientFilter);
      render();
    });
    

    // Services
    const services = Array.from(new Set(items.map(x => x.serviceType).filter(Boolean))).sort();
    if (serviceSel) {
      serviceSel.innerHTML =
        `<option value="all">All services</option>` +
        services.map(sv => `<option value="${sv}">${sv[0].toUpperCase() + sv.slice(1)}</option>`).join("");
    }

    console.log("[expenses:filters] vendors:", vendors);
    console.log("[expenses:filters] clients:", clients);   // ← NEW
    console.log("[expenses:filters] services:", services);
  }


  function populateModalServiceOptionsFromItems() {
    const sel = $("#exp-service-input");
    if (!sel) return;
    const uniq = Array.from(
      new Set(items.map((x) => (x.serviceType || "").trim()).filter(Boolean))
    ).sort();
    const opts = uniq.length ? uniq : ["email", "hosting", "domain", "cloud", "design", "automation", "cdn", "other"];
    sel.innerHTML = opts.map((v) => `<option value="${v}">${titleCase(v)}</option>`).join("");
    console.log("[expenses:modal] service options:", opts);
  }

  // ===== State =====
  const state = {
    sortKey: "date",
    sortDir: "desc",
    clientFilter: "all",      // ← NEW
    dateFilter: "this_month",
    vendorFilter: "all",
    serviceFilter: "all",
  };

  // ===== Render table =====
  function statusSelect(value, id) {
    const cls = statusClass(value);
    return `
      <select class="status-select badge-${cls}" data-id="${id}">
        ${STATUS_OPTIONS.map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("")}
      </select>
    `;
  }

  

  function updateSortIndicators() {
    document.querySelectorAll("#expensesTable thead th[data-sort]").forEach((th) => {
      const key = th.getAttribute("data-sort");
      const base = th.getAttribute("data-label") || th.textContent.replace(/[▲▼]/g, "").trim();
      th.setAttribute("data-label", base);
      th.textContent = key === state.sortKey ? base + (state.sortDir === "asc" ? " ▲" : " ▼") : base;
    });
  }

  function render() {
    const tbody = $("#expensesBody");
    if (!tbody) return;

    console.log("[expenses:render] start with items:", items.length);
    let rows = items
      .filter((x) => inDateRange(x, state.dateFilter))
      .filter((x) => (state.vendorFilter  === "all" ? true : x.vendor      === state.vendorFilter))
      .filter((x) => (state.clientFilter  === "all" ? true : x.client      === state.clientFilter)) // ← NEW
      .filter((x) => (state.serviceFilter === "all" ? true : x.serviceType === state.serviceFilter));


    console.log("[expenses:render] after filters — date:", state.dateFilter, "vendor:", state.vendorFilter, "service:", state.serviceFilter, "=>", rows.length);

    rows.sort((a, b) => {
      const k = state.sortKey;
      if (k === "date") return parseISO(a.date) - parseISO(b.date);
      if (k === "amount") return (a.amount || 0) - (b.amount || 0);
      if (k === "serviceType") return (a.serviceType || "").localeCompare(b.serviceType || "");
      if (k === "expense") return (a.vendor + a.description).localeCompare(b.vendor + b.description);
      if (k === "frequency") return freqOrder(a.frequency) - freqOrder(b.frequency);
      if (k === "status") return statusOrder(a.status) - statusOrder(b.status);
      return 0;
    });
    if (state.sortDir === "desc") rows.reverse();

    updateSortIndicators();

tbody.innerHTML =
  rows
    .map((r) => {
      const expenseLabel = `${r.vendor} — ${r.description || ""}`.trim();
      const hasNote = !!(r.note && String(r.note).trim());
      const title = `Expense note for ${r.client || "—"}`;

      return `
        <tr data-id="${r.id}">
          <td>${expenseLabel}</td>
          <td>${r.client || "—"}</td>
          <td>${r.date}</td>
          <td>${titleCase(r.serviceType)}</td>
          <td>${fmt$(r.amount)}</td>
          <td>${r.frequency||"—"}</td>
          <td>${statusSelect(r.status, r.id)}</td>
          <td class="row-actions"><button class="mini view-expense" data-id="${r.id}">View</button></td>

          <!-- Note toggle cell -->
          <td class="note-toggle-cell" style="text-align:center;">
            <button type="button" class="inv-mini-btn exp-mini-btn" data-id="${r.id}" aria-expanded="false">+</button>
          </td>
        </tr>

        <!-- Expand row -->
        <tr class="exp-details" data-id="${r.id}" style="display:none;">
          <td colspan="9" class="details-cell">
            <div class="invoice-note-block">
              <!-- Header: Title + action -->
              <!-- Header: NOTE TEXT (default) + action; title only used in edit mode -->
              <div class="note-header">
                <div class="note-title"
                    data-id="${r.id}"
                    data-title="Expense note for ${r.client || '—'}">
                  ${(r.note && String(r.note).trim()) ? r.note : 'No note yet.'}
                </div>
                <div class="note-actions" data-kind="note-actions">
                  ${
                    hasNote
                      ? `<button type="button" class="btn-note btn-note--ghost note-edit-btn" data-id="${r.id}">Edit</button>`
                      : `<button type="button" class="btn-note btn-note--ghost note-new-btn"  data-id="${r.id}">Write new</button>`
                  }
                </div>
              </div>


              <!-- Editor -->
              <div class="note-edit-wrap" data-id="${r.id}" style="display:none;">
                <textarea class="note-textarea" data-id="${r.id}" rows="4"></textarea>
              </div>

              <!-- Footer -->
              <div class="note-footer" data-id="${r.id}" style="display:none;">
                <div class="note-sub">Single note per expense. Saving overwrites it.</div>
                <div class="note-buttons">
                  <button type="button" class="btn-note btn-note--danger note-cancel-btn" data-id="${r.id}">Cancel</button>
                  <button type="button" class="btn-note btn-note--primary note-save-btn"  data-id="${r.id}">Save</button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("") || `<tr><td colspan="9">No expenses for this filter.</td></tr>`;
  }

  // ===== Modal logic (view/edit/create) =====
  const modal = $("#expense-modal");
  const actionsBar = $("#expense-edit-actions");
  const closeX = $("#expenseCloseBtn");

  const disp = {
    titleText: $("#expense-title-text"),
    vendor: $("#exp-vendor"),
    desc: $("#exp-desc"),
    client: $("#exp-client"),
    service: $("#exp-service"),
    date: $("#exp-date"),
    amount: $("#exp-amount"),
    freq: $("#exp-frequency"),
    status: $("#exp-status"),
  };

  const titleInput = $("#expense-title-input"); // optional
  const inputs = {
    vendor: $("#exp-vendor-input"),
    desc: $("#exp-desc-input"),
    client: $("#exp-client-input"),
    service: $("#exp-service-input"),
    date: $("#exp-date-input"),
    amount: $("#exp-amount-input"),
    freq: $("#exp-frequency-input"),
    status: $("#exp-status-input"),
  };

  const editBtn = $("#editExpenseBtn");
  const saveBtn = $("#saveExpenseBtn");
  const cancelBtn = $("#cancelExpenseBtn");
  const err = $("#expenseEditError");
  const newBtn = $("#newExpenseBtn");

  let mode = "view"; // 'view' | 'edit' | 'create'
  let currentId = null;

  // ===== Notes accordion (expenses) =====
  const expTbody = document.querySelector("#expensesBody");

  // Toggle open/close (single-open behavior)
  expTbody?.addEventListener("click", (e) => {
    const btn = e.target.closest(".exp-mini-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const detailsRow = expTbody.querySelector(`tr.exp-details[data-id="${id}"]`);
    if (!detailsRow) return;

    const isOpen = detailsRow.style.display !== "none";

    // close all
    expTbody.querySelectorAll("tr.exp-details").forEach(r => r.style.display = "none");
    expTbody.querySelectorAll(".exp-mini-btn").forEach(b => {
      b.textContent = "+";
      b.classList.remove("inv-open");
      b.setAttribute("aria-expanded","false");
    });

    // open current
    if (!isOpen) {
      detailsRow.style.display = "";
      btn.textContent = "−";
      btn.classList.add("inv-open");
      btn.setAttribute("aria-expanded","true");
    }
  });

  function setExpNoteEditMode(id, on, isNew=false){
    const editWrap = expTbody.querySelector(`.note-edit-wrap[data-id="${id}"]`);
    const footer   = expTbody.querySelector(`.note-footer[data-id="${id}"]`);
    const ta       = expTbody.querySelector(`.note-textarea[data-id="${id}"]`);
    const headerEl = expTbody.querySelector(`.note-title[data-id="${id}"]`);
    if (!editWrap || !footer || !ta || !headerEl) return;

    const rec = items.find(x => String(x.id) === String(id));

    if (on) {
      ta.value = isNew ? "" : (rec?.note || "");
      editWrap.style.display = "";
      footer.style.display   = "";
      // show edit-mode title in header
      if (headerEl.dataset.title) headerEl.textContent = headerEl.dataset.title;
    } else {
      editWrap.style.display = "none";
      footer.style.display   = "none";
      // restore header to current note text
      const noteText = (rec?.note && String(rec.note).trim()) ? rec.note : "No note yet.";
      headerEl.textContent = noteText;
    }
  }

  function refreshExpNoteActionButton(id){
    const rec = items.find(x => String(x.id) === String(id));
    const actions = expTbody.querySelector(`tr.exp-details[data-id="${id}"] .note-actions[data-kind="note-actions"]`);
    if (!actions) return;
    const hasNote = !!(rec?.note && String(rec.note).trim());
    actions.innerHTML = hasNote
      ? `<button type="button" class="btn-note btn-note--ghost note-edit-btn" data-id="${id}">Edit</button>`
      : `<button type="button" class="btn-note btn-note--ghost note-new-btn"  data-id="${id}">Write new</button>`;
  }

  // Enter edit / New
  expTbody?.addEventListener("click", (e) => {
    const newBtn = e.target.closest(".note-new-btn");
    if (newBtn) { setExpNoteEditMode(newBtn.dataset.id, true, true); return; }
    const editBtn = e.target.closest(".note-edit-btn");
    if (editBtn){ setExpNoteEditMode(editBtn.dataset.id, true, false); return; }
  });

  // Cancel
  expTbody?.addEventListener("click", (e) => {
    const btn = e.target.closest(".note-cancel-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    setExpNoteEditMode(id, false);
    refreshExpNoteActionButton(id);
  });

  // Save -> Supabase, update items[], refresh button, close editor
  expTbody?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".note-save-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const ta = expTbody.querySelector(`.note-textarea[data-id="${id}"]`);
    if (!ta) return;

    const text = ta.value.trim();
    try {
      const { error } = await sb.from("expenses").update({ note: text }).eq("id", id);
      if (error) throw error;

      // update in-memory row
      const idx = items.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) items[idx].note = text;

      // flip "Write new" ↔ "Edit" immediately
      refreshExpNoteActionButton(id);
      setExpNoteEditMode(id, false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save note.");
    }
  });


  function openModalView(exp) {
    mode = "view";
    modal.classList.remove("editing");
    err.textContent = "";

    disp.titleText.textContent = `${exp.vendor || ""} — ${exp.description || ""}`.trim() || "Expense";
    if (titleInput) titleInput.value = disp.titleText.textContent;

    disp.vendor.textContent = exp.vendor || "—";
    disp.desc.textContent = exp.description || "—";
    disp.client.textContent = exp.client || "—";
    disp.service.textContent = titleCase(exp.serviceType || "");
    disp.date.textContent = exp.date || "—";
    disp.amount.textContent = fmt$(exp.amount || 0);
    disp.freq.textContent = exp.frequency || "—";
    disp.status.textContent = exp.status || "—";

    editBtn.style.display = "inline-flex";
    actionsBar.style.display = "none";
    modal.classList.add("show");

    console.log("[expenses:modal] view ->", exp);
  }

  function openModalEdit(exp) {
    mode = "edit";
    modal.classList.add("editing");
    err.textContent = "";

    if (titleInput) titleInput.value = `${exp.vendor || ""} — ${exp.description || ""}`.trim();

    inputs.vendor.value = exp.vendor || "";
    inputs.desc.value = exp.description || "";
    inputs.client.value = exp.client || "";
    inputs.service.value = exp.serviceType || (inputs.service.querySelector("option")?.value || "other");
    inputs.date.value = exp.date || "";
    inputs.amount.value = exp.amount ?? "";
    inputs.freq.value = exp.frequency || "Monthly";
    inputs.status.value = exp.status || "Unpaid";

    editBtn.style.display = "none";
    actionsBar.style.display = "flex";
    modal.classList.add("show");

    console.log("[expenses:modal] edit ->", exp);
  }

  function openModalCreate() {
    mode = "create";
    currentId = null;
    disp.titleText.textContent = "New Expense";

    if (titleInput) titleInput.value = "";
    Object.values(inputs).forEach((el) => (el.value = ""));

    // sensible defaults
    inputs.service.value = inputs.service.querySelector("option")?.value || "other";
    inputs.freq.value = "Monthly";
    inputs.status.value = "Unpaid";

    modal.classList.add("editing");
    err.textContent = "";
    editBtn.style.display = "none";
    actionsBar.style.display = "flex";
    modal.classList.add("show");

    console.log("[expenses:modal] create");
  }

  function closeModal() {
    modal.classList.remove("show", "editing");
    err.textContent = "";
  }

  // ===== Supabase Upserts =====
  async function upsertExpenseToDB(payload, id = null) {
    if (!id) {
      console.log("[expenses:save] INSERT payload:", payload);
      const { data, error } = await sb.from("expenses").insert(payload).select().single();
      if (error) throw error;
      console.log("[expenses:save] INSERT ok ->", data);
      return data;
    } else {
      console.log("[expenses:save] UPDATE id:", id, "payload:", payload);
      const { data, error } = await sb.from("expenses").update(payload).eq("id", id).select().single();
      if (error) throw error;
      console.log("[expenses:save] UPDATE ok ->", data);
      return data;
    }
  }

  async function updateStatusInDB(id, newStatus) {
    console.log("[expenses:status] update id:", id, "=>", newStatus);
    const { error } = await sb.from("expenses").update({ status: newStatus }).eq("id", id);
    if (error) throw error;
    console.log("[expenses:status] update ok");
  }

  // ===== Init / Wiring =====
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => console.error("[expenses:init] fatal error", e));
  });

  async function init() {
    // 1) Load from Supabase
    await refreshData();

    
    await debugSupabaseSmokeTest();  // ← add this line


    // 2) Populate filter dropdowns and modal service options from live data
    repopulateFilterDropdownsFromItems();
    populateModalServiceOptionsFromItems();

    // 3) Filters
    $("#expDateFilter")?.addEventListener("change", (e) => {
      state.dateFilter = e.target.value;
      console.log("[expenses:ui] set dateFilter ->", state.dateFilter);
      render();
    });

    const vendorSel = $("#expVendorFilter");
    const serviceSel = $("#expServiceFilter");

    vendorSel?.addEventListener("change", (e) => {
      state.vendorFilter = e.target.value;
      console.log("[expenses:ui] set vendorFilter ->", state.vendorFilter);
      render();
    });
    serviceSel?.addEventListener("change", (e) => {
      state.serviceFilter = e.target.value;
      console.log("[expenses:ui] set serviceFilter ->", state.serviceFilter);
      render();
    });

    // 4) Sorting
    document.querySelectorAll("#expensesTable thead th[data-sort]").forEach((th) => {
      const key = th.getAttribute("data-sort");
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = key === "date" || key === "amount" ? "desc" : "asc";
        }
        console.log("[expenses:ui] sort ->", state.sortKey, state.sortDir);
        render();
      });
    });

    // 5) Inline status change (optimistic; persists to Supabase)
    $("#expensesBody")?.addEventListener("change", async (e) => {
      const el = e.target.closest(".status-select");
      if (!el) return;
      const id = el.getAttribute("data-id");
      const rec = items.find((x) => x.id === id);
      if (!rec) return;

      const prev = rec.status;
      const next = el.value;

      // optimistic UI
      rec.status = next;
      applyStatusClass(el);
      if (state.sortKey === "status") render();

      try {
        await updateStatusInDB(id, next);
        el.blur();
      } catch (err) {
        console.error("[expenses:status] FAILED:", err);
        // revert on failure
        rec.status = prev;
        render();
        alert("Failed to update status. Please try again.");
      }
    });

    // 6) Row → open modal (view)
    $("#expensesBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button.view-expense");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const exp = items.find((x) => x.id === id);
      if (!exp) return;
      currentId = id;
      openModalView(exp);
    });

    // 7) Header "+ New Expense"
    $("#newExpenseBtn")?.addEventListener("click", openModalCreate);

    // 8) Inside modal: Edit button in view mode
    $("#editExpenseBtn")?.addEventListener("click", () => {
      if (!currentId) return;
      const exp = items.find((x) => x.id === currentId);
      if (!exp) return;
      // keep service options in sync (in case they changed)
      populateModalServiceOptionsFromItems();
      openModalEdit(exp);
    });

    // 9) Save (create or edit)
    $("#saveExpenseBtn")?.addEventListener("click", async () => {
      err.textContent = "";

      // Basic validation
      const vendor = inputs.vendor.value.trim();
      const date = inputs.date.value;
      const amount = parseFloat(inputs.amount.value);
      if (!vendor) { err.textContent = "Vendor is required."; return; }
      if (!date)   { err.textContent = "Date is required."; return; }
      if (Number.isNaN(amount)) { err.textContent = "Amount must be a number."; return; }

      const payloadDB = {
        vendor,
        description: inputs.desc.value.trim(),
        client_name: inputs.client.value.trim(),
        service: inputs.service.value,
        expense_date: date,
        amount,
        frequency: inputs.freq.value,
        status: inputs.status.value,
      };

      try {
        const saved = await upsertExpenseToDB(payloadDB, mode === "edit" ? currentId : null);

        // reflect back in UI shape
        const mapped = {
          id: saved.id,
          vendor: saved.vendor || "",
          description: saved.description || "",
          client: saved.client_name || "",
          serviceType: saved.service || "",
          date: saved.expense_date || "",
          amount: saved.amount ?? 0,
          frequency: saved.frequency || "",
          status: saved.status || "Unpaid",
        };

        if (mode === "create") {
          items.unshift(mapped);
        } else if (mode === "edit" && currentId) {
          const idx = items.findIndex((x) => x.id === currentId);
          if (idx !== -1) items[idx] = mapped;
        }

        // Update dropdowns in case the vendor/service universe changed
        repopulateFilterDropdownsFromItems();
        populateModalServiceOptionsFromItems();

        closeModal();
        render();
      } catch (e2) {
        console.error("[expenses:save] FAILED:", e2);
        err.textContent = "Failed to save. Try again.";
      }
    });

    // 10) Close modal
    $("#cancelExpenseBtn")?.addEventListener("click", closeModal);
    $("#expenseCloseBtn")?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // 11) First paint
    render();
  }
})();
