(() => {
  // ---------- Config / Data (swap to Supabase later) ----------
  const USD_TO_JOD = 0.709; // move to ENV/config later if you want

  // Amounts in USD by client by year
  const DATA = [
    {
      name: "Acme LLC",
      income: { "2022": 5400, "2023": 6800, "2024": 8100, "2025": 7400 },
      cost:   { "2022": 1800, "2023": 2100, "2024": 2450, "2025": 2300 }
    },
    {
      name: "Riada Co",
      income: { "2022": 9100, "2023": 9900, "2024": 11000, "2025": 10700 },
      cost:   { "2022": 2900, "2023": 3000, "2024": 3350, "2025": 3100 }
    },
    {
      name: "Nasma Group",
      income: { "2022": 3000, "2023": 3200, "2024": 4050, "2025": 3900 },
      cost:   { "2022": 1000, "2023": 1100, "2024": 1300, "2025": 1400 }
    }
  ];

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const fmt$ = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const toJOD = (n) => Number(n || 0) * USD_TO_JOD;
  const sumObj = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

  function compute(scopeYear) {
    const rows = DATA.map((c) => {
      const income = scopeYear === "all" ? sumObj(c.income) : (c.income[scopeYear] || 0);
      const cost   = scopeYear === "all" ? sumObj(c.cost)   : (c.cost[scopeYear] || 0);
      return { name: c.name, income, cost };
    });
    const totalIncome = rows.reduce((a, r) => a + r.income, 0);
    const totalCost   = rows.reduce((a, r) => a + r.cost, 0);
    const totalPL     = totalIncome - totalCost;
    return { rows, totalIncome, totalCost, totalPL };
  }

  function render(scopeYear) {
    const { rows, totalIncome, totalCost, totalPL } = compute(scopeYear);

    // Top stats
    $("#incomeUSD").textContent = fmt$(totalIncome);
    $("#incomeSub").textContent =
      (scopeYear === "all" ? "Since opening" : `Year ${scopeYear}`) +
      ` • ${fmt$(toJOD(totalIncome))} JOD`;

    $("#costUSD").textContent = fmt$(totalCost);
    $("#costSub").textContent =
      (scopeYear === "all" ? "Since opening" : `Year ${scopeYear}`) +
      ` • ${fmt$(toJOD(totalCost))} JOD`;

    $("#plUSD").textContent = fmt$(totalPL);
    $("#plSub").textContent =
      (scopeYear === "all" ? "Since opening" : `Year ${scopeYear}`) +
      ` • ${fmt$(toJOD(totalPL))} JOD`;

    // Tables
    const incomeT = $("#incomeTable");
    const costT   = $("#costTable");

    incomeT.innerHTML = rows
      .map((r) => `<tr><td>${r.name}</td><td>${fmt$(r.income)}</td><td>${fmt$(toJOD(r.income))}</td></tr>`)
      .join("");

    costT.innerHTML = rows
      .map((r) => `<tr><td>${r.name}</td><td>${fmt$(r.cost)}</td><td>${fmt$(toJOD(r.cost))}</td></tr>`)
      .join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const sel = $("#revYear");
    render(sel.value);
    sel.addEventListener("change", () => render(sel.value));
  });
})();
