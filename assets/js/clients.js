// assets/js/clients.js  (FULL REPLACEMENT)
document.addEventListener('DOMContentLoaded', () => {
  const LS_KEY = 'zatech_clients_v1';

  // ---------- Data load/save ----------
  function loadClients() {
    const fromLS = localStorage.getItem(LS_KEY);
    if (fromLS) return JSON.parse(fromLS);        // { [clientName]: clientObj }

    // Seed from mock-data.js (global clientsData)
    if (window.clientsData) {
      // ensure structure is an object keyed by client name
      localStorage.setItem(LS_KEY, JSON.stringify(window.clientsData));
      return JSON.parse(JSON.stringify(window.clientsData));
    }
    return {};
  }
  function saveClients(obj) { localStorage.setItem(LS_KEY, JSON.stringify(obj)); }

  let store = loadClients();

  // ---------- Table render ----------
  const tbody = document.getElementById('clients-tbody');
  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.values(store).forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.name || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.contactName || '—'}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.joined || '—'}</td>
        <td>${c.country || '—'}</td>
        <td>${(c.invoices && c.invoices.length) || 0}</td>
        <td class="row-actions">
          <button class="mini more-info" data-name="${c.name}">More Info →</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }
  renderTable();

  // ---------- Modal refs ----------
  const modal = document.getElementById('client-modal');
  const closeX = modal.querySelector('.close');
  const invoicesTbody = modal.querySelector('#client-invoices tbody');

  // display spans
  const disp = {
    nameText: modal.querySelector('#client-name-text'),
    contact: modal.querySelector('#client-contact'),
    email: modal.querySelector('#client-email'),
    phone: modal.querySelector('#client-phone'),
    country: modal.querySelector('#client-country'),
    joined: modal.querySelector('#client-joined'),
    status: modal.querySelector('#client-status'),
    address: modal.querySelector('#client-address'),
    sector: modal.querySelector('#client-sector'),
    notes: modal.querySelector('#client-notes'),
  };

  // edit inputs (including NEW client-name-input)
  const nameInput   = modal.querySelector('#client-name-input');
  const inputs = {
    contact: modal.querySelector('#client-contact-input'),
    email: modal.querySelector('#client-email-input'),
    phone: modal.querySelector('#client-phone-input'),
    country: modal.querySelector('#client-country-input'),
    joined: modal.querySelector('#client-joined-input'),
    status: modal.querySelector('#client-status-input'),
    address: modal.querySelector('#client-address-input'),
    sector: modal.querySelector('#client-sector-input'),
    notes: modal.querySelector('#client-notes-input'),
  };

  const editBtn   = document.getElementById('editClientBtn');
  const saveBtn   = document.getElementById('saveClientBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const err       = document.getElementById('clientEditError');

  const actionsBar = document.getElementById('client-edit-actions');

  let currentKey = null; // current key in store (old client name)
  let mode = 'view';     // 'view' | 'edit' | 'create'

  function fillInvoices(list = []) {
    invoicesTbody.innerHTML = '';
    list.forEach(inv => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${inv.id}</td>
        <td>${inv.date}</td>
        <td>${inv.total}</td>
        <td>${inv.status}</td>
        <td class="row-actions"><button class="mini view-invoice" data-invoice="${inv.id}">View →</button></td>`;
      invoicesTbody.appendChild(tr);
    });
  }

  function openModalView(client) {
    mode = 'view';
    modal.classList.remove('editing');
    err.textContent = '';

    disp.nameText.textContent = client.name || '—';
    if (nameInput) nameInput.value = client.name || '';

    disp.contact.textContent = client.contactName || '—';
    disp.email.textContent   = client.email || '—';
    disp.phone.textContent   = client.phone || '—';
    disp.country.textContent = client.country || '—';
    disp.joined.textContent  = client.joined || '—';
    disp.status.textContent  = client.status || '—';
    disp.address.textContent = client.address || '—';
    disp.sector.textContent  = client.sector || '—';
    disp.notes.textContent   = client.notes || '—';

    fillInvoices(client.invoices || []);

    editBtn.style.display = 'inline-flex';
    actionsBar.style.display = 'none';

    modal.classList.add('show');
  }

  function openModalEdit(client) {
    mode = 'edit';
    modal.classList.add('editing');
    err.textContent = '';

    if (nameInput) nameInput.value = client.name || '';

    inputs.contact.value  = client.contactName || '';
    inputs.email.value    = client.email || '';
    inputs.phone.value    = client.phone || '';
    inputs.country.value  = client.country || '';
    inputs.joined.value   = client.joined || '';
    inputs.status.value   = client.status || 'Active';
    inputs.address.value  = client.address || '';
    inputs.sector.value   = client.sector || '';
    inputs.notes.value    = client.notes || '';

    editBtn.style.display = 'none';
    actionsBar.style.display = 'flex';
  }

  function openModalCreate() {
    mode = 'create';
    currentKey = null;
    disp.nameText.textContent = 'New Client';
    fillInvoices([]);

    if (nameInput) nameInput.value = '';
    Object.values(inputs).forEach(el => el.value = '');

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

  // ---------- Row: open modal in view ----------
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button.more-info');
    if (!btn) return;
    const key = btn.dataset.name;
    const client = store[key];
    if (!client) return;
    currentKey = key;
    openModalView(client);
  });

  // Invoices: link out (still static)
  invoicesTbody.addEventListener('click', (e) => {
    const b = e.target.closest('button.view-invoice');
    if (!b) return;
    const invoiceId = b.dataset.invoice;
    closeModal();
    location.href = './invoices.html#' + invoiceId;
  });

  // Edit button -> edit mode
  editBtn.addEventListener('click', () => {
    if (!currentKey) return;
    openModalEdit(store[currentKey]);
  });

  // Save (edit or create)
  saveBtn.addEventListener('click', () => {
    const newName = (nameInput ? nameInput.value.trim() : '').trim();
    const email   = inputs.email.value.trim();

    if (mode === 'create') {
      if (!newName || !email || !email.includes('@')) {
        err.textContent = 'Client name and a valid email are required.';
        return;
      }
      if (store[newName]) {
        err.textContent = 'A client with this name already exists.';
        return;
      }
      const newClient = {
        name: newName,
        contactName: inputs.contact.value.trim(),
        email,
        phone: inputs.phone.value.trim(),
        country: inputs.country.value.trim(),
        joined: inputs.joined.value,
        status: inputs.status.value,
        address: inputs.address.value.trim(),
        sector: inputs.sector.value.trim(),
        notes: inputs.notes.value.trim(),
        invoices: []
      };
      store[newName] = newClient;
      saveClients(store);
      renderTable();
      closeModal();
      alert('Client added.');
      return;
    }

    // EDIT mode
    const client = store[currentKey];
    if (!client) return;

    if (!email || !email.includes('@')) {
      err.textContent = 'Please enter a valid email.';
      return;
    }

    // Apply field updates
    client.contactName = inputs.contact.value.trim();
    client.email       = email;
    client.phone       = inputs.phone.value.trim();
    client.country     = inputs.country.value.trim();
    client.joined      = inputs.joined.value;
    client.status      = inputs.status.value;
    client.address     = inputs.address.value.trim();
    client.sector      = inputs.sector.value.trim();
    client.notes       = inputs.notes.value.trim();

    // Handle rename (key change) if Client Name changed
    const finalName = newName || client.name || currentKey;
    if (finalName !== currentKey) {
      if (store[finalName]) {
        err.textContent = 'Another client already uses that name.';
        return;
      }
      client.name = finalName;
      // move key
      delete store[currentKey];
      store[finalName] = client;
      currentKey = finalName;
    } else {
      client.name = finalName;
      store[currentKey] = client;
    }

    saveClients(store);
    renderTable();
    openModalView(client); // back to view mode
  });

  // Cancel
  cancelBtn.addEventListener('click', () => {
    if (mode === 'create') {
      closeModal();
    } else if (currentKey) {
      openModalView(store[currentKey]);
    }
  });

  // New Client button (top-right)
  const newBtn = document.getElementById('newClientBtn');
  if (newBtn) newBtn.addEventListener('click', openModalCreate);

  // Close behavior
  closeX.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
});


function setTextAndTitle(el, text) {
  el.textContent = text || '—';
  el.title = text || ''; // shows full value on hover
}

function fitText(el, {min=12, max=16} = {}) {
  if (!el) return;
  // reset first
  el.style.fontSize = '';
  let size = Math.min(max, parseFloat(getComputedStyle(el).fontSize) || max);
  // shrink stepwise until it fits or we hit min
  while (el.scrollWidth > el.clientWidth && size > min) {
    size -= 1;
    el.style.fontSize = size + 'px';
  }
}
