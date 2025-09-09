// /assets/js/index.js
(() => {
  // ===== Guards =====
  if (!window.sb) {
    console.error("[dashboard] Supabase client `sb` not found. Make sure supabase.js initializes it globally.");
  }

  // ===== DOM =====
  const loader = document.querySelector("#contentLoader");

  // KPIs
  const elUnpaidTotal   = document.querySelector("#kpiUnpaidTotal");
  const elUnpaidCount   = document.querySelector("#kpiUnpaidCount");
  const elRev90         = document.querySelector("#kpiRev90");
  const elRev90Delta    = document.querySelector("#kpiRev90Delta");
  const elNextDueTotal  = document.querySelector("#kpiNextDueTotal");
  const elNextDueCount  = document.querySelector("#kpiNextDueCount");
  const elExp30         = document.querySelector("#kpiExp30");
  const elExp30Count    = document.querySelector("#kpiExp30Count");

  // Charts
  let funnelChart, topClientsChart, expDonutChart; // keep legacy var
  // new explicit refs for donuts (so we can destroy/re-render safely)
  let donutVendorChart = null;
  let donutClientChart = null;

  // ---------- Generic helpers ----------
  function groupSumBy(list, keyFn, amountFn){
    const map = new Map();
    for (const it of (list||[])) {
      const k = keyFn(it);
      const v = Number(amountFn(it) || 0);
      if (!k || !Number.isFinite(v)) continue;
      map.set(k, (map.get(k)||0) + v);
    }
    return map;
  }

  // Use the site’s font/colors inside Chart.js charts
    function setChartDefaults() {
    if (!window.Chart) return;
    const fam = getComputedStyle(document.body).fontFamily || 'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"';

    // Text
    Chart.defaults.font.family = fam;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = 'rgba(255,255,255,0.85)'; // tweak if you’re not on dark mode

    // Titles
    Chart.defaults.plugins.title.display = true;        // we set titles per-chart; this is a sane default
    Chart.defaults.plugins.title.font = { family: fam, size: 14, weight: '700' };

    // Legend: compact with point-style markers
    Chart.defaults.plugins.legend.position = 'bottom';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.padding = 12;
    }


  // (Unused here but kept for compatibility if something else calls it)
  function renderDonut(el, labels, series, title){
    const container = (typeof el === 'string') ? document.querySelector(el) : el;
    if (!container) return;

    if (window.ApexCharts) {
      const chart = new ApexCharts(container, {
        chart: { type: 'donut', height: 260 },
        title: { text: title, style:{ fontWeight:600 } },
        series,
        labels,
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v, opts) => {
          const val = series[opts.seriesIndex];
          return Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
        }}
      });
      chart.render();
      return chart;
    }

    // fallback: simple table list
    const rows = labels.map((l,i)=> `<tr><td>${l}</td><td style="text-align:right">${series[i].toFixed(0)}</td></tr>`).join("");
    container.innerHTML = `
      <div style="font-weight:600;margin:4px 0">${title}</div>
      <table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <tbody>${rows || `<tr><td colspan="2" style="opacity:.7">No data</td></tr>`}</tbody>
      </table>`;
  }

  // ===== Utils =====
  const fmt$ = (n) => {
    const v = Number(n || 0);
    return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const addDays = (d, n) => {
    const t = new Date(d);
    t.setDate(t.getDate() + n);
    return t;
  };

  const addMonths = (d, n) => {
    const t = new Date(d);
    t.setMonth(t.getMonth() + n);
    return t;
  };

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const toISODate = (d) => d.toISOString().slice(0, 10);

  const coerceDate = (v) => (v ? new Date(v) : null);

  const CYCLE_TO_MONTHS = { monthly: 1, month: 1, m: 1, quarterly: 3, quarter: 3, q: 3, annual: 12, annually: 12, yearly: 12, year: 12, y: 12 };

  // Try to read cycle from common columns; fallback to inference
  function detectCycleMonths(row, recentDates) {
    const raw = String(
      row.frequency || row.billing_cycle || row.recurrence || row.period || ""
    ).toLowerCase().trim();
    if (CYCLE_TO_MONTHS[raw]) return CYCLE_TO_MONTHS[raw];

    // crude inference: look at gaps between latest two issues in this group
    if (recentDates && recentDates.length >= 2) {
      const [d1, d0] = recentDates.slice(-2).map((d) => new Date(d)).sort((a,b)=>a-b);
      const months = Math.max(1, Math.round((d1 - d0) / (1000*60*60*24*30)));
      if (months >= 11) return 12;
      if (months >= 2 && months <= 4) return 3;
      return 1;
    }
    return null; // unknown
  }

  function addMonthsClamped(d, m) {
    const dt = new Date(d);
    const day = dt.getDate();
    dt.setMonth(dt.getMonth() + m);
    if (dt.getDate() < day) dt.setDate(0); // end-of-month clamp
    return dt;
  }

  // Some dashboards store invoice totals in `subtotal`; that’s what your Revenue page uses.
  // Use subtotal when available, fall back to total.
  const getInvoiceAmount = (row) => {
    if (row == null || typeof row !== "object") return 0;
    let n = row.subtotal ?? row.total ?? 0;
    return Number(n) || 0;
  };

  // Treat anything that is not 'Paid' as unpaid/open.
  const isPaid = (status) => String(status || "").toLowerCase() === "paid";

  const showLoader = (on) => {
    if (!loader) return;
    loader.style.display = on ? "block" : "none";
  };

  // ===== Date windows =====
  const now = new Date();
  const ninetyAgo = addDays(now, -90);
  const next90 = addDays(now, 90);
  const last12m = addMonths(now, -12);
  const next30 = addDays(now, 30);

  // ====== Data loads (Supabase) ======
  async function loadKPIs() {
    // Unpaid total and count
    const unpaidPromise = sb
      .from("invoices")
      .select("id, status, subtotal, total, due_date")
      .neq("status", "Paid");

    // Revenue last 90 days (Paid)
    const rev90Promise = sb
      .from("invoices")
      .select("id, status, subtotal, total, issue_date")
      .eq("status", "Paid")
      .gte("issue_date", toISODate(ninetyAgo))
      .lte("issue_date", toISODate(now));

    // Next due within 90 days (unpaid)
    const nextDuePromise = sb
      .from("invoices")
      .select("id, status, subtotal, total, due_date")
      .neq("status", "Paid")
      .gte("due_date", toISODate(now))
      .lte("due_date", toISODate(next90));

    // Expenses next 30 days
    const expNext30Promise = sb
      .from("expenses")
      .select("id, amount, expense_date")
      .gte("expense_date", toISODate(now))
      .lte("expense_date", toISODate(next30));

    const [unpaidRes, rev90Res, nextDueRes, exp30Res] = await Promise.allSettled([
      unpaidPromise, rev90Promise, nextDuePromise, expNext30Promise
    ]);

    // Unpaid
    if (unpaidRes.status === "fulfilled" && !unpaidRes.value.error) {
      const rows = unpaidRes.value.data || [];
      const total = rows.reduce((s, r) => s + getInvoiceAmount(r), 0);
      elUnpaidTotal && (elUnpaidTotal.textContent = fmt$(total));
      elUnpaidCount && (elUnpaidCount.textContent = rows.length);
    } else {
      console.warn("[dashboard] unpaid KPI error:", unpaidRes.value?.error || unpaidRes.reason);
    }

    // Revenue 90d
    let rev90 = 0;
    if (rev90Res.status === "fulfilled" && !rev90Res.value.error) {
      const rows = rev90Res.value.data || [];
      rev90 = rows.reduce((s, r) => s + getInvoiceAmount(r), 0);
      elRev90 && (elRev90.textContent = fmt$(rev90));
    } else {
      console.warn("[dashboard] rev90 KPI error:", rev90Res.value?.error || rev90Res.reason);
    }

    // Simple “delta” vs previous 90d window (optional)
    try {
      const prevStart = addDays(ninetyAgo, -90);
      const prevEnd = addDays(ninetyAgo, 0);
      const { data: prevRows, error: prevErr } = await sb
        .from("invoices")
        .select("id, status, subtotal, total, issue_date")
        .eq("status", "Paid")
        .gte("issue_date", toISODate(prevStart))
        .lte("issue_date", toISODate(prevEnd));
      if (!prevErr) {
        const prev = (prevRows || []).reduce((s, r) => s + getInvoiceAmount(r), 0);
        const deltaPct = prev > 0 ? ((rev90 - prev) / prev) * 100 : (rev90 > 0 ? 100 : 0);
        if (elRev90Delta) {
          elRev90Delta.textContent = (deltaPct >= 0 ? "+" : "") + deltaPct.toFixed(1) + "%";
          elRev90Delta.classList.remove("ok", "warn", "bad");
          elRev90Delta.classList.add(deltaPct >= 0 ? "ok" : "bad");
        }
      }
    } catch (e) {
      console.warn("[dashboard] rev90 delta error:", e);
    }

    // Next due 90d → from projection (not simply open invoices)
    try {
      const { sum, count } = await computeProjectedDuesNext90d();
      elNextDueTotal && (elNextDueTotal.textContent = fmt$(sum));
      elNextDueCount && (elNextDueCount.textContent = count);
    } catch (e) {
      console.warn("[dashboard] projected dues compute error:", e);
    }

    // Expenses next 30d
    if (exp30Res.status === "fulfilled" && !exp30Res.value.error) {
      const rows = exp30Res.value.data || [];
      const total = rows.reduce((s, r) => s + (Number(r.amount || 0)), 0);
      elExp30 && (elExp30.textContent = fmt$(total));
      elExp30Count && (elExp30Count.textContent = rows.length);
    } else {
      console.warn("[dashboard] exp30 KPI error:", exp30Res.value?.error || exp30Res.reason);
    }
  }

  // === Projected dues for the NEXT 90 DAYS only (Paid seeds only) ===
  async function computeProjectedDuesNext90d() {
    const today   = startOfDay(now);
    const horizon = addDays(today, 90);

    // Grab last 12m to infer cadence; schema-safe select
    const { data, error } = await sb
      .from("invoices")
      .select("*")
      .gte("issue_date", toISODate(last12m))
      .lte("issue_date", toISODate(now));

    if (error) {
      console.warn("[dashboard] projected dues error:", error);
      return { sum: 0, count: 0 };
    }

    const norm = (v) => (v == null ? "" : String(v));
    const isOneTime = (cp) => {
      const s = norm(cp).toLowerCase();
      return s === "one_time" || s === "one-time";
    };
    const looksRecurring = (cp) => {
      const s = norm(cp).toLowerCase();
      return s === "monthly" || s === "month" ||
             s === "quarterly" || s === "quarter" ||
             s === "annual" || s === "year" || s === "yearly";
    };

    // Seed ONLY from Paid invoices that are recurring (explicit or inferable)
    const seeds = (data || []).filter(r => {
      if (norm(r.status).toLowerCase() !== "paid") return false;
      if (isOneTime(r.coverage_period)) return false;
      const explicit = r?.is_recurring === true || norm(r?.is_recurring) === "true";
      return explicit || looksRecurring(r.coverage_period);
    });

    // Group by client + service/title (fallback to client only)
    const keyOf = (r) => {
      const clientKey = norm(r.client_id || r.client_name || "unknown");
      const svc = norm(r.service || r.title || "").toLowerCase().trim();
      return svc ? `${clientKey}::${svc}` : clientKey;
    };
    const groups = new Map();
    for (const r of seeds) {
      const k = keyOf(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }

    let sum = 0, count = 0;

    groups.forEach(rows => {
      rows.sort((a,b) => {
        const da = new Date(a.issue_date || a.due_date || 0);
        const db = new Date(b.issue_date || b.due_date || 0);
        return da - db;
      });

      const last = rows[rows.length - 1];
      const recentDates = rows.map(r => r.issue_date || r.due_date).filter(Boolean);

      // infer cadence from paid history; fallback to monthly if explicitly recurring
      let cycleMonths = detectCycleMonths(last, recentDates);
      const explicitRecurring =
        last?.is_recurring === true || norm(last?.is_recurring) === "true";

      if (!cycleMonths && !explicitRecurring) return; // not enough signal
      const stepMonths = cycleMonths || 1;

      const base = new Date(last.due_date || last.issue_date || today);
      const amt  = getInvoiceAmount(last);

      // roll forward to first >= today
      let next = new Date(base);
      let guard = 0;
      while (next <= today && guard++ < 24) {
        next = addMonthsClamped(next, stepMonths);
      }

      // only count inside [today, today+90d]
      while (next >= today && next <= horizon && guard++ < 24) {
        sum += amt;
        count += 1;
        next = addMonthsClamped(next, stepMonths);
      }
    });

    return { sum, count };
  }

  async function loadOpportunitiesFunnel() {
    const { data, error } = await sb
      .from("opportunities")
      .select("status, value");
    if (error) {
      console.error("[dashboard] opportunities error:", error);
      return;
    }
    const rows = data || [];

    // Normalize
    const norm = (s) => String(s || "").toLowerCase();
    const buckets = {
      "proposed": 0,
      "in review": 0,
      "won": 0,
      "lost": 0,
    };
    let totalValue = 0;
    rows.forEach((r) => {
      const st = norm(r.status);
      const val = Number(r.value || 0);
      totalValue += val;
      if (st in buckets) buckets[st] += 1;
      else buckets["proposed"] += 1; // default bucket
    });

    // Build chart
    const ctx = document.getElementById("oppFunnel");
    if (!ctx) return;

    if (funnelChart) funnelChart.destroy();
    funnelChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Proposed", "In Review", "Won", "Lost"],
        datasets: [{
          label: "Opportunities",
          data: [
            buckets["proposed"], buckets["in review"], buckets["won"], buckets["lost"]
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "nearest", intersect: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.08)" } }
        }
      }
    });

    const totalEl = document.querySelector("#oppTotalValue");
    if (totalEl) totalEl.textContent = fmt$(totalValue);
  }

  async function loadTopClients12m() {
    // Join invoices -> clients (you already do this on invoices page)
    const { data, error } = await sb
      .from("invoices")
      .select(`
        id, subtotal, total, status, issue_date,
        clients!invoices_client_id_fkey ( name )
      `)
      .eq("status", "Paid")
      .gte("issue_date", toISODate(last12m))
      .lte("issue_date", toISODate(now));

    if (error) {
      console.error("[dashboard] top clients error:", error);
      return;
    }

    const agg = new Map(); // name -> sum
    (data || []).forEach((row) => {
      const name = row.clients?.name || "Unknown";
      const amt = getInvoiceAmount(row);
      agg.set(name, (agg.get(name) || 0) + amt);
    });

    // sort by amount desc
    const sorted = Array.from(agg.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 7);
    const labels = top.map(([name]) => name);
    const values = top.map(([, sum]) => sum);

    const ctx = document.getElementById("topClientsChart");
    if (!ctx) return;

    if (topClientsChart) topClientsChart.destroy();
    topClientsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: "Revenue (Paid)", data: values }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => fmt$(c.parsed.x) }
          }
        },
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.08)" } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // ===== Expenses: two donuts (vendor + client), last 90 days =====
  // ===== Expenses: two donuts (vendor + client), last 90 days =====
async function loadExpenseDonuts() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 90);

  // Select only the columns you actually have
  const { data, error } = await sb
    .from('expenses')
    .select('amount, vendor, client_name, expense_date')
    .gte('expense_date', from.toISOString().slice(0,10))
    .lte('expense_date', today.toISOString().slice(0,10));

  if (error) {
    console.error('[dashboard] expense donut error:', error);
    return;
  }

  const rows = data || [];

  // helpers
  const getAmt = (r) => Number(r.amount) || 0;
  const groupSum = (arr, keyFn) => {
    const m = new Map();
    for (const r of arr) {
      const k = String(keyFn(r) || 'Unknown').trim() || 'Unknown';
      const v = getAmt(r);
      if (!Number.isFinite(v)) continue;
      m.set(k, (m.get(k) || 0) + v);
    }
    return m;
  };

  // Build maps with your real fields
  const byVendor = groupSum(rows, r => r.vendor);
  const byClient = groupSum(rows, r => r.client_name);

  // Render both donuts (side by side canvases must exist in HTML)
  donutVendorChart = renderDoughnutChart(
    'expDonutChart',
    byVendor,
    'Expenses by Vendor (Last 90d)',
    donutVendorChart
  );

  donutClientChart = renderDoughnutChart(
    'expDonutByClientChart',
    byClient,
    'Expenses by Client (Last 90d)',
    donutClientChart
  );

  // Friendly placeholders if empty
  if (byVendor.size === 0) {
    const c = document.getElementById('expDonutChart')?.parentElement;
    if (c) c.insertAdjacentHTML('beforeend',
      '<div style="flex:1; text-align:center; opacity:.7; align-self:center;">No vendor data in last 90 days</div>');
  }
  if (byClient.size === 0) {
    const c = document.getElementById('expDonutByClientChart')?.parentElement;
    if (c) c.insertAdjacentHTML('beforeend',
      '<div style="flex:1; text-align:center; opacity:.7; align-self:center;">No client data in last 90 days</div>');
  }
}


  function renderDoughnutChart(canvasId, map, title, existingChart) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`[dashboard] canvas #${canvasId} not found`);
      return null;
    }
    const ctx = canvas.getContext('2d');
    const labels = [...map.keys()];
    const values = [...map.values()];

    // Kill previous instance to avoid overlay
    if (existingChart) {
      try { existingChart.destroy(); } catch {}
      existingChart = null;
    }

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((_, i) => `hsl(${(i*50)%360},70%,60%)`)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // so height from CSS is honored
        plugins: {
          title: { display: true, text: title },
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (tt) => {
                const v = tt.raw || 0;
                return `${tt.label}: ${Number(v).toLocaleString()}`;
              }
            }
          }
        }
      }
    });

    return chart;
  }

  // ===== Minor UI niceties for the topbar =====
  function setTodayBadge() {
    const el = document.querySelector("#todayBadge");
    if (!el) return;
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    el.textContent = `${dd}/${mm}/${yyyy}`;
  }

  function setGreeting() {
    const el = document.querySelector("#greetingWord");
    if (!el) return;
    const hr = new Date().getHours();
    el.textContent = hr < 12 ? "Good morning"
      : hr < 18 ? "Good afternoon"
      : "Good evening";
  }

  // ===== Init =====
  async function init() {
    try {
      showLoader(true);
      setTodayBadge();
      setGreeting();

      setChartDefaults();

      await Promise.all([
        loadKPIs(),
        loadOpportunitiesFunnel(),
        loadTopClients12m(),
        loadExpenseDonuts()     // two donuts: vendor + client
      ]);
    } catch (e) {
      console.error("[dashboard] init error:", e);
    } finally {
      showLoader(false);
    }

    // Search box toggle behavior (same as other pages)
    const searchToggle = document.getElementById("searchToggle");
    const searchWrap = document.getElementById("searchWrap");
    const searchGroup = searchToggle?.closest(".search-group");
    searchToggle?.addEventListener("click", () => {
      const open = searchWrap.classList.toggle("open");
      if (searchGroup) {
        searchGroup.classList.toggle("sg-open", open);
        searchGroup.classList.toggle("sg-closed", !open);
      }
      if (open) {
        setTimeout(() => document.getElementById("searchInput")?.focus(), 60);
      }
    });
  }

  // Fire
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
