(() => {
  // ===== Mock Data (swap with Supabase later) =====
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  // Invoices (Income)
  const invoices = [
    { id: "INV-001", date: "2025-06-05", client: "Acme LLC",    amount: 1200, status: "Paid" },
    { id: "INV-002", date: "2025-06-12", client: "Riada Co",    amount: 1500, status: "Pending" },
    { id: "INV-003", date: "2025-07-02", client: "Nasma Group", amount: 950,  status: "Paid"   },
    { id: "INV-004", date: "2025-07-12", client: "Acme LLC",    amount: 1800, status: "Paid"   },
    { id: "INV-005", date: "2025-08-03", client: "Orbit Labs",  amount: 1400, status: "Draft"  }
  ];

  // Expenses (Dues)
  const expenses = [
    { vendor: "Google",     date: "2025-06-03", category: "Ads",        amount: 600, status: "Paid" },
    { vendor: "Adobe",      date: "2025-06-10", category: "Creative",   amount: 300, status: "Paid" },
    { vendor: "Wix",        date: "2025-07-01", category: "Hosting",    amount: 200, status: "Pending" },
    { vendor: "AWS",        date: "2025-07-15", category: "Cloud",      amount: 450, status: "Paid" },
    { vendor: "Namecheap",  date: "2025-07-20", category: "Domains",    amount: 80,  status: "Paid" },
    { vendor: "Figma",      date: "2025-08-04", category: "Design",     amount: 180, status: "Paid" },
    { vendor: "Zapier",     date: "2025-08-09", category: "Automation", amount: 95,  status: "Paid" },
    { vendor: "Cloudflare", date: "2025-08-16", category: "CDN",        amount: 120, status: "Paid" }
  ];

  // ===== Helpers =====
  const $ = s => document.querySelector(s);
  const fmt$ = n => "$" + Number(n || 0).toLocaleString();
  const monthNum = (dateStr) => new Date(dateStr).getMonth() + 1;
  const thisMonth = () => new Date().getMonth() + 1;

  function fillMonthSelect(sel) {
    sel.innerHTML = months.map((m,i)=>`<option value="${i+1}">${m} 2025</option>`).join("");
  }

  // Build 5-month window prev2..next2 (clamped to same year)
  function monthWindow(center) {
    const arr = [];
    for (let off = -2; off <= 2; off++) {
      const m = Math.min(12, Math.max(1, center + off));
      arr.push({ m, label: months[m - 1] });
    }
    return arr;
  }

  // ===== Renderers (each card independent) =====
  function renderExpensesMonth(m) {
    const rows = expenses.filter(e => monthNum(e.date) === m);
    const total = rows.reduce((a, r) => a + (r.amount || 0), 0);
    const totalEl = $("#expMonthTotal");
    if (totalEl) totalEl.textContent = fmt$(total);
    $("#expMonthBody").innerHTML = rows.length
      ? rows.map(r => `
        <tr>
          <td>${r.vendor}</td>
          <td>${r.date}</td>
          <td>${r.category}</td>
          <td>${fmt$(r.amount)}</td>
          <td>${r.status}</td>
        </tr>`).join("")
      : `<tr><td colspan="5">No expenses</td></tr>`;
  }

  function renderIncomeMonth(m) {
    const rows = invoices.filter(i => monthNum(i.date) === m);
    const total = rows.reduce((a, r) => a + (r.amount || 0), 0);
    const totalEl = $("#incomeMonthTotal");
    if (totalEl) totalEl.textContent = fmt$(total);
    $("#incomeMonthBody").innerHTML = rows.length
      ? rows.map(r => `
        <tr>
          <td>${r.id}</td>
          <td>${r.date}</td>
          <td>${r.client}</td>
          <td>${fmt$(r.amount)}</td>
          <td>${r.status}</td>
        </tr>`).join("")
      : `<tr><td colspan="5">No invoices</td></tr>`;
  }

  function renderExpenses5(m) {
    const win = monthWindow(m);
    const vendors = Array.from(new Set(expenses.map(e => e.vendor))).sort();
    const get = (vendor, mm) => expenses
        .filter(e => e.vendor === vendor && monthNum(e.date) === mm)
        .reduce((a, e) => a + e.amount, 0);

    const head = `<tr><th>Platform</th>${win.map(w=>`<th>${w.label}</th>`).join("")}</tr>`;

    // regular vendor rows
    const rows = vendors.map(vendor => {
        const cells = win.map(w => `<td>${fmt$(get(vendor, w.m))}</td>`).join("");
        return `<tr><td>${vendor}</td>${cells}</tr>`;
    }).join("");

    // totals row
    const totals = win.map(w => {
        const sum = expenses
        .filter(e => monthNum(e.date) === w.m)
        .reduce((a,e)=>a+e.amount,0);
        return `<td>${fmt$(sum)}</td>`;
    }).join("");
    const totalRow = `<tr class="totals-row exp"><td>Total</td>${totals}</tr>`;

    $("#exp5Head").innerHTML = head;
    $("#exp5Body").innerHTML = rows + totalRow;
    }

    function renderIncome5(m) {
    const win = monthWindow(m);
    const clients = Array.from(new Set(invoices.map(i => i.client))).sort();
    const get = (client, mm) => invoices
        .filter(i => i.client === client && monthNum(i.date) === mm)
        .reduce((a, i) => a + i.amount, 0);

    const head = `<tr><th>Client</th>${win.map(w=>`<th>${w.label}</th>`).join("")}</tr>`;

    // regular client rows
    const rows = clients.map(client => {
        const cells = win.map(w => `<td>${fmt$(get(client, w.m))}</td>`).join("");
        return `<tr><td>${client}</td>${cells}</tr>`;
    }).join("");

    // totals row
    const totals = win.map(w => {
        const sum = invoices
        .filter(i => monthNum(i.date) === w.m)
        .reduce((a,i)=>a+i.amount,0);
        return `<td>${fmt$(sum)}</td>`;
    }).join("");
    const totalRow = `<tr class="totals-row inc"><td>Total</td>${totals}</tr>`;

    $("#inc5Head").innerHTML = head;
    $("#inc5Body").innerHTML = rows + totalRow;
    }


  // ===== Boot + independent state & controls =====
  document.addEventListener("DOMContentLoaded", () => {
    // Selects
    const selExp    = $("#expMonth");
    const selInc    = $("#incomeMonth");
    const selExp5   = $("#exp5Month");
    const selInc5   = $("#inc5Month");

    // Fill selects
    [selExp, selInc, selExp5, selInc5].forEach(s => s && fillMonthSelect(s));

    // Independent state (one per card)
    const state = {
      expMonth:  thisMonth(),
      incMonth:  thisMonth(),
      exp5Month: thisMonth(),
      inc5Month: thisMonth()
    };

    // Set initial select values
    if (selExp)  selExp.value  = state.expMonth;
    if (selInc)  selInc.value  = state.incMonth;
    if (selExp5) selExp5.value = state.exp5Month;
    if (selInc5) selInc5.value = state.inc5Month;

    // Initial renders
    renderExpensesMonth(state.expMonth);
    renderIncomeMonth(state.incMonth);
    renderExpenses5(state.exp5Month);
    renderIncome5(state.inc5Month);

    // Card 1: Expenses month
    $("#expPrev")?.addEventListener("click", () => {
      state.expMonth = Math.max(1, state.expMonth - 1);
      if (selExp) selExp.value = state.expMonth;
      renderExpensesMonth(state.expMonth);
    });
    $("#expNext")?.addEventListener("click", () => {
      state.expMonth = Math.min(12, state.expMonth + 1);
      if (selExp) selExp.value = state.expMonth;
      renderExpensesMonth(state.expMonth);
    });
    selExp?.addEventListener("change", e => {
      state.expMonth = parseInt(e.target.value, 10);
      renderExpensesMonth(state.expMonth);
    });

    // Card 2: Income month
    $("#incomePrev")?.addEventListener("click", () => {
      state.incMonth = Math.max(1, state.incMonth - 1);
      if (selInc) selInc.value = state.incMonth;
      renderIncomeMonth(state.incMonth);
    });
    $("#incomeNext")?.addEventListener("click", () => {
      state.incMonth = Math.min(12, state.incMonth + 1);
      if (selInc) selInc.value = state.incMonth;
      renderIncomeMonth(state.incMonth);
    });
    selInc?.addEventListener("change", e => {
      state.incMonth = parseInt(e.target.value, 10);
      renderIncomeMonth(state.incMonth);
    });

    // Card 3: Expenses 5-month window
    selExp5?.addEventListener("change", e => {
      state.exp5Month = parseInt(e.target.value, 10);
      renderExpenses5(state.exp5Month);
    });

    // Card 4: Income 5-month window
    selInc5?.addEventListener("change", e => {
      state.inc5Month = parseInt(e.target.value, 10);
      renderIncome5(state.inc5Month);
    });
  });
})();
