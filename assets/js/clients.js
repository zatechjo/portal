// assets/js/clients.js  (FULL REPLACEMENT)
document.addEventListener('DOMContentLoaded', () => {

  const LS_KEY = 'zatech_clients_v3';
  const forceReseed = new URLSearchParams(location.search).has('seed');

  // ---------- LocalStorage helpers ----------
  function loadClients() {
    if (forceReseed) return {};
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (_) {
      // Corrupted store → reset
      localStorage.removeItem(LS_KEY);
      return {};
    }
  }
  function saveClients(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  }

  let store = loadClients();
  if (Object.keys(store).length === 0) {
    const dummyArr = [
      {
        name: "Acme LLC",
        contactName: "Lina Faris",
        email: "lina@acme.com",
        phone: "+962-7-1234-5678",
        country: "Jordan",
        joined: "2025-08-01",
        status: "Active",
        address: "Amman, 4th Circle",
        sector: "Retail",
        notes: "Priority client.",
        invoices: [
          { id: "INV-2025-0001", date: "2025-08-10", total: "$1,200", status: "Paid" },
          { id: "INV-2025-0007", date: "2025-08-18", total: "$950", status: "Sent" }
        ]
      },
      {
        name: "Riada Co",
        contactName: "Omar Suleiman",
        email: "omar@riada.co",
        phone: "+962-7-9876-5432",
        country: "Jordan",
        joined: "2025-07-15",
        status: "Active",
        address: "Aqaba", 
        sector: "Tech",
        notes: "Quarterly billing.",
        invoices: []
      },
      {
        name: "Nasma Group",
        contactName: "Jennifer Flynn",
        email: "jen@nasma.com",
        phone: "+966-5-2222-1111",
        country: "Saudi Arabia",
        joined: "2025-06-05",
        status: "Paused",
        address: "Riyadh",
        sector: "Manufacturing",
        notes: "Two late payments this year.",
        invoices: [ { id: "INV-2025-0020", date: "2025-07-01", total: "$500", status: "Due" } ]
      },
      {
        name: "Futura Ltd",
        contactName: "Sara Jabari",
        email: "sara@futura.io",
        phone: "+971-50-123-4567",
        country: "UAE",
        joined: "2025-05-20",
        status: "Active",
        address: "Dubai Marina",
        sector: "Fintech",
        notes: "New client.",
        invoices: []
      },
      {
        name: "Pixel Dynamics",
        contactName: "Ali Hassan",
        email: "ali@pixel.io",
        phone: "+962-7-1111-2222",
        country: "Jordan",
        joined: "2025-04-11",
        status: "Active",
        address: "Irbid",
        sector: "Design",
        notes: "", 
        invoices: []
      },
      {
        name: "Zenith SA",
        contactName: "Marwa Qasim",
        email: "marwa@zenith.sa",
        phone: "+966-5-9999-8888",
        country: "Saudi Arabia",
        joined: "2025-03-10",
        status: "Active",
        address: "Jeddah",
        sector: "Retail",
        notes: "", 
        invoices: []
      },
      {
        name: "Atlas Pharma",
        contactName: "Hiba Mansour",
        email: "hiba@atlaspharma.com",
        phone: "+962-7-5555-1122",
        country: "Jordan",
        joined: "2025-02-14",
        status: "Active",
        address: "Zarqa",
        sector: "Healthcare",
        notes: "Key distributor in medical supplies.",
        invoices: [
          { id: "INV-2025-0031", date: "2025-02-20", total: "$3,400", status: "Paid" }
        ]
      },
      {
        name: "Brightline Media",
        contactName: "Karim Hatem",
        email: "karim@brightline.io",
        phone: "+971-55-333-4444",
        country: "UAE",
        joined: "2025-01-09",
        status: "Active",
        address: "Abu Dhabi",
        sector: "Marketing",
        notes: "Seasonal ad campaigns.",
        invoices: []
      },
      {
        name: "Cedar Foods",
        contactName: "Maya Khalil",
        email: "maya@cedarfoods.com",
        phone: "+961-3-789-456",
        country: "Lebanon",
        joined: "2024-12-22",
        status: "Paused",
        address: "Beirut",
        sector: "FMCG",
        notes: "Shipment delays reported.",
        invoices: [
          { id: "INV-2025-0045", date: "2025-01-10", total: "$1,100", status: "Due" }
        ]
      },
      {
        name: "Delta Energy",
        contactName: "Hassan Nouri",
        email: "hassan@deltaenergy.net",
        phone: "+966-55-222-3333",
        country: "Saudi Arabia",
        joined: "2024-11-15",
        status: "Active",
        address: "Dammam",
        sector: "Energy",
        notes: "Annual maintenance contract.",
        invoices: []
      },
      {
        name: "Everest Logistics",
        contactName: "Rania Odeh",
        email: "rania@everestlog.com",
        phone: "+962-7-4567-8910",
        country: "Jordan",
        joined: "2024-10-30",
        status: "Active",
        address: "Amman, Khalda",
        sector: "Logistics",
        notes: "Expanding fleet operations.",
        invoices: [
          { id: "INV-2025-0055", date: "2025-01-20", total: "$2,700", status: "Sent" }
        ]
      },
      {
        name: "Falcon Security",
        contactName: "Othman Farouk",
        email: "othman@falconsec.com",
        phone: "+971-50-999-7777",
        country: "UAE",
        joined: "2024-09-12",
        status: "Active",
        address: "Sharjah",
        sector: "Security",
        notes: "",
        invoices: []
      },
      {
        name: "Global FinServe",
        contactName: "Yasmeen Taleb",
        email: "yasmeen@finserve.com",
        phone: "+973-39-555-666",
        country: "Bahrain",
        joined: "2024-08-03",
        status: "Active",
        address: "Manama",
        sector: "Finance",
        notes: "High-value contracts.",
        invoices: [
          { id: "INV-2025-0067", date: "2025-01-28", total: "$12,000", status: "Paid" }
        ]
      },
      {
        name: "Horizon Travel",
        contactName: "Walid Darwish",
        email: "walid@horizontravel.com",
        phone: "+962-7-111-2223",
        country: "Jordan",
        joined: "2024-07-25",
        status: "Active",
        address: "Amman, Sweifieh",
        sector: "Hospitality",
        notes: "New package launches each quarter.",
        invoices: []
      },
      {
        name: "IronBuild Contractors",
        contactName: "Samir Awad",
        email: "samir@ironbuild.co",
        phone: "+966-58-123-9876",
        country: "Saudi Arabia",
        joined: "2024-06-11",
        status: "Paused",
        address: "Khobar",
        sector: "Construction",
        notes: "Project on hold until permits are cleared.",
        invoices: [
          { id: "INV-2025-0073", date: "2025-02-01", total: "$18,500", status: "Due" }
        ]
      },
      {
        name: "Jasmine Boutique",
        contactName: "Dana Nassar",
        email: "dana@jasminebtq.com",
        phone: "+962-7-987-2221",
        country: "Jordan",
        joined: "2024-05-20",
        status: "Active",
        address: "Amman, Abdoun",
        sector: "Retail",
        notes: "Frequent orders of seasonal stock.",
        invoices: []
      }

    ];
    store = {};
    dummyArr.forEach(c => (store[c.name] = c));
    saveClients(store);
  }

  // ---------- Table render ----------
  const tbody = document.getElementById('clients-tbody');
  let currentFilter = "All"; // default

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = '';

    const clientsArr = Object.values(store);

    const filtered = currentFilter === "All"
      ? clientsArr
      : clientsArr.filter(c => c.status === currentFilter);

    filtered.forEach(c => {
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

  const pills = document.querySelectorAll('.pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.textContent.trim(); // "All" | "Active" | "Paused"
      renderTable();
    });
  });


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
