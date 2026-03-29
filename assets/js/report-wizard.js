// assets/js/report-wizard.js — Report Generation Wizard
(function () {
  const $ = id => document.getElementById(id);

  // Step order: 1=Type, 2=Options, 3=Dates, 4=Format
  const TYPES = [
    { id: 'invoices',       label: 'Invoices',       desc: 'Invoice records, amounts & coverage',       icon: './assets/img/file.png',                      color: 'rgba(44,142,205,.15)'  },
    { id: 'expenses',       label: 'Expenses',        desc: 'Company expenses, subscriptions & payments', icon: './assets/img/credit-card.png',               color: 'rgba(251,191,36,.15)'  },
    { id: 'projects',       label: 'Projects',        desc: 'Project financials, profit & status',        icon: './assets/img/projects.png',                  color: 'rgba(167,139,250,.15)' },
    { id: 'clients',        label: 'Clients',         desc: 'Client directory, sectors & countries',      icon: './assets/img/multiple-users-silhouette.png', color: 'rgba(52,211,153,.15)'  },
    { id: 'subcontractors', label: 'Subcontractors',  desc: 'Subcontractor directory & contact info',     icon: './assets/img/sub.png',                       color: 'rgba(56,189,248,.15)'  },
  ];

  const DATE_PRESETS = [
    { id: 'last30',   label: 'Last 30 days'  },
    { id: 'last90',   label: 'Last 90 days'  },
    { id: 'last6m',   label: 'Last 6 months' },
    { id: 'thisYear', label: 'This Year'     },
    { id: 'lastYear', label: 'Last Year'     },
    { id: 'all',      label: 'All Time'      },
    { id: 'custom',   label: 'Custom Range'  },
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {};

  function resetState() {
    state = {
      step:                1,
      type:                null,
      // dates
      datePreset:          'all',
      datePresetSet:       false,
      dateFrom:            '',
      dateTo:              '',
      // ── Invoices ──
      invoiceStatus:       'all',
      invoiceCoverage:     'all',
      invoiceSort:         'newest',
      invoiceLimit:        'all',
      invoiceIncludeNotes: false,
      // ── Expenses ──
      expenseStatus:       'all',
      expenseCategory:     'all',
      expenseSort:         'newest',
      expenseLimit:        'all',
      expenseExcludeSubs:  false,
      // ── Projects ──
      projectStatus:       'all',
      projectManager:      'all',
      projectProfitability:'all',
      projectSort:         'recent',
      projectArchived:     false,
      // ── Clients ──
      clientStatus:        'all',
      clientSector:        'all',
      clientCountry:       'all',
      clientSort:          'name',
      clientLimit:         'all',
      // ── Subcontractors ──
      subStatus:           'all',
      subCountry:          'all',
      // meta
      format:              null,
      phase:               'wizard',
      errorMsg:            '',
      rowCount:            0,
    };
  }

  // ── Open / Close ───────────────────────────────────────────────────────────
  function openWizard() {
    resetState();
    const modal = $('reportWizardModal');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    refresh();
  }

  function closeWizard() {
    const modal = $('reportWizardModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  // ── Full refresh ───────────────────────────────────────────────────────────
  function refresh() {
    renderStepIndicator();
    renderSummary();
    renderBody();
    bindBodyEvents();
    renderNav();
  }

  // ── Step indicator ─────────────────────────────────────────────────────────
  function renderStepIndicator() {
    document.querySelectorAll('.rw-step[data-step]').forEach(el => {
      const n     = parseInt(el.dataset.step);
      const numEl = el.querySelector('.rw-step-num');
      const isDone = n < state.step || (n === 4 && state.phase === 'done');
      el.classList.toggle('active', n === state.step && state.phase === 'wizard');
      el.classList.toggle('done',   isDone);
      if (numEl) numEl.textContent = isDone ? '✓' : n;
    });
  }

  // ── Summary bar ────────────────────────────────────────────────────────────
  function renderSummary() {
    const el    = $('rwSummary');
    const inner = $('rwSummaryInner');
    if (!el || !inner) return;

    const chips = [];

    if (state.type) {
      chips.push(chip('Type', TYPES.find(x => x.id === state.type)?.label || state.type));
    }

    // Options chips (step 2+)
    if (state.step >= 2 && state.type) {
      if (state.type === 'invoices') {
        if (state.invoiceStatus   !== 'all') chips.push(chip('Status',   state.invoiceStatus));
        if (state.invoiceCoverage !== 'all') chips.push(chip('Period',   state.invoiceCoverage));
        if (state.invoiceLimit    !== 'all') chips.push(chip('Limit',    limitLabel(state.invoiceLimit)));
      }
      if (state.type === 'expenses') {
        if (state.expenseStatus   !== 'all')   chips.push(chip('Status',   state.expenseStatus));
        if (state.expenseCategory !== 'all')   chips.push(chip('Category', state.expenseCategory));
        if (state.expenseExcludeSubs)          chips.push(chip('Exclude',  'Subcontractors'));
        if (state.expenseLimit    !== 'all')   chips.push(chip('Limit',    limitLabel(state.expenseLimit)));
      }
      if (state.type === 'projects') {
        if (state.projectStatus        !== 'all')   chips.push(chip('Status',      state.projectStatus));
        if (state.projectManager       !== 'all')   chips.push(chip('Manager',     state.projectManager));
        if (state.projectProfitability !== 'all')   chips.push(chip('Profit',      state.projectProfitability === 'profitable' ? 'Profitable only' : 'Loss only'));
        if (state.projectArchived)                  chips.push(chip('Include',     'Archived'));
      }
      if (state.type === 'clients') {
        if (state.clientStatus  !== 'all') chips.push(chip('Status',  state.clientStatus));
        if (state.clientSector  !== 'all') chips.push(chip('Sector',  state.clientSector));
        if (state.clientCountry !== 'all') chips.push(chip('Country', state.clientCountry));
        if (state.clientLimit   !== 'all') chips.push(chip('Limit',   limitLabel(state.clientLimit)));
      }
      if (state.type === 'subcontractors') {
        if (state.subStatus  !== 'all') chips.push(chip('Status',  state.subStatus));
        if (state.subCountry !== 'all') chips.push(chip('Country', state.subCountry));
      }
    }

    // Period chip — only once user explicitly picked a preset
    if (state.datePresetSet && state.type && state.type !== 'subcontractors' && state.type !== 'clients') {
      const p = DATE_PRESETS.find(x => x.id === state.datePreset);
      let lbl = p?.label || '';
      if (state.datePreset === 'custom' && (state.dateFrom || state.dateTo))
        lbl = `${state.dateFrom || '…'} → ${state.dateTo || '…'}`;
      chips.push(chip('Date Range', lbl));
    }

    if (state.format) chips.push(chip('Format', state.format === 'excel' ? 'Excel (.xlsx)' : 'Word (.doc)'));

    el.style.display = chips.length ? 'flex' : 'none';
    inner.innerHTML  = chips.join('');
  }

  function chip(label, value) {
    return `<span class="rw-sum-chip"><strong>${label}:</strong> ${value}</span>`;
  }
  function limitLabel(v) {
    if (v === 'top10') return 'Top 10'; if (v === 'top25') return 'Top 25'; return v;
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  function renderBody() {
    const body = $('rwBody');
    if (!body) return;

    if (state.phase === 'generating') {
      body.innerHTML = `<div class="rw-status-box"><div class="spinner" style="margin:0 auto 16px;"></div><div class="rw-status-title">Generating your report…</div><div class="rw-status-sub">Fetching data from the database.</div></div>`;
      return;
    }
    if (state.phase === 'done') {
      body.innerHTML = `<div class="rw-status-box"><div class="rw-status-icon">✅</div><div class="rw-status-title">Report ready!</div><div class="rw-status-sub">${state.rowCount} record${state.rowCount !== 1 ? 's' : ''} exported as <strong>${state.format === 'excel' ? '.xlsx' : '.doc'}</strong>.</div></div>`;
      return;
    }
    if (state.phase === 'error') {
      body.innerHTML = `<div class="rw-status-box"><div class="rw-status-icon">⚠️</div><div class="rw-status-title" style="color:#fca5a5;">Something went wrong</div><div class="rw-status-sub">${state.errorMsg || 'Please try again.'}</div></div>`;
      return;
    }
    if (state.phase === 'empty') {
      body.innerHTML = `<div class="rw-status-box"><div class="rw-status-icon">🔍</div><div class="rw-status-title">No data found</div><div class="rw-status-sub">No records matched your criteria. Try adjusting the filters.</div></div>`;
      return;
    }

    if (state.step === 1) body.innerHTML = renderStep1();
    if (state.step === 2) body.innerHTML = renderStep2();
    if (state.step === 3) body.innerHTML = renderStep3();
    if (state.step === 4) body.innerHTML = renderStep4();
  }

  // ── Step 1 — Type ──────────────────────────────────────────────────────────
  function renderStep1() {
    return `
      <p class="rw-step-label">What type of report do you need?</p>
      <div class="rw-type-cards">
        ${TYPES.map(t => `
          <button class="rw-type-card${state.type === t.id ? ' selected' : ''}" data-type="${t.id}">
            <div class="rw-type-icon" style="background:${t.color}"><img src="${t.icon}" alt=""></div>
            <div>
              <div class="rw-type-name">${t.label}</div>
              <div class="rw-type-desc">${t.desc}</div>
            </div>
          </button>`).join('')}
      </div>`;
  }

  // ── Step 2 — Options ───────────────────────────────────────────────────────
  function renderStep2() {
    if (state.type === 'invoices')       return renderInvoiceOptions();
    if (state.type === 'expenses')       return renderExpenseOptions();
    if (state.type === 'projects')       return renderProjectOptions();
    if (state.type === 'clients')        return renderClientOptions();
    if (state.type === 'subcontractors') return renderSubOptions();
    return '<div class="rw-step-na">Select a report type first.</div>';
  }

  function renderInvoiceOptions() {
    return `
      <p class="rw-step-label">Customize your invoice report</p>
      <div class="rw-opts-grid">

        <div class="rw-field">
          <label class="rw-label">Status</label>
          <select class="rw-select" id="rwInvStatus">
            <option value="all"             ${s('invoiceStatus','all')}>All statuses</option>
            <option value="Paid"            ${s('invoiceStatus','Paid')}>Paid only</option>
            <option value="Not Paid"        ${s('invoiceStatus','Not Paid')}>Not Paid only</option>
            <option value="Partial Payment" ${s('invoiceStatus','Partial Payment')}>Partial Payment</option>
            <option value="Sent"            ${s('invoiceStatus','Sent')}>Sent only</option>
            <option value="Cancelled"       ${s('invoiceStatus','Cancelled')}>Cancelled only</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Coverage Period</label>
          <select class="rw-select" id="rwInvCoverage">
            <option value="all"          ${s('invoiceCoverage','all')}>All periods</option>
            <option value="Monthly"      ${s('invoiceCoverage','Monthly')}>Monthly</option>
            <option value="Annual"       ${s('invoiceCoverage','Annual')}>Annual</option>
            <option value="Yearly"       ${s('invoiceCoverage','Yearly')}>Yearly</option>
            <option value="One Time"     ${s('invoiceCoverage','One Time')}>One Time</option>
            <option value="One time"     ${s('invoiceCoverage','One time')}>One time</option>
            <option value="3 Months"     ${s('invoiceCoverage','3 Months')}>3 Months</option>
            <option value="6 Months"     ${s('invoiceCoverage','6 Months')}>6 Months</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Sort by</label>
          <select class="rw-select" id="rwInvSort">
            <option value="newest"  ${s('invoiceSort','newest')}>Newest first</option>
            <option value="oldest"  ${s('invoiceSort','oldest')}>Oldest first</option>
            <option value="highest" ${s('invoiceSort','highest')}>Highest amount</option>
            <option value="lowest"  ${s('invoiceSort','lowest')}>Lowest amount</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Include notes column</label>
          <div class="rw-radio-group rw-radio-row">
            ${radioOpt('invNotes','false', state.invoiceIncludeNotes ? 'true' : 'false', 'No')}
            ${radioOpt('invNotes','true',  state.invoiceIncludeNotes ? 'true' : 'false', 'Yes')}
          </div>
        </div>

        <div class="rw-field rw-full">
          <label class="rw-label">Limit results</label>
          <div class="rw-radio-group rw-radio-row">
            ${radioOpt('invLimit','all',   state.invoiceLimit, 'All records')}
            ${radioOpt('invLimit','top10', state.invoiceLimit, 'Top 10 by amount')}
            ${radioOpt('invLimit','top25', state.invoiceLimit, 'Top 25 by amount')}
          </div>
        </div>

      </div>`;
  }

  function renderExpenseOptions() {
    return `
      <p class="rw-step-label">Customize your expense report</p>
      <div class="rw-opts-grid">

        <div class="rw-field">
          <label class="rw-label">Status</label>
          <select class="rw-select" id="rwExpStatus">
            <option value="all"             ${s('expenseStatus','all')}>All statuses</option>
            <option value="Paid"            ${s('expenseStatus','Paid')}>Paid only</option>
            <option value="Unpaid"          ${s('expenseStatus','Unpaid')}>Unpaid only</option>
            <option value="Upcoming"        ${s('expenseStatus','Upcoming')}>Upcoming only</option>
            <option value="Partial Payment" ${s('expenseStatus','Partial Payment')}>Partial Payment</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Category</label>
          <select class="rw-select" id="rwExpCategory">
            <option value="all"          ${s('expenseCategory','all')}>All categories</option>
            <option value="Hosting"      ${s('expenseCategory','Hosting')}>Hosting</option>
            <option value="Email"        ${s('expenseCategory','Email')}>Email</option>
            <option value="Domain"       ${s('expenseCategory','Domain')}>Domain</option>
            <option value="Subscription" ${s('expenseCategory','Subscription')}>Subscription</option>
            <option value="Freelance"    ${s('expenseCategory','Freelance')}>Freelance</option>
            <option value="subcontractor"${s('expenseCategory','subcontractor')}>Subcontractor</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Sort by</label>
          <select class="rw-select" id="rwExpSort">
            <option value="newest"  ${s('expenseSort','newest')}>Newest first</option>
            <option value="oldest"  ${s('expenseSort','oldest')}>Oldest first</option>
            <option value="highest" ${s('expenseSort','highest')}>Highest amount</option>
            <option value="vendor"  ${s('expenseSort','vendor')}>By vendor name</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Exclude subcontractor payments</label>
          <div class="rw-radio-group rw-radio-row">
            ${radioOpt('expSubs','false', state.expenseExcludeSubs ? 'true' : 'false', 'Include them')}
            ${radioOpt('expSubs','true',  state.expenseExcludeSubs ? 'true' : 'false', 'Exclude them')}
          </div>
        </div>

        <div class="rw-field rw-full">
          <label class="rw-label">Limit results</label>
          <div class="rw-radio-group rw-radio-row">
            ${radioOpt('expLimit','all',   state.expenseLimit, 'All records')}
            ${radioOpt('expLimit','top10', state.expenseLimit, 'Top 10 by amount')}
            ${radioOpt('expLimit','top25', state.expenseLimit, 'Top 25 by amount')}
          </div>
        </div>

      </div>`;
  }

  function renderProjectOptions() {
    return `
      <p class="rw-step-label">Customize your project report</p>
      <div class="rw-opts-grid">

        <div class="rw-field">
          <label class="rw-label">Status</label>
          <select class="rw-select" id="rwProjStatus">
            <option value="all"       ${s('projectStatus','all')}>All statuses</option>
            <option value="Active"    ${s('projectStatus','Active')}>Active only</option>
            <option value="Planned"   ${s('projectStatus','Planned')}>Planned only</option>
            <option value="Completed" ${s('projectStatus','Completed')}>Completed only</option>
            <option value="On Hold"   ${s('projectStatus','On Hold')}>On Hold only</option>
            <option value="Cancelled" ${s('projectStatus','Cancelled')}>Cancelled only</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Project Manager</label>
          <select class="rw-select" id="rwProjManager">
            <option value="all"   ${s('projectManager','all')}>All managers</option>
            <option value="Ahmad" ${s('projectManager','Ahmad')}>Ahmad</option>
            <option value="Zuhri" ${s('projectManager','Zuhri')}>Zuhri</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Sort by</label>
          <select class="rw-select" id="rwProjSort">
            <option value="recent" ${s('projectSort','recent')}>Most recent first</option>
            <option value="value"  ${s('projectSort','value')}>Highest contract value</option>
            <option value="profit" ${s('projectSort','profit')}>Highest profit</option>
            <option value="name"   ${s('projectSort','name')}>Project name A–Z</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Profitability</label>
          <select class="rw-select" id="rwProjProfit">
            <option value="all"        ${s('projectProfitability','all')}>All projects</option>
            <option value="profitable" ${s('projectProfitability','profitable')}>Profitable only</option>
            <option value="loss"       ${s('projectProfitability','loss')}>Loss only</option>
          </select>
        </div>

        <div class="rw-field rw-full">
          <label class="rw-label">Include archived projects?</label>
          <div class="rw-radio-group rw-radio-row">
            ${radioOpt('projArch','false', state.projectArchived ? 'true' : 'false', 'Exclude archived')}
            ${radioOpt('projArch','true',  state.projectArchived ? 'true' : 'false', 'Include archived')}
          </div>
        </div>

      </div>`;
  }

  function renderClientOptions() {
    return `
      <p class="rw-step-label">Customize your client report</p>
      <div class="rw-opts-grid">

        <div class="rw-field">
          <label class="rw-label">Status</label>
          <select class="rw-select" id="rwClientStatus">
            <option value="all"      ${s('clientStatus','all')}>All clients</option>
            <option value="Active"   ${s('clientStatus','Active')}>Active only</option>
            <option value="Archived" ${s('clientStatus','Archived')}>Archived only</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Sector</label>
          <select class="rw-select" id="rwClientSector">
            <option value="all"                ${s('clientSector','all')}>All sectors</option>
            <option value="Health"             ${s('clientSector','Health')}>Health</option>
            <option value="IT"                 ${s('clientSector','IT')}>IT</option>
            <option value="Event Management"   ${s('clientSector','Event Management')}>Event Management</option>
            <option value="Automotive"         ${s('clientSector','Automotive')}>Automotive</option>
            <option value="Online Store"       ${s('clientSector','Online Store')}>Online Store</option>
            <option value="Real State"         ${s('clientSector','Real State')}>Real Estate</option>
            <option value="Recruitment"        ${s('clientSector','Recruitment')}>Recruitment</option>
            <option value="Telecommunication"  ${s('clientSector','Telecommunication')}>Telecommunication</option>
            <option value="Streaming"          ${s('clientSector','Streaming')}>Streaming</option>
            <option value="Immigration"        ${s('clientSector','Immigration')}>Immigration</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Country</label>
          <select class="rw-select" id="rwClientCountry">
            <option value="all"         ${s('clientCountry','all')}>All countries</option>
            <option value="Jordan"      ${s('clientCountry','Jordan')}>Jordan</option>
            <option value="Saudi Arabia"${s('clientCountry','Saudi Arabia')}>Saudi Arabia</option>
            <option value="UAE"         ${s('clientCountry','UAE')}>UAE</option>
            <option value="Iraq"        ${s('clientCountry','Iraq')}>Iraq</option>
            <option value="Lebanon"     ${s('clientCountry','Lebanon')}>Lebanon</option>
            <option value="Palestine"   ${s('clientCountry','Palestine')}>Palestine</option>
            <option value="Canada"      ${s('clientCountry','Canada')}>Canada</option>
            <option value="USA"         ${s('clientCountry','USA')}>USA</option>
            <option value="Sweden"      ${s('clientCountry','Sweden')}>Sweden</option>
            <option value="Kuwait"      ${s('clientCountry','Kuwait')}>Kuwait</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Sort by</label>
          <select class="rw-select" id="rwClientSort">
            <option value="name"   ${s('clientSort','name')}>Name A–Z</option>
            <option value="newest" ${s('clientSort','newest')}>Recently joined</option>
            <option value="oldest" ${s('clientSort','oldest')}>Earliest joined</option>
          </select>
        </div>

        <div class="rw-field rw-full">
          <label class="rw-label">Limit results</label>
          <div class="rw-radio-group rw-radio-row">
            ${radioOpt('clientLimit','all',   state.clientLimit, 'All clients')}
            ${radioOpt('clientLimit','top10', state.clientLimit, 'Top 10')}
            ${radioOpt('clientLimit','top25', state.clientLimit, 'Top 25')}
          </div>
        </div>

      </div>`;
  }

  function renderSubOptions() {
    return `
      <p class="rw-step-label">Customize your subcontractor report</p>
      <div class="rw-opts-grid">

        <div class="rw-field">
          <label class="rw-label">Status</label>
          <select class="rw-select" id="rwSubStatus">
            <option value="all"      ${s('subStatus','all')}>All statuses</option>
            <option value="Active"   ${s('subStatus','Active')}>Active only</option>
            <option value="Paused"   ${s('subStatus','Paused')}>Paused only</option>
            <option value="Archived" ${s('subStatus','Archived')}>Archived only</option>
          </select>
        </div>

        <div class="rw-field">
          <label class="rw-label">Country</label>
          <select class="rw-select" id="rwSubCountry">
            <option value="all"    ${s('subCountry','all')}>All countries</option>
            <option value="Jordan" ${s('subCountry','Jordan')}>Jordan</option>
            <option value="Turkey" ${s('subCountry','Turkey')}>Turkey</option>
          </select>
        </div>

      </div>`;
  }

  // ── Step 3 — Dates ─────────────────────────────────────────────────────────
  function renderStep3() {
    const noDate = state.type === 'subcontractors' || state.type === 'clients';
    if (noDate) {
      return `<div class="rw-step-na">Date range does not apply to this report type.<br>Click <strong>Next</strong> to continue.</div>`;
    }
    return `
      <p class="rw-step-label">Select a date range</p>
      <div class="rw-presets">
        ${DATE_PRESETS.map(p => `
          <button class="rw-preset-btn${state.datePreset === p.id ? ' selected' : ''}" data-preset="${p.id}">${p.label}</button>`).join('')}
      </div>
      ${state.datePreset === 'custom' ? `
        <div class="rw-custom-dates">
          <div class="rw-field">
            <label class="rw-label">From</label>
            <input type="date" class="rw-input" id="rwDateFrom" value="${state.dateFrom || ''}">
          </div>
          <div class="rw-field">
            <label class="rw-label">To</label>
            <input type="date" class="rw-input" id="rwDateTo" value="${state.dateTo || ''}">
          </div>
        </div>` : ''}`;
  }

  // ── Step 4 — Format ────────────────────────────────────────────────────────
  function renderStep4() {
    return `
      <p class="rw-step-label">Choose your export format</p>
      <div class="rw-format-cards">
        <button class="rw-format-card${state.format === 'excel' ? ' selected' : ''}" data-format="excel">
          <div class="rw-format-icon"><img src="./assets/img/excel.png" alt="Excel"></div>
          <div class="rw-format-name">Excel Spreadsheet</div>
          <div class="rw-format-ext">.xlsx — best for data analysis</div>
        </button>
        <button class="rw-format-card${state.format === 'word' ? ' selected' : ''}" data-format="word">
          <div class="rw-format-icon"><img src="./assets/img/word.png" alt="Word"></div>
          <div class="rw-format-name">Word Document</div>
          <div class="rw-format-ext">.doc — best for sharing &amp; printing</div>
        </button>
      </div>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function s(stateKey, val) { return state[stateKey] === val ? 'selected' : ''; }

  function radioOpt(name, value, current, label) {
    const id      = `rw_${name}_${value}`;
    const checked = current === value ? 'checked' : '';
    return `
      <label class="rw-radio-lbl" for="${id}">
        <input type="radio" class="rw-radio" name="${name}" id="${id}" value="${value}" ${checked}>
        <span class="rw-radio-dot"></span>
        ${label}
      </label>`;
  }

  // ── Nav buttons ────────────────────────────────────────────────────────────
  function renderNav() {
    const backBtn = $('rwBackBtn');
    const nextBtn = $('rwNextBtn');
    if (!backBtn || !nextBtn) return;

    if (state.phase === 'done') {
      backBtn.style.display = 'none';
      nextBtn.textContent   = 'Close';
      nextBtn.className     = 'btn2 btn-success';
      nextBtn.disabled      = false;
      return;
    }
    if (state.phase === 'generating') {
      backBtn.style.display = 'none';
      nextBtn.textContent   = 'Generating…';
      nextBtn.className     = 'btn2 btn-success';
      nextBtn.disabled      = true;
      return;
    }
    if (state.phase === 'error' || state.phase === 'empty') {
      backBtn.style.display = '';
      nextBtn.textContent   = 'Try Again';
      nextBtn.className     = 'btn2 btn-success';
      nextBtn.disabled      = false;
      return;
    }

    backBtn.style.display = state.step > 1 ? '' : 'none';
    nextBtn.disabled      = false;
    nextBtn.className     = 'btn2 btn-success';

    if (state.step === 4) {
      nextBtn.textContent = 'Generate Report ↓';
      nextBtn.disabled    = !state.format;
    } else {
      nextBtn.textContent = 'Next →';
    }
  }

  // ── Bind body events ───────────────────────────────────────────────────────
  function bindBodyEvents() {
    // Step 1
    document.querySelectorAll('.rw-type-card').forEach(card => {
      card.addEventListener('click', () => {
        state.type = card.dataset.type;
        document.querySelectorAll('.rw-type-card').forEach(c => c.classList.toggle('selected', c === card));
        renderNav(); renderSummary();
      });
    });

    // Step 2 — invoices
    $('rwInvStatus')?.addEventListener('change',   e => { state.invoiceStatus       = e.target.value; renderSummary(); });
    $('rwInvCoverage')?.addEventListener('change', e => { state.invoiceCoverage     = e.target.value; renderSummary(); });
    $('rwInvSort')?.addEventListener('change',     e => { state.invoiceSort         = e.target.value; });
    document.querySelectorAll('input[name="invNotes"]').forEach(r =>
      r.addEventListener('change', e => { state.invoiceIncludeNotes = e.target.value === 'true'; }));
    document.querySelectorAll('input[name="invLimit"]').forEach(r =>
      r.addEventListener('change', e => { state.invoiceLimit = e.target.value; renderSummary(); }));

    // Step 2 — expenses
    $('rwExpStatus')?.addEventListener('change',   e => { state.expenseStatus   = e.target.value; renderSummary(); });
    $('rwExpCategory')?.addEventListener('change', e => { state.expenseCategory = e.target.value; renderSummary(); });
    $('rwExpSort')?.addEventListener('change',     e => { state.expenseSort     = e.target.value; });
    document.querySelectorAll('input[name="expSubs"]').forEach(r =>
      r.addEventListener('change', e => { state.expenseExcludeSubs = e.target.value === 'true'; renderSummary(); }));
    document.querySelectorAll('input[name="expLimit"]').forEach(r =>
      r.addEventListener('change', e => { state.expenseLimit = e.target.value; renderSummary(); }));

    // Step 2 — projects
    $('rwProjStatus')?.addEventListener('change',  e => { state.projectStatus        = e.target.value; renderSummary(); });
    $('rwProjManager')?.addEventListener('change', e => { state.projectManager       = e.target.value; renderSummary(); });
    $('rwProjSort')?.addEventListener('change',    e => { state.projectSort          = e.target.value; });
    $('rwProjProfit')?.addEventListener('change',  e => { state.projectProfitability = e.target.value; renderSummary(); });
    document.querySelectorAll('input[name="projArch"]').forEach(r =>
      r.addEventListener('change', e => { state.projectArchived = e.target.value === 'true'; renderSummary(); }));

    // Step 2 — clients
    $('rwClientStatus')?.addEventListener('change',  e => { state.clientStatus  = e.target.value; renderSummary(); });
    $('rwClientSector')?.addEventListener('change',  e => { state.clientSector  = e.target.value; renderSummary(); });
    $('rwClientCountry')?.addEventListener('change', e => { state.clientCountry = e.target.value; renderSummary(); });
    $('rwClientSort')?.addEventListener('change',    e => { state.clientSort    = e.target.value; });
    document.querySelectorAll('input[name="clientLimit"]').forEach(r =>
      r.addEventListener('change', e => { state.clientLimit = e.target.value; renderSummary(); }));

    // Step 2 — subcontractors
    $('rwSubStatus')?.addEventListener('change',  e => { state.subStatus  = e.target.value; renderSummary(); });
    $('rwSubCountry')?.addEventListener('change', e => { state.subCountry = e.target.value; renderSummary(); });

    // Step 3 — date presets
    document.querySelectorAll('.rw-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prev = state.datePreset;
        state.datePreset    = btn.dataset.preset;
        state.datePresetSet = true;
        if (state.datePreset === 'custom' || prev === 'custom') { refresh(); return; }
        document.querySelectorAll('.rw-preset-btn').forEach(b => b.classList.toggle('selected', b === btn));
        renderSummary(); renderNav();
      });
    });
    $('rwDateFrom')?.addEventListener('change', e => { state.dateFrom = e.target.value; renderSummary(); });
    $('rwDateTo')?.addEventListener('change',   e => { state.dateTo   = e.target.value; renderSummary(); });

    // Step 4 — format cards
    document.querySelectorAll('.rw-format-card').forEach(card => {
      card.addEventListener('click', () => {
        state.format = card.dataset.format;
        document.querySelectorAll('.rw-format-card').forEach(c => c.classList.toggle('selected', c === card));
        renderNav(); renderSummary();
      });
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function canProceed() {
    if (state.step === 1) return !!state.type;
    if (state.step === 2) return true;
    if (state.step === 3) {
      const noDate = state.type === 'subcontractors' || state.type === 'clients';
      if (noDate) return true;
      if (state.datePreset === 'custom') return !!(state.dateFrom && state.dateTo);
      return true;
    }
    if (state.step === 4) return !!state.format;
    return true;
  }

  function onNext() {
    if (state.phase === 'done')  { closeWizard(); return; }
    if (state.phase === 'error' || state.phase === 'empty') { state.phase = 'wizard'; refresh(); return; }
    if (!canProceed()) { shake($('rwBody')); return; }
    if (state.step === 4) { generateReport(); return; }
    state.step++;
    refresh();
  }

  function onBack() {
    if (state.phase === 'error' || state.phase === 'empty') { state.phase = 'wizard'; refresh(); return; }
    if (state.step > 1) state.step--;
    refresh();
  }

  function shake(el) {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'rwShake .3s';
  }

  // ── Date range ─────────────────────────────────────────────────────────────
  function computeDateRange() {
    const today   = new Date();
    const toISO   = d => d.toISOString().slice(0, 10);
    const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t; };
    switch (state.datePreset) {
      case 'last30':   return { from: toISO(addDays(today, -30)),  to: toISO(today) };
      case 'last90':   return { from: toISO(addDays(today, -90)),  to: toISO(today) };
      case 'last6m':   return { from: toISO(addDays(today, -180)), to: toISO(today) };
      case 'thisYear': return { from: `${today.getFullYear()}-01-01`, to: toISO(today) };
      case 'lastYear': return { from: `${today.getFullYear()-1}-01-01`, to: `${today.getFullYear()-1}-12-31` };
      case 'custom':   return { from: state.dateFrom || null, to: state.dateTo || null };
      default:         return { from: null, to: null };
    }
  }

  // ── Fetch ───────────────────────────────────────────────────────────────────
  async function fetchData() {
    if (!window.sb) throw new Error('Database not connected.');
    const range = computeDateRange();

    // ── Invoices ──
    if (state.type === 'invoices') {
      const sortCol = { newest: 'issue_date', oldest: 'issue_date', highest: 'subtotal', lowest: 'subtotal' }[state.invoiceSort] || 'issue_date';
      const asc     = state.invoiceSort === 'oldest' || state.invoiceSort === 'lowest';
      let q = window.sb
        .from('invoices')
        .select('invoice_no, issue_date, due_date, coverage_period, subtotal, status, note, clients!invoices_client_id_fkey(name)')
        .order(sortCol, { ascending: asc });
      if (range.from) q = q.gte('issue_date', range.from);
      if (range.to)   q = q.lte('issue_date', range.to);
      if (state.invoiceStatus   !== 'all') q = q.eq('status',          state.invoiceStatus);
      if (state.invoiceCoverage !== 'all') q = q.eq('coverage_period', state.invoiceCoverage);
      if (state.invoiceLimit === 'top10')  q = q.limit(10);
      if (state.invoiceLimit === 'top25')  q = q.limit(25);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(r => {
        const row = {
          'Invoice #':       r.invoice_no          || '—',
          'Client':          r.clients?.name        || '—',
          'Issue Date':      r.issue_date           || '—',
          'Due Date':        r.due_date             || '—',
          'Coverage Period': r.coverage_period      || '—',
          'Amount (USD)':    Number(r.subtotal || 0),
          'Status':          r.status               || '—',
        };
        if (state.invoiceIncludeNotes) row['Notes'] = r.note || '';
        return row;
      });
    }

    // ── Expenses ──
    if (state.type === 'expenses') {
      const sortCol = { newest: 'expense_date', oldest: 'expense_date', highest: 'amount', vendor: 'vendor' }[state.expenseSort] || 'expense_date';
      const asc     = state.expenseSort === 'oldest' || state.expenseSort === 'vendor';
      let q = window.sb
        .from('expenses')
        .select('vendor, description, client_name, amount, expense_date, status, service, frequency, note')
        .order(sortCol, { ascending: asc });
      if (range.from) q = q.gte('expense_date', range.from);
      if (range.to)   q = q.lte('expense_date', range.to);
      if (state.expenseStatus   !== 'all') q = q.eq('status',  state.expenseStatus);
      if (state.expenseCategory !== 'all') q = q.eq('service', state.expenseCategory);
      if (state.expenseExcludeSubs)        q = q.neq('service', 'subcontractor');
      if (state.expenseLimit === 'top10')  q = q.limit(10);
      if (state.expenseLimit === 'top25')  q = q.limit(25);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(r => ({
        'Vendor':      r.vendor       || '—',
        'Description': r.description  || '—',
        'Client':      r.client_name  || '—',
        'Amount (USD)':Number(r.amount || 0),
        'Date':        r.expense_date || '—',
        'Category':    r.service      || '—',
        'Frequency':   r.frequency    || '—',
        'Status':      r.status       || '—',
        'Note':        r.note         || '',
      }));
    }

    // ── Projects ──
    if (state.type === 'projects') {
      const sortMap = {
        recent: ['updated_at', false],
        value:  ['contract_value', false],
        profit: ['total_profit', false],
        name:   ['project_name', true],
      };
      const [sortCol, asc] = sortMap[state.projectSort] || ['updated_at', false];
      let q = window.sb
        .from('projects')
        .select('project_code, project_name, client_name, status, contract_value, total_revenue, total_cost, total_profit, subcontractor_cost, expense_cost, start_date, end_date, project_manager, is_archived')
        .order(sortCol, { ascending: asc });
      if (range.from) q = q.gte('start_date', range.from);
      if (range.to)   q = q.lte('start_date', range.to);
      if (state.projectStatus  !== 'all') q = q.eq('status', state.projectStatus);
      if (!state.projectArchived)         q = q.eq('is_archived', false);
      if (state.projectManager === 'Ahmad') q = q.ilike('project_manager', '%Ahmad%');
      if (state.projectManager === 'Zuhri') q = q.ilike('project_manager', '%Zuhri%');
      const { data, error } = await q;
      if (error) throw error;
      let rows = data || [];
      // Client-side profitability filter
      if (state.projectProfitability === 'profitable') rows = rows.filter(r => Number(r.total_profit || 0) > 0);
      if (state.projectProfitability === 'loss')       rows = rows.filter(r => Number(r.total_profit || 0) < 0);
      return rows.map(r => ({
        'Project Code':       r.project_code     || '—',
        'Project Name':       r.project_name     || '—',
        'Client':             r.client_name      || '—',
        'Status':             r.status           || '—',
        'Contract Value':     Number(r.contract_value  || 0),
        'Total Revenue':      Number(r.total_revenue   || 0),
        'Total Cost':         Number(r.total_cost      || 0),
        'Total Profit':       Number(r.total_profit    || 0),
        'Subcontractor Cost': Number(r.subcontractor_cost || 0),
        'Expense Cost':       Number(r.expense_cost    || 0),
        'Start Date':         r.start_date       || '—',
        'End Date':           r.end_date         || '—',
        'Project Manager':    r.project_manager  || '—',
      }));
    }

    // ── Clients ──
    if (state.type === 'clients') {
      const sortMap = { name: ['name', true], newest: ['created_at', false], oldest: ['created_at', true] };
      const [sortCol, asc] = sortMap[state.clientSort] || ['name', true];
      let q = window.sb
        .from('clients')
        .select('client_no, name, contact_name, email, phone, country, sector, status, joined, address')
        .order(sortCol, { ascending: asc });
      if (state.clientStatus  !== 'all') q = q.eq('status',  state.clientStatus);
      if (state.clientCountry !== 'all') q = q.eq('country', state.clientCountry);
      if (state.clientSector  !== 'all') q = q.ilike('sector', `%${state.clientSector}%`);
      if (state.clientLimit === 'top10') q = q.limit(10);
      if (state.clientLimit === 'top25') q = q.limit(25);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(r => ({
        'Client #':   r.client_no    || '—',
        'Name':       r.name         || '—',
        'Contact':    r.contact_name || '—',
        'Email':      r.email        || '—',
        'Phone':      r.phone        || '—',
        'Country':    r.country      || '—',
        'Sector':     r.sector       || '—',
        'Status':     r.status       || '—',
        'Joined':     r.joined       || '—',
        'Address':    r.address      || '—',
      }));
    }

    // ── Subcontractors ──
    if (state.type === 'subcontractors') {
      let q = window.sb
        .from('subcontractors')
        .select('subcontractor_code, name, email, phone, country, status, notes')
        .order('name', { ascending: true });
      if (state.subStatus  !== 'all') q = q.ilike('status',  state.subStatus);
      if (state.subCountry !== 'all') q = q.eq('country', state.subCountry);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(r => ({
        'Code':    r.subcontractor_code || '—',
        'Name':    r.name    || '—',
        'Email':   r.email   || '—',
        'Phone':   r.phone   || '—',
        'Country': r.country || '—',
        'Status':  r.status  || '—',
        'Notes':   r.notes   || '',
      }));
    }

    return [];
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  async function generateReport() {
    state.phase = 'generating';
    refresh();
    try {
      const rows = await fetchData();
      if (!rows || !rows.length) { state.phase = 'empty'; refresh(); return; }

      const typeName = TYPES.find(t => t.id === state.type)?.label || 'Report';
      const today    = new Date().toISOString().slice(0, 10);
      const filename = `ZAtech_${typeName}_Report_${today}`;

      if (state.format === 'excel') await downloadExcel(rows, filename);
      else downloadWord(rows, filename, typeName);

      state.phase    = 'done';
      state.rowCount = rows.length;
    } catch (err) {
      console.error('[report-wizard]', err);
      state.phase    = 'error';
      state.errorMsg = err.message || 'Unexpected error.';
    }
    refresh();
  }

  // ── Excel ────────────────────────────────────────────────────────────────────
  function loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) { resolve(); return; }
      const s = document.createElement('script');
      s.src     = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload  = resolve;
      s.onerror = () => reject(new Error('Could not load Excel library. Check your internet connection.'));
      document.head.appendChild(s);
    });
  }

  async function downloadExcel(rows, filename) {
    await loadSheetJS();
    const ws   = window.XLSX.utils.json_to_sheet(rows);
    const cols = Object.keys(rows[0]);
    ws['!cols'] = cols.map(key => ({
      wch: Math.min(Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2, 44),
    }));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Report');
    window.XLSX.writeFile(wb, filename + '.xlsx');
  }

  // ── Word (paragraph style) ────────────────────────────────────────────────
  function downloadWord(rows, filename, sheetTitle) {
    const cols  = Object.keys(rows[0]);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const recordsHtml = rows.map((r, i) => {
      const heading = String(r[cols[0]] ?? `Record ${i + 1}`);
      const fields  = cols.slice(1).map(c =>
        `<p style="margin:3pt 0;font-size:10.5pt;"><strong style="color:#1a3a6b;display:inline-block;min-width:120pt;">${c}:</strong>&nbsp;${r[c] ?? ''}</p>`
      ).join('');
      return `
        <div style="margin-bottom:18pt;padding-bottom:14pt;border-bottom:1pt solid #e4e8f0;">
          <p style="margin:0 0 6pt;font-size:12pt;font-weight:bold;color:#0a1e3f;">${heading}</p>
          ${fields}
        </div>`;
    }).join('\n');

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8"><title>${sheetTitle} Report</title>
  <style>
    body  { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 40pt 50pt; color: #1a1a2e; }
    h1    { font-size: 20pt; color: #0a1e3f; margin: 0 0 4pt; }
    .meta { color: #666; font-size: 10pt; margin: 0 0 28pt; }
    .divider { border: none; border-top: 2pt solid #1a3a6b; margin: 0 0 22pt; }
  </style>
</head>
<body>
  <h1>ZAtech CRM &mdash; ${sheetTitle} Report</h1>
  <p class="meta">Generated ${today} &nbsp;&bull;&nbsp; ${rows.length} record${rows.length !== 1 ? 's' : ''}</p>
  <hr class="divider">
  ${recordsHtml}
</body></html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename + '.doc'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    $('openReportWizard')?.addEventListener('click',  openWizard);
    $('rwCloseBtn')?.addEventListener('click',        closeWizard);
    $('rwNextBtn')?.addEventListener('click',         onNext);
    $('rwBackBtn')?.addEventListener('click',         onBack);
    $('reportWizardModal')?.addEventListener('click', e => {
      if (e.target === $('reportWizardModal')) closeWizard();
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
