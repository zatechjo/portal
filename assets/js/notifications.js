// NOTIFICATIONS — overdue tasks & unpaid past-due expenses
(function () {
  const POLL_MS = 5 * 60 * 1000;
  const EXP_STATUSES = ['Paid', 'Unpaid', 'Partial Payment', 'Upcoming', 'Null'];

  let allItems = [];
  let ui = null;

  function waitForSb(cb) {
    if (window.sb) { cb(); return; }
    const t = setInterval(() => { if (window.sb) { clearInterval(t); cb(); } }, 200);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ── Quick-action modal ── */
  function buildQuickModal() {
    const el = document.createElement('div');
    el.className = 'nq-overlay';
    el.id = 'notifyQuickModal';
    el.innerHTML = `
      <div class="nq-modal">
        <button class="nq-close" id="nqClose">&#x2715;</button>
        <div class="nq-icon-wrap" id="nqIcon"></div>
        <div class="nq-label" id="nqLabel"></div>
        <div class="nq-sub" id="nqSub"></div>
        <div class="nq-body" id="nqBody"></div>
        <div class="nq-footer" id="nqFooter"></div>
      </div>
    `;
    document.body.appendChild(el);

    el.addEventListener('click', (e) => { if (e.target === el) closeQuickModal(); });
    document.getElementById('nqClose').addEventListener('click', closeQuickModal);
  }

  function openQuickModal(item) {
    const overlay = document.getElementById('notifyQuickModal');
    document.getElementById('nqIcon').innerHTML = item.type === 'task'
      ? '<span class="nq-icon nq-icon-task">&#10003;</span>'
      : '<span class="nq-icon nq-icon-expense">&#36;</span>';
    document.getElementById('nqLabel').textContent = item.label;
    document.getElementById('nqSub').textContent = item.sub;

    const body = document.getElementById('nqBody');
    const footer = document.getElementById('nqFooter');

    if (item.type === 'expense') {
      const details = [
        item.client      ? `<div class="nq-meta-row"><span class="nq-meta-key">Client</span><span class="nq-meta-val">${item.client}</span></div>` : '',
        item.description ? `<div class="nq-meta-row"><span class="nq-meta-key">Description</span><span class="nq-meta-val">${item.description}</span></div>` : '',
      ].join('');
      body.innerHTML = `
        ${details ? `<div class="nq-meta">${details}</div>` : ''}
        <label class="nq-field-label">Update Status</label>
        <div class="nq-status-grid">
          ${EXP_STATUSES.map(s => `
            <button class="nq-status-btn${item.currentStatus === s ? ' active' : ''}" data-status="${s}">${s}</button>
          `).join('')}
        </div>
      `;
      footer.innerHTML = `<button class="nq-save-btn" id="nqSave">Save</button>`;

      let selected = item.currentStatus;
      body.querySelectorAll('.nq-status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          body.querySelectorAll('.nq-status-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selected = btn.dataset.status;
        });
      });

      document.getElementById('nqSave').addEventListener('click', async () => {
        const saveBtn = document.getElementById('nqSave');
        saveBtn.textContent = 'Saving…';
        saveBtn.disabled = true;
        const rawId = item.id.replace('exp-', '');
        const { error } = await window.sb.from('expenses').update({ status: selected }).eq('id', rawId);
        if (error) {
          saveBtn.textContent = 'Error — try again';
          saveBtn.disabled = false;
          return;
        }
        item.currentStatus = selected;
        // dismiss from notifications if paid
        if (selected.toLowerCase() === 'paid') {
          const dismissed = getDismissed();
          dismissed.add(item.id);
          saveDismissed(dismissed);
        }
        closeQuickModal();
        await refresh();
      });

    } else if (item.type === 'task') {
      body.innerHTML = `<p class="nq-task-msg">Mark this task as done?</p>`;
      footer.innerHTML = `<button class="nq-save-btn" id="nqSave">Mark Done</button>`;

      document.getElementById('nqSave').addEventListener('click', async () => {
        const saveBtn = document.getElementById('nqSave');
        saveBtn.textContent = 'Saving…';
        saveBtn.disabled = true;
        const rawId = item.id.replace('task-', '');
        const { error } = await window.sb.from('tasks').update({ done: true }).eq('id', rawId);
        if (error) {
          saveBtn.textContent = 'Error — try again';
          saveBtn.disabled = false;
          return;
        }
        const dismissed = getDismissed();
        dismissed.add(item.id);
        saveDismissed(dismissed);
        closeQuickModal();
        await refresh();
      });
    }

    overlay.classList.add('open');
    // close notification panel
    document.querySelector('.notify-wrap')?.classList.remove('open');
  }

  function closeQuickModal() {
    document.getElementById('notifyQuickModal')?.classList.remove('open');
  }

  /* ── Panel ── */
  function buildPanel() {
    const btn = document.getElementById('notifyBtn');
    if (!btn) return null;

    const wrap = document.createElement('div');
    wrap.className = 'notify-wrap';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    const badge = document.createElement('span');
    badge.className = 'notify-badge';
    badge.style.display = 'none';
    wrap.appendChild(badge);

    const panel = document.createElement('div');
    panel.className = 'notify-panel';
    panel.innerHTML = `
      <div class="notify-panel-head">
        <span class="notify-panel-title">Notifications</span>
        <button class="notify-clear-btn" id="notifyClearBtn">Clear all</button>
      </div>
      <ul class="notify-list" id="notifyList"></ul>
    `;
    wrap.appendChild(panel);

    btn.addEventListener('click', (e) => { e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
    document.getElementById('notifyClearBtn').addEventListener('click', (e) => { e.stopPropagation(); dismissAll(); });

    return { badge };
  }

  /* ── Dismissed store ── */
  const STORE_KEY = 'portal_notif_dismissed_v1';
  function getDismissed() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function saveDismissed(set) {
    localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
  }
  function dismissAll() {
    const dismissed = getDismissed();
    document.querySelectorAll('#notifyList [data-nid]').forEach(el => dismissed.add(el.dataset.nid));
    saveDismissed(dismissed);
    renderItems([]);
  }

  /* ── Fetch ── */
  async function fetchItems() {
    const today = todayISO();
    const [taskRes, expRes] = await Promise.all([
      window.sb.from('tasks').select('id, text, due_date').eq('done', false).lt('due_date', today),
      window.sb.from('expenses').select('id, vendor, description, client_name, expense_date, status').lt('expense_date', today),
    ]);

    const items = [];

    (taskRes.data || []).forEach(t => {
      const daysAgo = Math.round((new Date(today) - new Date(t.due_date)) / 86400000);
      items.push({ id: 'task-' + t.id, type: 'task', label: t.text || 'Untitled task', sub: `Overdue by ${daysAgo} day${daysAgo !== 1 ? 's' : ''}` });
    });

    (expRes.data || []).forEach(e => {
      const s = (e.status || '').toLowerCase();
      if (s === 'paid' || s === 'null') return;
      const daysAgo = Math.round((new Date(today) - new Date(e.expense_date)) / 86400000);
      items.push({ id: 'exp-' + e.id, type: 'expense', label: e.vendor || e.description || 'Expense', description: e.description || '', client: e.client_name || '', sub: `${e.status || 'Unpaid'} · ${daysAgo} day${daysAgo !== 1 ? 's' : ''} past due`, currentStatus: e.status || 'Unpaid' });
    });

    return items;
  }

  /* ── Render ── */
  function renderItems(items) {
    if (!ui) return;
    const dismissed = getDismissed();
    const visible = items.filter(i => !dismissed.has(i.id));
    allItems = items;

    const list = document.getElementById('notifyList');
    if (!list) return;

    ui.badge.style.display = visible.length ? '' : 'none';
    ui.badge.textContent = visible.length > 99 ? '99+' : visible.length;

    if (!visible.length) {
      list.innerHTML = `<li class="notify-empty">All clear — nothing overdue</li>`;
      return;
    }

    list.innerHTML = visible.map(item => `
      <li class="notify-item notify-${item.type}" data-nid="${item.id}">
        <button class="notify-item-body" data-nid="${item.id}">
          <span class="notify-icon">${item.type === 'task' ? '&#10003;' : '&#36;'}</span>
          <span class="notify-text">
            <span class="notify-label">${item.label}</span>
            ${item.type === 'expense' && item.client ? `<span class="notify-detail">Client: ${item.client}</span>` : ''}
            ${item.type === 'expense' && item.description ? `<span class="notify-detail">${item.description}</span>` : ''}
            <span class="notify-sub">${item.sub}</span>
          </span>
        </button>
        <button class="notify-dismiss" data-nid="${item.id}" title="Dismiss">&#x2715;</button>
      </li>
    `).join('');

    list.querySelectorAll('.notify-item-body').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nid = btn.dataset.nid;
        const item = allItems.find(i => i.id === nid);
        if (item) openQuickModal(item);
      });
    });

    list.querySelectorAll('.notify-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dismissed = getDismissed();
        dismissed.add(btn.dataset.nid);
        saveDismissed(dismissed);
        btn.closest('li').remove();
        const remaining = list.querySelectorAll('.notify-item').length;
        ui.badge.style.display = remaining ? '' : 'none';
        ui.badge.textContent = remaining;
        if (!remaining) list.innerHTML = `<li class="notify-empty">All clear — nothing overdue</li>`;
      });
    });
  }

  async function refresh() {
    const items = await fetchItems();
    renderItems(items);
  }

  /* ── Init ── */
  async function init() {
    ui = buildPanel();
    if (!ui) return;
    buildQuickModal();
    await refresh();
    setInterval(refresh, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForSb(init));
  } else {
    waitForSb(init);
  }
})();
