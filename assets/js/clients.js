// assets/js/clients.js — Supabase-powered Clients (with auto client_no)
import { sb } from './supabase.js';

const $ = (s, el=document) => el.querySelector(s);
const tbody = $('#clients-tbody');

const pills = document.querySelectorAll('.pill');
let currentFilter = 'All';
let rows = [];
let current = null;

// NEW: hold invoice counts per client_id
let invoiceCounts = new Map();

// ---------- Load helpers ----------
async function fetchInvoiceCounts() {
  // Pull only the client_id to minimize payload; count per client in JS.
  const { data, error } = await sb
    .from('invoices')
    .select('client_id'); // all-time
  if (error) {
    console.error('[clients] fetchInvoiceCounts error:', error);
    invoiceCounts = new Map();
    return;
  }
  const map = new Map();
  (data || []).forEach(r => {
    const k = r.client_id;
    map.set(k, (map.get(k) || 0) + 1);
  });
  invoiceCounts = map;
}

// ---------- Load & render ----------
async function fetchClients() {
  const { data, error } = await sb
    .from('clients')
    .select('id, client_no, name, email, phone, address, notes, contact_name, joined, status, sector, created_at, updated_at')
    .order('client_no', { ascending: true });   // 👈 ascending IDs
  if (error) { console.error(error); return; }

  rows = data || [];

  // NEW: also fetch invoice counts before first render
  await fetchInvoiceCounts();

  renderTable();
}

// ===== Generate next client_no like "ZAC0038" by scanning current table =====
async function getNextClientNo(prefix = 'ZAC', pad = 4){
  const { data, error } = await sb
    .from('clients')
    .select('client_no'); // pull all to be safe; optimize later if needed

  if (error) {
    console.error('[clients] getNextClientNo error:', error);
    // fallback to first number
    return `${prefix}${String(1).padStart(pad, '0')}`;
  }

  let maxNum = 0;
  for (const row of (data || [])) {
    const raw = (row.client_no || '').toString().trim();
    if (!raw.startsWith(prefix)) continue;
    const digits = raw.replace(/^\D+/, ''); // strip non-digits at start
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }

  const next = maxNum + 1;
  return `${prefix}${String(next).padStart(pad, '0')}`;
}

function renderTable() {
  if (!tbody) return;
  const list = rows.filter(r =>
    currentFilter === 'All' ? true : (r.status || 'Active') === currentFilter
  );

  tbody.innerHTML = list.map(c => {
    const invCount = invoiceCounts.get(c.id) ?? 0;
    return `
      <tr>
        <td>${escapeHTML(c.client_no || '—')}</td>
        <td>${escapeHTML(c.name)}</td>
        <td>${escapeHTML(c.contact_name || '—')}</td>
        <td><span class="value-clip">${escapeHTML(c.phone || '—')}</span></td>
        <td>${c.joined || '—'}</td>
        <td>${escapeHTML(c.address || '—')}</td>
        <td>${invCount}</td>
        <td class="row-actions">
          <button class="mini more-info" data-id="${c.id}">More Info →</button>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHTML(s) {
  return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function formatMoneyUSD(n) {
  const num = Number(n ?? 0);
  return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateLong(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return d; }
}

// Match Dues’ tag classes (sent/ok/due/warn/null)  ⬅ pulled from dues.js
function duesStatusPill(statusRaw) {
  const s = String(statusRaw || '').toLowerCase();
  let cls = 'tag null', label = s || '—';
  if (s === 'upcoming') { cls = 'tag sent'; label = 'upcoming'; }
  else if (s === 'paid') { cls = 'tag ok'; label = 'paid'; }
  else if (s === 'overdue') { cls = 'tag due'; label = 'overdue'; }
  else if (s === 'partial') { cls = 'tag warn'; label = 'partial'; }
  return `<span class="${cls}" aria-label="Status: ${label}">${label}</span>`;
}

function formatMoney(n) {
  const num = Number(n ?? 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

// Match the Dues pill look (class names mirror our badge style)
function statusPillHTML(statusRaw) {
  const s = (statusRaw || '').toLowerCase();
  let cls = 'pill-status neutral', label = '—';
  if (s === 'paid')    { cls = 'pill-status ok';       label = 'Paid'; }
  else if (s === 'unpaid') { cls = 'pill-status warn';     label = 'Unpaid'; }
  else if (s === 'overdue') { cls = 'pill-status danger';  label = 'Overdue'; }
  else if (s === 'draft')   { cls = 'pill-status muted';   label = 'Draft'; }
  else { label = statusRaw || '—'; }
  return `<span class="${cls}" aria-label="Status: ${label}">${label}</span>`;
}

// ---------- Filtering pills ----------
pills.forEach(pill => {
  pill.addEventListener('click', () => {
    pills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.textContent.trim(); // "All" | "Active" | "Paused"
    renderTable();
  });
});

// ---------- Modal refs ----------
const modal = $('#client-modal');
const closeX = modal.querySelector('.close');
const invoicesTbody = modal.querySelector('#client-invoices tbody');

const disp = {
  nameText: $('#client-name-text', modal),
  clientNo: $('#client-no', modal),
  contact:  $('#client-contact', modal),
  email:    $('#client-email', modal),
  phone:    $('#client-phone', modal),
  joined:   $('#client-joined', modal),
  status:   $('#client-status', modal),
  address:  $('#client-address', modal),
  sector:   $('#client-sector', modal),
  notes:    $('#client-notes', modal),
};

// edit inputs
const nameInput = $('#client-name-input', modal);
const inputs = {
  client_no: $('#client-no-input', modal),
  contact:   $('#client-contact-input', modal),
  email:     $('#client-email-input', modal),
  phone:     $('#client-phone-input', modal),
  joined:    $('#client-joined-input', modal),
  status:    $('#client-status-input', modal),
  address:   $('#client-address-input', modal),
  sector:    $('#client-sector-input', modal),
  notes:     $('#client-notes-input', modal),
};

const editBtn   = $('#editClientBtn');
const saveBtn   = $('#saveClientBtn');
const cancelBtn = $('#cancelEditBtn');
const err       = $('#clientEditError');
const actionsBar= $('#client-edit-actions');
const newBtn    = $('#newClientBtn');

// ---------- Open rows / modal ----------
tbody?.addEventListener('click', (e) => {
  const btn = e.target.closest('button.more-info');
  if (!btn) return;
  const id = btn.dataset.id;
  current = rows.find(r => r.id === id);
  if (current) openView(current);
});

async function loadClientInvoices(clientId) {
  // Last 12 months window
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
  invoicesTbody.innerHTML = `<tr><td colspan="5" class="muted">Loading…</td></tr>`;

  const { data, error } = await sb
    .from('invoices')
    .select('id, invoice_no, issue_date, subtotal, status, pdf_url')
    .eq('client_id', clientId)
    .gte('issue_date', cutoff.toISOString())
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('[clients] loadClientInvoices error:', error);
    invoicesTbody.innerHTML = `<tr><td colspan="5" class="muted">Couldn’t load invoices.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    invoicesTbody.innerHTML = `<tr><td colspan="5" class="muted">No invoices in the last 12 months.</td></tr>`;
    return;
  }

  invoicesTbody.innerHTML = data.map(inv => {
    const dateTxt = formatDateLong(inv.issue_date);               // e.g., September 16, 2024
    const totalTxt = formatMoneyUSD(inv.subtotal);                 // $X,XXX.XX
    const statusEl = duesStatusPill(inv.status);                   // Dues-style pill
    const pdf = inv.pdf_url
      ? `<a class="mini" href="${inv.pdf_url}" target="_blank" rel="noopener">View</a>`
      : `<button class="mini" disabled style="opacity:.55;cursor:default;">No PDF</button>`;

    return `
      <tr>
        <td>${escapeHTML(inv.invoice_no || '—')}</td>
        <td>${dateTxt}</td>
        <td>${totalTxt}</td>
        <td>${statusEl}</td>
        <td class="row-actions">${pdf}</td>
      </tr>
    `;
  }).join('');
}

function openView(c) {
  modal.classList.remove('editing'); err.textContent = '';
  disp.nameText.textContent = c.name || '—';
  disp.clientNo.textContent = c.client_no || '—';
  disp.contact.textContent  = c.contact_name || '—';
  disp.email.textContent    = c.email || '—';
  disp.phone.textContent    = c.phone || '—';
  disp.joined.textContent   = c.joined || '—';
  disp.status.textContent   = c.status || '—';
  disp.address.textContent  = c.address || '—';
  disp.sector.textContent   = c.sector || '—';
  disp.notes.textContent    = c.notes || '—';

  invoicesTbody.innerHTML = ''; // (future: show latest invoices)
  loadClientInvoices(c.id);

  editBtn.style.display = 'inline-flex';
  actionsBar.style.display = 'none';
  modal.classList.add('show');
}

function openEdit(c) {
  modal.classList.add('editing'); err.textContent = '';
  nameInput.value       = c.name || '';
  inputs.client_no.value= c.client_no || '';
  inputs.contact.value  = c.contact_name || '';
  inputs.email.value    = c.email || '';
  inputs.phone.value    = c.phone || '';
  inputs.joined.value   = c.joined || '';
  inputs.status.value   = c.status || 'Active';
  inputs.address.value  = c.address || '';
  inputs.sector.value   = c.sector || '';
  inputs.notes.value    = c.notes || '';

  // DISABLE client_no editing in Edit mode
  if (inputs.client_no) {
    inputs.client_no.disabled = true;
    inputs.client_no.readOnly = true;
    // Optional: hide the field's row if you prefer
    // inputs.client_no.closest('.form-row')?.style.setProperty('display','none');
  }

  editBtn.style.display = 'none';
  actionsBar.style.display = 'flex';
}

function openCreate() {
  current = null;
  modal.classList.add('editing'); err.textContent = '';
  nameInput.value = '';
  Object.values(inputs).forEach(i => i.value = '');
  inputs.status.value = 'Active';

  // DISABLE client_no in Create (will be auto-generated on Save)
  if (inputs.client_no) {
    inputs.client_no.disabled = true;
    inputs.client_no.readOnly = true;
    // Optional: hide the field's row if you prefer
    // inputs.client_no.closest('.form-row')?.style.setProperty('display','none');
  }

  editBtn.style.display = 'none';
  actionsBar.style.display = 'flex';
  disp.nameText.textContent = 'New Client';
  invoicesTbody.innerHTML = '';
  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show', 'editing');
  err.textContent = '';
}

// ---------- Buttons ----------
editBtn?.addEventListener('click', () => { if (current) openEdit(current); });
newBtn?.addEventListener('click', openCreate);
cancelBtn?.addEventListener('click', () => current ? openView(current) : closeModal());
closeX?.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ---------- Save (create or update) ----------
saveBtn?.addEventListener('click', async () => {
  err.textContent = '';

  // Base payload — no client_no here (we auto-generate on insert)
  const basePayload = {
    name:         nameInput.value.trim(),
    contact_name: inputs.contact.value.trim(),
    email:        inputs.email.value.trim(),
    phone:        inputs.phone.value.trim(),
    joined:       inputs.joined.value || null,
    status:       inputs.status.value || 'Active',
    address:      inputs.address.value.trim(),
    sector:       inputs.sector.value.trim(),
    notes:        inputs.notes.value.trim(),
  };

  if (!basePayload.name || !basePayload.email.includes('@')) {
    err.textContent = 'Client name and a valid email are required.'; return;
  }

  try {
    if (current) {
      // UPDATE: do NOT touch client_no
      const { error } = await sb.from('clients').update(basePayload).eq('id', current.id);
      if (error) throw error;

      await fetchClients();
      current = rows.find(r => r.id === current.id) || null;
      if (current) openView(current); else closeModal();
    } else {
      // INSERT: generate next client_no
      const nextNo = await getNextClientNo('ZAC', 4);
      const payload = { ...basePayload, client_no: nextNo };

      const { data: inserted, error } = await sb
        .from('clients')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      current = rows.find(r => r.id === inserted.id) || rows.find(r => r.client_no === nextNo) || null;
      if (current) openView(current); else closeModal();
    }
  } catch (e) {
    console.error('[clients] save error:', e);
    err.textContent = e?.message || 'Failed to save client.';
  }
});

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', fetchClients);
