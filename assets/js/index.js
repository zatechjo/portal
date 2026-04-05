// assets/js/index.js — Dashboard
(() => {
  const $ = id => document.getElementById(id);

  const fmt$ = n => window.fmtPortalMoney ? window.fmtPortalMoney(n) : ((Number(n||0) < 0 ? '-$' : '$') + Math.abs(Number(n||0)).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  const fmt$d = n => window.fmtPortalMoney ? window.fmtPortalMoney(n) : ((Number(n||0) < 0 ? '-$' : '$') + Math.abs(Number(n||0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const today = new Date();
  const toISO = d => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t; };

  // ── KPIs ────────────────────────────────────
  async function loadKPIs() {
    if (!window.sb) return;
    const ninetyAgo = addDays(today, -90);
    const prevStart = addDays(today, -180);

    // Unpaid = statuses that represent money actually owed
    const OWED_STATUSES = ['Not Paid', 'Sent', 'Partial Payment', 'Unpaid', 'Overdue'];

    const [unpaidRes, rev90Res, prevRes] = await Promise.allSettled([
      window.sb.from('invoices').select('id, subtotal, status')
        .in('status', OWED_STATUSES),
      window.sb.from('invoices').select('id, subtotal').eq('status', 'Paid')
        .gte('issue_date', toISO(ninetyAgo)).lte('issue_date', toISO(today)),
      window.sb.from('invoices').select('id, subtotal').eq('status', 'Paid')
        .gte('issue_date', toISO(prevStart)).lte('issue_date', toISO(ninetyAgo)),
    ]);

    if (unpaidRes.status === 'fulfilled' && !unpaidRes.value.error) {
      const rows = unpaidRes.value.data || [];
      const total = rows.reduce((s, r) => s + Number(r.subtotal || 0), 0);
      const el = $('kpiUnpaidTotal');
      if (el) el.textContent = fmt$(total);
      const badge = $('kpiUnpaidCount');
      if (badge) badge.textContent = `${rows.length} invoice${rows.length !== 1 ? 's' : ''}`;
    }

    let rev90 = 0;
    if (rev90Res.status === 'fulfilled' && !rev90Res.value.error) {
      const rows = rev90Res.value.data || [];
      rev90 = rows.reduce((s, r) => s + Number(r.subtotal || 0), 0);
      const el = $('kpiRev90');
      if (el) el.textContent = fmt$(rev90);
    }

    if (prevRes.status === 'fulfilled' && !prevRes.value.error) {
      const prevRows = prevRes.value.data || [];
      const prev = prevRows.reduce((s, r) => s + Number(r.subtotal || 0), 0);
      const pct = prev > 0 ? ((rev90 - prev) / prev * 100) : (rev90 > 0 ? 100 : 0);
      const badge = $('kpiRevDelta');
      if (badge) badge.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs prev 90d`;
    }
  }

  // ── Needs Attention ──────────────────────────
  async function loadAttention() {
    if (!window.sb) return;
    const list = $('attentionList');
    if (!list) return;

    const { data, error } = await window.sb
      .from('invoices')
      .select(`id, invoice_no, subtotal, status, due_date, clients!invoices_client_id_fkey ( name )`)
      .neq('status', 'Paid')
      .neq('status', 'Cancelled')
      .order('due_date', { ascending: true })
      .limit(6);

    if (error || !data || !data.length) {
      list.innerHTML = `<div class="dash-att-empty">All clear — nothing overdue 🎉</div>`;
      return;
    }

    const todayISO = toISO(today);
    list.innerHTML = data.map(inv => {
      const client = inv.clients?.name || 'Unknown';
      const isOverdue = inv.due_date && inv.due_date < todayISO;
      const statusLabel = isOverdue ? 'Overdue' : (inv.status || 'Open');
      return `
        <div class="dash-att-item">
          <div style="min-width:0;flex:1;">
            <div class="dash-att-client">${esc(client)}</div>
            <div class="dash-att-meta">#${esc(inv.invoice_no || '—')} · ${esc(statusLabel)}</div>
          </div>
          <div class="dash-att-amount">${fmt$d(inv.subtotal)}</div>
        </div>`;
    }).join('');
  }

  // ── Recent Invoices ───────────────────────────
  async function loadRecentInvoices() {
    if (!window.sb) return;
    const list = $('recentList');
    if (!list) return;

    const { data, error } = await window.sb
      .from('invoices')
      .select(`id, invoice_no, issue_date, subtotal, status, pdf_url, clients!invoices_client_id_fkey ( name )`)
      .order('issue_date', { ascending: false })
      .limit(12);

    const visibleInvoices = (data || [])
      .filter(inv => (inv.status || '').toLowerCase() !== 'cancelled')
      .slice(0, 6);

    if (error || !visibleInvoices.length) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:rgba(200,217,238,.3);font-size:13px;">No invoices yet.</div>`;
      return;
    }

    const statusClass = s => {
      const v = (s || '').toLowerCase();
      if (v === 'paid') return 'ok';
      if (['not paid', 'unpaid'].includes(v)) return 'due';
      if (v === 'partial payment') return 'partial';
      if (v === 'sent') return 'sent';
      return 'null';
    };
    const fmtDate = iso => {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    };

    list.innerHTML = visibleInvoices.map(inv => {
      // If PDF exists, open it directly; otherwise fall back to invoices page
      const href = inv.pdf_url ? inv.pdf_url : './invoices.html';
      const target = inv.pdf_url ? ' target="_blank" rel="noopener"' : '';
      const title = inv.pdf_url ? 'title="Open PDF"' : 'title="View invoices"';

      return `
        <a href="${esc(href)}"${target} ${title} class="dash-inv-row">
          <div class="dash-ir-client">
            ${esc(inv.clients?.name || '—')}
            <span>#${esc(inv.invoice_no || '—')}</span>
          </div>
          <div class="dash-ir-date">${fmtDate(inv.issue_date)}</div>
          <div class="dash-ir-status">
            <span class="tag ${statusClass(inv.status)}" style="font-size:10px;">
              ${esc(inv.status || '—')}
            </span>
          </div>
          <div class="dash-ir-amount">${fmt$d(inv.subtotal)}</div>
        </a>`;
    }).join('');
  }

  // ── Pipeline bars ─────────────────────────────
  async function loadPipeline() {
    if (!window.sb) return;
    const { data, error } = await window.sb.from('opportunities').select('status, value');
    if (error || !data) return;

    const buckets = { proposed: 0, 'in review': 0, won: 0, lost: 0 };
    let totalValue = 0;
    data.forEach(r => {
      const s = (r.status || '').toLowerCase();
      totalValue += Number(r.value || 0);
      if (s in buckets) buckets[s]++;
      else buckets.proposed++;
    });

    const max = Math.max(...Object.values(buckets), 1);
    const setBar = (barId, numId, count) => {
      const num = $(numId);
      if (num) num.textContent = count;
      const bar = $(barId);
      if (!bar) return;
      requestAnimationFrame(() => setTimeout(() => { bar.style.width = `${(count / max) * 100}%`; }, 250));
    };
    setBar('pipeProposed', 'pipeNProposed', buckets.proposed);
    setBar('pipeReview',   'pipeNReview',   buckets['in review']);
    setBar('pipeWon',      'pipeNWon',      buckets.won);
    setBar('pipeLost',     'pipeNLost',     buckets.lost);

    const tv = $('pipeTotalValue');
    if (tv) tv.textContent = fmt$(totalValue);
  }

  // ── Upcoming Expenses (next 30 days) ─────────
  async function loadUpcomingExpenses() {
    if (!window.sb) return;
    const list = $('upcomingExpList');
    if (!list) return;

    const next30 = addDays(today, 30);

    const { data, error } = await window.sb
      .from('expenses')
      .select('id, vendor, description, client_name, amount, expense_date, status')
      .neq('service', 'subcontractor')
      .gte('expense_date', toISO(today))
      .lte('expense_date', toISO(next30))
      .order('expense_date', { ascending: true })
      .limit(5);

    if (error || !data || !data.length) {
      const { data: fallback } = await window.sb
        .from('expenses')
        .select('id, vendor, description, client_name, amount, expense_date, status')
        .neq('service', 'subcontractor')
        .in('status', ['Unpaid', 'Upcoming'])
        .order('expense_date', { ascending: true })
        .limit(5);

      if (!fallback || !fallback.length) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:rgba(200,217,238,.3);font-size:13px;">No upcoming expenses.</div>`;
        return;
      }
      renderExpenses(list, fallback);
      return;
    }
    renderExpenses(list, data);
  }

  function renderExpenses(container, data) {
    const fmtDate = iso => {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    const daysUntil = iso => {
      if (!iso) return null;
      const diff = Math.round((new Date(iso) - today) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff < 0) return `${Math.abs(diff)}d ago`;
      return `in ${diff}d`;
    };

    container.innerHTML = data.map(exp => {
      const vendor = exp.vendor || '—';
      const label = exp.description || vendor;
      const client = exp.client_name ? ` · ${exp.client_name}` : '';
      const when = daysUntil(exp.expense_date);
      const urgent = when && (when.includes('ago') || when === 'Today');
      return `
        <div class="dash-exp-row" data-id="${exp.id}" style="cursor:pointer;">
          <div class="dash-exp-left">
            <div class="dash-exp-vendor">${esc(vendor)}</div>
            <div class="dash-exp-meta">${esc(label)}${esc(client)}</div>
          </div>
          <div class="dash-exp-right">
            <div class="dash-exp-amount">${fmt$d(exp.amount)}</div>
            <div class="dash-exp-when${urgent ? ' urgent' : ''}">${esc(when || fmtDate(exp.expense_date))}</div>
          </div>
        </div>`;
    }).join('');

  }

  // ── Task Board (Supabase — shared & live) ─────
  const TASK_KEY = 'zatech_tasks_v1'; // kept for migration only
  let tasks = [];
  let taskFilter = 'all';
  let taskChannel = null; // realtime subscription

  // ── Render (pure UI, no data fetching) ──
  function renderTasks() {
    const list = $('taskList');
    if (!list) return;

    const visible = tasks.filter(t => {
      if (taskFilter === 'active') return !t.done;
      if (taskFilter === 'done')   return  t.done;
      return true;
    });

    const allCount    = tasks.length;
    const activeCount = tasks.filter(t => !t.done).length;
    const doneCount   = tasks.filter(t =>  t.done).length;
    const cAll = $('taskCountAll'), cActive = $('taskCountActive'), cDone = $('taskCountDone');
    if (cAll)    cAll.textContent    = allCount;
    if (cActive) cActive.textContent = activeCount;
    if (cDone)   cDone.textContent   = doneCount;

    if (!visible.length) {
      list.innerHTML = `<div class="task-empty" id="taskEmpty">
        <span>&#x2713;</span>
        ${taskFilter === 'done' ? 'No completed tasks yet.' : taskFilter === 'active' ? 'All done! Nothing active.' : 'Nothing here yet &mdash; add your first task above'}
      </div>`;
      return;
    }

    // Helper: get due chip info
    const getDueInfo = (due_date) => {
      if (!due_date) return { chip: '', groupKey: 'no-due', groupLabel: 'No due date', chipClass: '' };
      const due = new Date(due_date + 'T00:00:00');
      const diffDays = Math.round((due - today) / 86400000);
      let chipClass = '', chipLabel = '';
      if (diffDays < 0)        { chipClass = 'overdue';  chipLabel = `Overdue · ${Math.abs(diffDays)}d`; }
      else if (diffDays === 0) { chipClass = 'due-soon'; chipLabel = 'Due today'; }
      else if (diffDays <= 3)  { chipClass = 'due-soon'; chipLabel = `Due in ${diffDays}d`; }
      else { chipLabel = `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`; }
      const chip = `<span class="task-pill task-due-chip${chipClass ? ' ' + chipClass : ''}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${chipLabel}</span>`;
      return { chip, groupKey: due_date, groupLabel: chipLabel, chipClass };
    };

    // Group by due_date
    const groups = new Map();
    visible.forEach(t => {
      const key = t.due_date || 'no-due';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });

    // Sort: overdue/soon first by date asc, no-due last
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === 'no-due') return 1;
      if (b === 'no-due') return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    const renderItem = t => {
      const { chip: dueDateChip } = getDueInfo(t.due_date);
      const priorityBadge = t.priority && t.priority !== 'normal'
        ? `<span class="task-priority-badge ${esc(t.priority)}">${t.priority === 'high' ? '&#x25CF; Urgent' : '&#x25CF; Low'}</span>`
        : '';
      const assigneeLower = t.assigned_to ? t.assigned_to.toLowerCase() : '';
      const assigneeChip = t.assigned_to
        ? `<span class="task-pill task-assignee-chip task-assignee-${esc(assigneeLower)}"><img class="task-assignee-avatar" src="./assets/img/${esc(assigneeLower)}.png" alt="${esc(t.assigned_to)}" onerror="this.style.display='none';this.nextSibling.style.display='inline-flex';" /><span class="task-assignee-init" style="display:none;">${t.assigned_to.charAt(0).toUpperCase()}</span>${esc(t.assigned_to)}</span>`
        : '';
      const hasMeta = dueDateChip || assigneeChip || priorityBadge;
      const createdLabel = t.created_at
        ? new Date(t.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
        : '';
      return `
      <div class="task-item${t.done ? ' done' : ''}" data-id="${esc(t.id)}" data-priority="${esc(t.priority || 'normal')}">
        <button class="task-del" data-action="delete" data-id="${esc(t.id)}" title="Delete task">&#x2715;</button>
        ${createdLabel ? `<div class="task-item-created">${createdLabel}</div>` : ''}
        <div class="task-item-main">
          <button class="task-check" data-action="check" data-id="${esc(t.id)}" title="${t.done ? 'Mark active' : 'Mark done'}">
            ${t.done ? '&#x2713;' : ''}
          </button>
          <span class="task-text">${esc(t.text)}</span>
        </div>
        ${hasMeta ? `<div class="task-meta">${dueDateChip}${assigneeChip}${priorityBadge}</div>` : ''}
      </div>`;
    };

    let html = '';
    sortedKeys.forEach((key, idx) => {
      const groupTasks = groups.get(key);
      if (key !== 'no-due') {
        const { groupLabel: gl, chipClass } = getDueInfo(key);
        const cls = chipClass === 'overdue' ? 'task-group-overdue' : chipClass === 'due-soon' ? 'task-group-soon' : '';
        html += `<div class="task-group-divider${cls ? ' ' + cls : ''}"><span class="task-group-label">${gl}</span></div>`;
      } else if (sortedKeys.length > 1) {
        html += `<div class="task-group-divider task-group-nodue"><span class="task-group-label">No due date</span></div>`;
      }
      html += groupTasks.map(renderItem).join('');
    });
    list.innerHTML = html;
  }

  // ── Supabase helpers ──
  async function fetchTasks() {
    if (!window.sb) return;
    const { data, error } = await window.sb
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[tasks] fetch error:', error); return; }
    tasks = data || [];
    renderTasks();
  }

  async function insertTask(text, priority, due_date, assigned_to) {
    if (!window.sb || !text.trim()) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const { error } = await window.sb.from('tasks').insert({
      id,
      text: text.trim(),
      priority: priority || 'normal',
      due_date: due_date || null,
      assigned_to: assigned_to || null,
      done: false,
    });
    if (error) console.error('[tasks] insert error:', error);
    // realtime will update the list; no need to re-fetch manually
  }

  async function toggleTask(id) {
    if (!window.sb) return;
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const { error } = await window.sb
      .from('tasks')
      .update({ done: !t.done })
      .eq('id', id);
    if (error) console.error('[tasks] toggle error:', error);
  }

  async function deleteTask(id) {
    if (!window.sb) return;
    const { error } = await window.sb.from('tasks').delete().eq('id', id);
    if (error) console.error('[tasks] delete error:', error);
  }

  async function clearDoneTasks() {
    if (!window.sb) return;
    const { error } = await window.sb.from('tasks').delete().eq('done', true);
    if (error) console.error('[tasks] clearDone error:', error);
  }

  // ── Realtime subscription ──
  function subscribeToTasks() {
    if (!window.sb || taskChannel) return;
    taskChannel = window.sb
      .channel('tasks-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks(); // any INSERT / UPDATE / DELETE → re-fetch
      })
      .subscribe();
  }

  // ── Init ──
  function initTaskBoard() {
    fetchTasks();
    subscribeToTasks();

    const input        = $('taskInput');
    const addBtn       = $('taskAddBtn');
    const prioritySel  = $('taskPriority');
    const assigneeSel  = $('taskAssignee');
    const dueDateInput = $('taskDueDate');
    const clearDoneBtn = $('taskClearDone');
    const selectWrap   = prioritySel?.closest('.task-select-wrap');

    const syncSelectColor = () => {
      if (!selectWrap) return;
      selectWrap.classList.remove('priority-high', 'priority-low', 'priority-normal');
      selectWrap.classList.add(`priority-${prioritySel.value}`);
    };
    prioritySel?.addEventListener('change', syncSelectColor);
    syncSelectColor();

    const syncAssigneePlaceholder = () => {
      if (!assigneeSel) return;
      assigneeSel.classList.toggle('placeholder-active', !assigneeSel.value);
    };
    assigneeSel?.addEventListener('change', syncAssigneePlaceholder);
    syncAssigneePlaceholder();

    const doAdd = async () => {
      if (!input || !input.value.trim()) return;
      const text = input.value;
      const priority = prioritySel?.value || 'normal';
      const dueDate = dueDateInput?.value || null;
      const assignedTo = assigneeSel?.value || null;
      input.value = ''; if (input.style) input.style.height = '40px';
      if (dueDateInput) dueDateInput.value = '';
      if (assigneeSel) { assigneeSel.value = ''; syncAssigneePlaceholder(); }
      prioritySel.value = 'normal';
      syncSelectColor();
      input.focus();
      await insertTask(text, priority, dueDate, assignedTo);
    };

    dueDateInput?.addEventListener('click', () => { try { dueDateInput.showPicker(); } catch(_){} });

    addBtn?.addEventListener('click', doAdd);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doAdd(); } });

    $('taskList')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id     = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'check')  await toggleTask(id);
      if (action === 'delete') await deleteTask(id);
    });

    clearDoneBtn?.addEventListener('click', () => clearDoneTasks());

    document.querySelectorAll('.task-pill[data-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        taskFilter = pill.dataset.filter;
        document.querySelectorAll('.task-pill[data-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderTasks();
      });
    });
  }

  // ── Project Snapshot ─────────────────────────
  async function loadProjectSnapshot() {
    const el = document.getElementById('projSnapList');
    if (!el || !window.sb) return;

    const { data, error } = await window.sb
      .from('projects')
      .select('id, project_code, project_name, client_name, status, contract_value, total_revenue, total_cost, total_profit, start_date, end_date, project_manager, is_archived, archived_at')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error || !data?.length) {
      el.innerHTML = `<div class="proj-snap-loading">${error ? 'Could not load projects.' : 'No projects yet.'}</div>`;
      return;
    }

    const safeNum = v => { const n = Number(v); return isFinite(n) ? n : 0; };
    const statusCls = s => {
      const v = String(s || '').toLowerCase();
      if (v === 'active')    return 'ok';
      if (v === 'on hold')   return 'warn';
      if (v === 'completed') return 'sent';
      if (v === 'cancelled') return 'due';
      return 'null';
    };
    const barColor = s => {
      if (s === 'Active')    return '#34d399';
      if (s === 'On Hold')   return '#fbbf24';
      if (s === 'Completed') return '#60a5fa';
      return '#94a3b8';
    };

    // Filter out archived
    const rows = data.filter(r => !r.archived_at && !r.is_archived);

    el.innerHTML = rows.map(p => {
      const revenue   = safeNum(p.total_revenue) || safeNum(p.contract_value);
      const profit    = safeNum(p.total_profit);
      const cost      = safeNum(p.total_cost);
      const margin    = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      const barW      = Math.max(0, Math.min(100, revenue > 0 ? (profit / revenue) * 100 : 0));
      const profitCls = profit > 0 ? 'pos' : profit < 0 ? 'neg' : 'nil';
      const profitTxt = profit === 0 ? '—' : fmt$(profit);
      const manager   = p.project_manager && p.project_manager !== 'Unassigned' ? ` · ${esc(p.project_manager)}` : '';
      const status    = p.status || 'Planned';
      const code      = p.project_code && p.project_code !== 'Auto-generated' ? `${esc(p.project_code)} · ` : '';
      const color     = barColor(status);

      return `
        <a class="proj-snap-item" href="/projects" data-status="${esc(status)}">
          <div class="proj-snap-left">
            <div class="proj-snap-name">${esc(p.project_name || 'Untitled')}</div>
            <div class="proj-snap-meta">${code}${esc(p.client_name || '—')}${manager}</div>
            <div class="proj-snap-bar-wrap">
              <div class="proj-snap-bar" style="width:${barW}%;--bar-color:${color};"></div>
            </div>
          </div>
          <div class="proj-snap-right">
            <span class="proj-snap-status ${statusCls(status)}">${esc(status)}</span>
            <span class="proj-snap-profit ${profitCls}" title="Profit · ${margin}% margin">${profitTxt}</span>
          </div>
        </a>`;
    }).join('');
  }

  // ── Dashboard Projects Table ───────────────────
  async function loadDashProjectsTable() {
    const tbody = document.getElementById('dashProjBody');
    if (!tbody || !window.sb) return;

    const { data, error } = await window.sb
      .from('projects')
      .select('id, project_code, project_name, client_name, status, contract_value, total_revenue, total_cost, start_date, end_date')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error || !data?.length) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">${error ? 'Could not load projects.' : 'No projects yet.'}</td></tr>`;
      return;
    }

    const fmt = v => { const n = Number(v); return isFinite(n) && n !== 0 ? '$' + n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}) : '—'; };
    const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
    const statusCls = s => { switch((s||'').toLowerCase()){case 'active':return 'ok';case 'completed':return 'sent';case 'on hold':return 'warn';case 'cancelled':return 'due';default:return 'null';} };

    tbody.innerHTML = data.map(p => `
      <tr data-id="${encodeURIComponent(p.id)}" style="cursor:pointer;">
        <td>${esc(p.project_code || '—')}</td>
        <td><span class="dash-proj-name">${esc(p.project_name || '—')}</span></td>
        <td>${esc(p.client_name || '—')}</td>
        <td><span class="tag ${statusCls(p.status)}">${esc(p.status || '—')}</span></td>
        <td>${fmt(p.contract_value)}</td>
        <td>${fmt(p.total_revenue)}</td>
        <td>${fmt(p.total_cost)}</td>
        <td>${fmtDate(p.start_date)}</td>
        <td>${fmtDate(p.end_date)}</td>
      </tr>`).join('');

    tbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (tr) window.location.href = `./projects.html?open=${tr.dataset.id}`;
    });
  }

  // ── Init ──────────────────────────────────────
  async function init() {
    initTaskBoard();

    // Expense row click → open view modal on expenses page
    const expList = $('upcomingExpList');
    if (expList) {
      expList.addEventListener('click', e => {
        const row = e.target.closest('.dash-exp-row[data-id]');
        if (row) window.location.href = `/expenses?open=${encodeURIComponent(row.dataset.id)}`;
      });
    }

    try {
      await Promise.all([
        loadKPIs(),
        loadAttention(),
        loadRecentInvoices(),
        loadPipeline(),
        loadUpcomingExpenses(),
        loadProjectSnapshot(),
        loadDashProjectsTable(),
      ]);
    } catch (e) {
      console.error('[dashboard] init error:', e);
    } finally {
      const loader = $('contentLoader');
      if (loader) { loader.classList.add('hidden'); setTimeout(() => loader.remove(), 400); }
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
