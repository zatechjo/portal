// assets/js/clients.js — Supabase-powered Clients
import { sb } from './supabase.js';

const $ = (s, el=document) => el.querySelector(s);
const tbody = $('#clients-tbody');

const pills = document.querySelectorAll('.pill');
let currentFilter = 'All';
let rows = [];
let current = null;

// ---------- Load & render ----------
async function fetchClients() {
  const { data, error } = await sb
    .from('clients')
    .select('id, client_no, name, email, phone, address, notes, contact_name, joined, status, sector, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  rows = data || [];  
  renderTable();
}

function renderTable() {
  if (!tbody) return;
  const list = rows.filter(r =>
    currentFilter === 'All' ? true : (r.status || 'Active') === currentFilter
  );

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${escapeHTML(c.client_no || '—')}</td>
      <td>${escapeHTML(c.name)}</td>
      <td>${escapeHTML(c.contact_name || '—')}</td>
      <td><span class="value-clip">${escapeHTML(c.phone || '—')}</span></td>
      <td>${c.joined || '—'}</td>
      <td>${escapeHTML(c.address || '—')}</td>
      <td>0</td>
      <td class="row-actions">
        <button class="mini more-info" data-id="${c.id}">More Info →</button>
      </td>
    </tr>
  `).join('');
}


function escapeHTML(s) {
  return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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

  invoicesTbody.innerHTML = ''; // (wire later)
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

  editBtn.style.display = 'none';
  actionsBar.style.display = 'flex';
}

function openCreate() {
  current = null;
  modal.classList.add('editing'); err.textContent = '';
  nameInput.value = '';
  Object.values(inputs).forEach(i => i.value = '');
  inputs.status.value = 'Active';
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
  const payload = {
    client_no:  inputs.client_no.value.trim() || null,
    name:       nameInput.value.trim(),
    contact_name: inputs.contact.value.trim(),
    email:      inputs.email.value.trim(),
    phone:      inputs.phone.value.trim(),
    joined:     inputs.joined.value || null,
    status:     inputs.status.value || 'Active',
    address:    inputs.address.value.trim(),
    sector:     inputs.sector.value.trim(),
    notes:      inputs.notes.value.trim(),
  };

  if (!payload.name || !payload.email.includes('@')) {
    err.textContent = 'Client name and a valid email are required.'; return;
  }

  if (current) {
    const { error } = await sb.from('clients').update(payload).eq('id', current.id);
    if (error) { err.textContent = error.message; return; }
  } else {
    const { error } = await sb.from('clients').insert([payload]);
    if (error) { err.textContent = error.message; return; }
  }

  await fetchClients();
  current = rows.find(r => r.client_no === payload.client_no) || rows.find(r => r.email === payload.email) || null;
  if (current) openView(current); else closeModal();
});

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', fetchClients);
