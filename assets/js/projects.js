import { sb } from './supabase.js';

(() => {
  const STATUSES = ['Planned', 'Active', 'On Hold', 'Completed', 'Cancelled'];
  const STATUS_RANK = { Planned: 1, Active: 2, 'On Hold': 3, Completed: 4, Cancelled: 5 };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  const els = {
    loader: byId('contentLoader'),
    

    // KPI
    kpiActiveProjects: byId('kpiActiveProjects'),
    kpiActiveProjectsCount: byId('kpiActiveProjectsCount'),
    kpiOpenVsTotal: byId('kpiOpenVsTotal'),
    kpiArchivedCount: byId('kpiArchivedCount'),
    kpiProjectRevenue: byId('kpiProjectRevenue'),
    kpiRevenueMargin: byId('kpiRevenueMargin'),
    kpiAvgRevenue: byId('kpiAvgRevenue'),
    kpiRevenueSubtitle: byId('kpiRevenueSubtitle'),
    kpiProjectCost: byId('kpiProjectCost'),
    kpiCostShare: byId('kpiCostShare'),
    kpiAvgCost: byId('kpiAvgCost'),
    kpiCostSubtitle: byId('kpiCostSubtitle'),
    kpiProjectProfit: byId('kpiProjectProfit'),
    kpiProfitMargin: byId('kpiProfitMargin'),
    kpiHealthyProjects: byId('kpiHealthyProjects'),
    kpiProfitSubtitle: byId('kpiProfitSubtitle'),

    // table summary
    visibleProjectsCount: byId('visibleProjectsCount'),
    visibleRevenue: byId('visibleRevenue'),
    visibleCost: byId('visibleCost'),
    visibleProfit: byId('visibleProfit'),

    // lists
    projectHealthList: byId('projectHealthList'),
    recentActivityList: byId('recentActivityList'),

    // filters
    tableSearch: byId('projectTableSearch'),
    topSearch: byId('searchInput'),
    statusFilter: byId('statusFilter'),
    clientFilter: byId('clientFilter'),
    recordFilter: byId('recordFilter'),
    resetFiltersBtn: byId('resetProjectFiltersBtn'),
    newProjectBtn: byId('newProjectBtn'),

    // table
    table: byId('projectsTable'),
    tbody: byId('projectsBody'),

    // modal
    modal: byId('projectsModal'),
    modalCloseBtn: byId('projectModalCloseBtn'),
    modalTitle: byId('projectModalTitle'),
    modalSubtitle: byId('projectModalSubtitle'),
    modalStatusTag: byId('projectModalStatusTag'),
    modalError: byId('projectModalError'),
    modalActionsBar: byId('projectModalActionsBar'),
    editBtn: byId('projectEditBtn'),
    archiveBtn: byId('projectArchiveBtn'),
    saveBtn: byId('projectSaveBtn'),
    cancelBtn: byId('projectCancelBtn'),
    tabsWrap: byId('projectModalTabs'),

    // archive modal
    archiveModal: byId('archiveProjectModal'),
    archiveMessage: byId('archiveProjectMessage'),
    archiveCancelBtn: byId('archiveProjectCancelBtn'),
    archiveConfirmBtn: byId('archiveProjectConfirmBtn'),

    // modal view fields
    pmProjectCode: byId('pmProjectCode'),
    pmProjectName: byId('pmProjectName'),
    pmClientName: byId('pmClientName'),
    pmProjectManager: byId('pmProjectManager'),
    pmStatus: byId('pmStatus'),
    pmContractValue: byId('pmContractValue'),
    pmStartDate: byId('pmStartDate'),
    pmEndDate: byId('pmEndDate'),
    pmDescription: byId('pmDescription'),
    pmTotalRevenue: byId('pmTotalRevenue'),
    pmTotalCost: byId('pmTotalCost'),
    pmTotalProfit: byId('pmTotalProfit'),
    pmProfitMargin: byId('pmProfitMargin'),
    pmCostBreakdown: byId('pmCostBreakdown'),
    pmRevenueList: byId('pmRevenueList'),
    pmExpenseList: byId('pmExpenseList'),
    pmActivityList: byId('pmActivityList'),
    pmTeamList: byId('pmTeamList'),
    pmTeamPaymentsList: byId('pmTeamPaymentsList'),

    // modal edit fields
    projectCodeInput: byId('projectCodeInput'),
    projectNameInput: byId('projectNameInput'),
    projectClientInput: byId('projectClientInput'),
    projectStatusInput: byId('projectStatusInput'),
    projectManagerInput: byId('projectManagerInput'),
    projectContractInput: byId('projectContractInput'),
    projectCurrencyInput: byId('projectCurrencyInput'),
    projectStartInput: byId('projectStartInput'),
    projectEndInput: byId('projectEndInput'),
    projectProfitPreviewInput: byId('projectProfitPreviewInput'),
    projectDescriptionInput: byId('projectDescriptionInput'),


    // revenue / expense buttons
    pmNewInvoiceBtn: byId('pmNewInvoiceBtn'),
    pmNewExpenseBtn: byId('pmNewExpenseBtn'),
    pmLinkExpenseBtn: byId('pmLinkExpenseBtn'),
    pmLinkInvoiceBtn: byId('pmLinkInvoiceBtn'),

    
    // expense bridge modal
    expenseModal: byId('expense-modal'),
    expenseCloseBtn: byId('expenseCloseBtn'),
    expenseTitleText: byId('expense-title-text'),
    deleteExpenseBtn: byId('deleteExpenseBtn'),
    editExpenseBtn: byId('editExpenseBtn'),
    expenseActionsBar: byId('expense-edit-actions'),
    expenseEditError: byId('expenseEditError'),

    linkExpenseModal: byId('linkExpenseModal'),
    linkExpenseCloseBtn: byId('linkExpenseCloseBtn'),
    linkExpenseProjectIdInput: byId('linkExpenseProjectIdInput'),
    linkExpenseSelect: byId('linkExpenseSelect'),
    linkExpenseError: byId('linkExpenseError'),
    linkExpenseSaveBtn: byId('linkExpenseSaveBtn'),
    linkExpenseCancelBtn: byId('linkExpenseCancelBtn'),

    linkInvoiceModal: byId('linkInvoiceModal'),
    linkInvoiceCloseBtn: byId('linkInvoiceCloseBtn'),
    linkInvoiceProjectIdInput: byId('linkInvoiceProjectIdInput'),
    linkInvoiceSelect: byId('linkInvoiceSelect'),
    linkInvoiceError: byId('linkInvoiceError'),
    linkInvoiceSaveBtn: byId('linkInvoiceSaveBtn'),
    linkInvoiceCancelBtn: byId('linkInvoiceCancelBtn'),

    expVendorInput: byId('exp-vendor-input'),
    expDescInput: byId('exp-desc-input'),
    expClientInput: byId('exp-client-input'),
    expServiceInput: byId('exp-service-input'),
    expDateInput: byId('exp-date-input'),
    expAmountInput: byId('exp-amount-input'),
    expFrequencyInput: byId('exp-frequency-input'),
    expStatusInput: byId('exp-status-input'),

    saveExpenseBtn: byId('saveExpenseBtn'),
    cancelExpenseBtn: byId('cancelExpenseBtn'),

    expProjectIdInput: byId('exp-project-id-input'),
    expProjectInput: byId('exp-project-input'),


    // activity
    pmActivityTitleInput: byId('pmActivityTitleInput'),
    pmActivityStageInput: byId('pmActivityStageInput'),
    pmActivityDescriptionInput: byId('pmActivityDescriptionInput'),
    pmAddActivityBtn: byId('pmAddActivityBtn'),

    // team assignment
    pmTeamMemberSelect: byId('pmTeamMemberSelect'),
    pmTeamRoleInput: byId('pmTeamRoleInput'),
    pmTeamAgreedInput: byId('pmTeamAgreedInput'),
    pmTeamCurrencyInput: byId('pmTeamCurrencyInput'),
    pmTeamInstallmentsInput: byId('pmTeamInstallmentsInput'),
    pmAddTeamMemberBtn: byId('pmAddTeamMemberBtn'),
    pmTeamNoteInput: byId('pmTeamNoteInput'),

    // payment tracker
    pmPaymentMemberSelect: byId('pmPaymentMemberSelect'),
    pmPaymentDateInput: byId('pmPaymentDateInput'),
    pmPaymentAmountInput: byId('pmPaymentAmountInput'),
    pmPaymentCurrencyInput: byId('pmPaymentCurrencyInput'),
    pmPaymentNoteInput: byId('pmPaymentNoteInput'),
    pmAddTeamPaymentBtn: byId('pmAddTeamPaymentBtn'),

    projectInvoiceModal: byId('projectInvoiceModal'),
    projectInvoiceCloseBtn: byId('projectInvoiceCloseBtn'),
    projectInvoiceProjectIdInput: byId('projectInvoiceProjectIdInput'),
    projectInvoiceProjectInput: byId('projectInvoiceProjectInput'),
    projectInvoiceClientSelect: byId('projectInvoiceClientSelect'),
    projectInvoiceCurrency: byId('projectInvoiceCurrency'),
    projectInvoiceTerms: byId('projectInvoiceTerms'),
    projectInvoiceStart: byId('projectInvoiceStart'),
    projectInvoiceEnd: byId('projectInvoiceEnd'),
    projectInvoiceServiceList: byId('projectInvoiceServiceList'),
    projectInvoiceSubtotalLabel: byId('projectInvoiceSubtotalLabel'),
    projectInvoiceAddServiceBtn: byId('projectInvoiceAddServiceBtn'),
    projectInvoiceGenerateBtn: byId('projectInvoiceGenerateBtn'),
    projectInvoiceCancelBtn: byId('projectInvoiceCancelBtn'),
    projectInvoiceClearBtn: byId('projectInvoiceClearBtn'),
    projectInvoiceError: byId('projectInvoiceError'),
    projectInvoiceProgressModal: byId('projectInvoiceProgressModal'),
    projectInvoiceProgressMsg: byId('projectInvoiceProgressMsg'),

  };

  const state = {
    projects: [],
    filtered: [],
    subcontractors: [],
    sortKey: 'start_date',
    sortDir: 'desc',
    tableSearch: '',
    topSearch: '',
    statusFilter: 'all',
    clientFilter: 'all',
    recordFilter: 'active',
    selectedId: null,
    archiveId: null,
    modalMode: 'view', // view | edit | create
    activeTab: 'summary',
  
    expenseBridgeProjectId: null,
    linkExpenseProjectId: null,
    linkInvoiceProjectId: null,

    invoiceBridgeProjectId: null,
    clientsFull: [],

  };

  const PROJECT_FX_USD_PER = {
    USD: 1,
    JOD: 1.41,
    EUR: 1.09,
    GBP: 1.28,
    SAR: 0.2667,
    AED: 0.2723
  };

  function convertToUSD(amount, currency = 'USD') {
    const rate = PROJECT_FX_USD_PER[String(currency || 'USD').toUpperCase()] ?? 1;
    return safeNum(amount) * rate;
  }

  function fmtMoney(value) {
    const n = Number(value || 0);
    return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function fmtPct(value) {
    const n = Number(value || 0);
    return `${n.toFixed(1)}%`;
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function normalizeStatus(status) {
    const s = String(status || '').trim();
    const match = STATUSES.find((x) => x.toLowerCase() === s.toLowerCase());
    return match || 'Planned';
  }

  function statusClass(status) {
    const s = normalizeStatus(status);
    if (s === 'Active') return 'ok';
    if (s === 'Completed') return 'sent';
    if (s === 'On Hold') return 'warn';
    if (s === 'Cancelled') return 'due';
    return 'null';
  }

  function stageTagClass(stage) {
    const s = String(stage || '').toLowerCase();
    if (['delivery', 'support', 'launch', 'reporting'].includes(s)) return 'sent';
    if (['qa', 'review', 'discovery', 'planning'].includes(s)) return 'warn';
    if (['blocked'].includes(s)) return 'due';
    if (['building', 'design'].includes(s)) return 'ok';
    return 'null';
  }

  function moneyClass(value) {
    const n = Number(value || 0);
    if (n > 0) return 'money-pos';
    if (n < 0) return 'money-neg';
    return 'money-neutral';
  }

  function marginClass(value) {
    const n = Number(value || 0);
    if (n >= 30) return 'good';
    if (n >= 10) return 'mid';
    return 'bad';
  }

  function isArchived(project) {
    return !!(project.archived_at || project.is_archived);
  }

  function safeNum(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function coerceArray(value, fallback = []) {
    if (Array.isArray(value)) return value;
    if (!value) return fallback;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  function uniqueClients(rows) {
    return Array.from(new Set(rows.map((x) => x.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function normalizeExpenseType(type) {
    const t = String(type || '').toLowerCase().trim();
    if (['subcontractor cost', 'subcontractor costs', 'subcontractor', 'freelancer', 'team payment'].includes(t)) {
      return 'Subcontractor Costs';
    }
    return 'Expenses';
  }

  function normalizeTeamMember(item, i = 0) {
    const payments = coerceArray(item.payments, []).map((payment) => ({
      amount: safeNum(payment.amount),
      date: payment.date || '',
      note: payment.note || ''
    }));

    return {
      name: item.name || item.member || `Team Member ${i + 1}`,
      role: item.role || 'Contributor',
      agreed_amount: safeNum(item.agreed_amount),
      installments: safeNum(item.installments || item.payment_plan || 1) || 1,
      note: item.note || '',
      payments
    };
  }

  function projectRevenue(project) {
    return safeNum(project.total_revenue);
  }

  function projectSubcontractorCost(project) {
    return safeNum(project.subcontractor_cost);
  }

  function projectExpenseCost(project) {
    return safeNum(project.expense_cost);
  }

  function projectCost(project) {
    return projectExpenseCost(project) + projectSubcontractorCost(project);
  }

  function projectProfit(project) {
    return projectRevenue(project) - projectCost(project);
  }

  function projectMargin(project) {
    const revenue = projectRevenue(project);
    const profit = projectProfit(project);
    return revenue > 0 ? (profit / revenue) * 100 : 0;
  }

  function projectOpen(project) {
    const s = normalizeStatus(project.status);
    return s === 'Planned' || s === 'Active' || s === 'On Hold';
  }

  function filterSearchText(project) {
    return [
      project.project_code,
      project.project_name,
      project.client_name,
      project.project_manager,
      project.description
    ].join(' ').toLowerCase();
  }

  function showLoader(on) {
    if (!els.loader) return;
    els.loader.style.display = on ? 'grid' : 'none';
    els.loader.setAttribute('aria-hidden', on ? 'false' : 'true');
    els.loader.classList.toggle('hidden', !on);
  }

  

  function sumTeamPayments(teamAllocation = []) {
    return coerceArray(teamAllocation, []).map(normalizeTeamMember).reduce((sum, member) => {
      const paid = coerceArray(member.payments, []).reduce((memberSum, payment) => {
        return memberSum + safeNum(payment.amount);
      }, 0);
      return sum + paid;
    }, 0);
  }

  function sumExpenseLines(expenseLines = [], wantedType = 'Expenses') {
    return coerceArray(expenseLines, []).reduce((sum, item) => {
      return normalizeExpenseType(item.type || item.cost_type) === wantedType
        ? sum + safeNum(item.amount)
        : sum;
    }, 0);
  }

  function buildProject(project, index = 0) {
    const contractValue = safeNum(project.contract_value || 0);

    const revenueLines = coerceArray(project.revenue_lines, []).map((item, i) => ({
      label: item.label || item.title || `Revenue Item ${i + 1}`,
      date: item.date || project.start_date || '',
      amount: safeNum(item.amount),
      note: item.note || ''
    }));

    const expenseLines = coerceArray(project.expense_lines, []).map((item, i) => ({
      label: item.label || item.title || `Expense Item ${i + 1}`,
      date: item.date || project.start_date || '',
      amount: safeNum(item.amount),
      type: normalizeExpenseType(item.type || item.cost_type),
      note: item.note || ''
    }));

    const teamAllocation = coerceArray(project.team_allocation, []).map(normalizeTeamMember);

    const activity = coerceArray(project.activity, []).map((item, i) => ({
      title: item.title || `Update ${i + 1}`,
      date: item.date || project.updated_at || project.created_at || project.start_date || '',
      note: item.note || item.description || '',
      type: item.type || 'Project Update'
    }));

    const derivedRevenue =
      safeNum(project.total_revenue) ||
      revenueLines.reduce((sum, item) => sum + safeNum(item.amount), 0) ||
      contractValue;

    const derivedExpenseCost =
      safeNum(project.expense_cost) ||
      sumExpenseLines(expenseLines, 'Expenses');

    const derivedSubcontractorCost =
      getProjectSubcontractorValue({ team_allocation: teamAllocation }) ||
      safeNum(project.subcontractor_cost) ||
      sumExpenseLines(expenseLines, 'Subcontractor Costs');

    const derivedTotalCost = derivedExpenseCost + derivedSubcontractorCost;
    const derivedTotalProfit = derivedRevenue - derivedTotalCost;

    const costBreakdown = [
      { label: 'Expenses', amount: derivedExpenseCost },
      { label: 'Subcontractor Costs', amount: derivedSubcontractorCost }
    ];

    return {
      id: project.id,
      project_code: project.project_code || 'Auto-generated',
      project_name: project.project_name || 'Untitled Project',
      client_name: project.client_name || 'Unknown Client',
      description: project.description || 'No project description added yet.',
      status: normalizeStatus(project.status),
      contract_value: contractValue,
      total_revenue: derivedRevenue,
      total_cost: derivedTotalCost,
      total_profit: derivedTotalProfit,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      project_manager: project.project_manager || 'Unassigned',
      cost_type: 'Calculated',
      team_allocation: teamAllocation,
      activity,
      revenue_lines: revenueLines,
      expense_lines: expenseLines,
      cost_breakdown: costBreakdown,
      subcontractor_cost: derivedSubcontractorCost,
      expense_cost: derivedExpenseCost,
      archived_at: project.archived_at || null,
      is_archived: !!project.is_archived,
      created_at: project.created_at || new Date().toISOString(),
      updated_at: project.updated_at || project.created_at || new Date().toISOString(),
      source: project.source || 'projects'
    };
  }

  async function fetchExpenseTotalsByProject() {
    const { data, error } = await sb
      .from('expenses')
      .select('project_id, amount')
      .not('project_id', 'is', null);

    if (error) throw error;

    const totals = new Map();

    for (const row of data || []) {
      const key = String(row.project_id || '');
      if (!key) continue;
      totals.set(key, (totals.get(key) || 0) + safeNum(row.amount));
    }

    return totals;
  }

  async function fetchProjects() {
    const [projectsRes, expenseTotals] = await Promise.all([
      sb
        .from('projects')
        .select(`
          id,
          project_code,
          project_name,
          client_name,
          description,
          status,
          contract_value,
          total_revenue,
          total_cost,
          total_profit,
          start_date,
          end_date,
          project_manager,
          subcontractor_cost,
          expense_cost,
          team_allocation,
          activity,
          revenue_lines,
          expense_lines,
          archived_at,
          is_archived,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false }),
      fetchExpenseTotalsByProject()
    ]);

    if (projectsRes.error) throw projectsRes.error;

    const rows = (projectsRes.data || []).map((row) => {
      const realExpenseCost = expenseTotals.get(String(row.id)) ?? safeNum(row.expense_cost);
      const subcontractorCost = safeNum(row.subcontractor_cost);
      const totalRevenue = safeNum(row.total_revenue) || safeNum(row.contract_value);
      const totalCost = realExpenseCost + subcontractorCost;
      const totalProfit = totalRevenue - totalCost;

      return {
        ...row,
        expense_cost: realExpenseCost,
        total_cost: totalCost,
        total_profit: totalProfit
      };
    });

    return rows.map(buildProject);
  }

  function populateClientFilter() {
    if (!els.clientFilter) return;
    const current = els.clientFilter.value;
    const clients = uniqueClients(state.projects);
    els.clientFilter.innerHTML = '<option value="all">All Clients</option>' + clients.map((client) => (
      `<option value="${escapeHTML(client)}">${escapeHTML(client)}</option>`
    )).join('');
    els.clientFilter.value = clients.includes(current) ? current : 'all';
  }

  async function loadClientsForProjectSelect() {
    const select = els.projectClientInput;
    const invoiceSelect = els.projectInvoiceClientSelect;

    const { data, error } = await sb
      .from('clients')
      .select('id, name, client_no')
      .order('name', { ascending: true });

    if (error) {
      console.error('[projects] loadClientsForProjectSelect failed:', error);
      return;
    }

    state.clientsFull = (data || []).map(row => ({
      id: row.id,
      name: String(row.name || '').trim(),
      client_no: row.client_no || ''
    })).filter(c => c.name);

    if (select) {
      select.innerHTML =
        `<option value="">Select client</option>` +
        state.clientsFull.map(c => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`).join('');
    }

    if (invoiceSelect) {
      invoiceSelect.innerHTML =
        state.clientsFull.map(c =>
          `<option value="${c.id}">${escapeHTML(c.client_no || '')}${c.client_no ? ' — ' : ''}${escapeHTML(c.name)}</option>`
        ).join('');
    }
  }


  async function loadSubcontractorsForTeamSelect() {
    const select = els.pmTeamMemberSelect;
    if (!select) return;

    const { data, error } = await sb
      .from('subcontractors')
      .select('id, name, status')
      .order('name', { ascending: true });

    if (error) {
      console.error('[projects] loadSubcontractorsForTeamSelect failed:', error);
      select.innerHTML = `<option value="">No subcontractors found</option>`;
      return;
    }

    const activeSubs = (data || []).filter(row => (row.name || '').trim());

    state.subcontractors = activeSubs.map(row => ({
      id: row.id,
      name: String(row.name || '').trim(),
      status: row.status || 'Active'
    }));

    select.innerHTML =
      `<option value="">Select subcontractor</option>` +
      state.subcontractors.map(sub => `
        <option value="${escapeHTML(sub.id)}">${escapeHTML(sub.name)}</option>
      `).join('');
  }


  function applyFilters() {
    const query = `${state.tableSearch} ${state.topSearch}`.trim().toLowerCase();

    const filtered = state.projects.filter((project) => {
      const archived = isArchived(project);
      if (state.recordFilter === 'active' && archived) return false;
      if (state.recordFilter === 'archived' && !archived) return false;
      if (state.statusFilter !== 'all' && normalizeStatus(project.status) !== state.statusFilter) return false;
      if (state.clientFilter !== 'all' && project.client_name !== state.clientFilter) return false;
      if (query && !filterSearchText(project).includes(query)) return false;
      return true;
    });

    filtered.sort((a, b) => sortCompare(a, b, state.sortKey, state.sortDir));
    state.filtered = filtered;
  }

  function sortCompare(a, b, key, dir = 'asc') {
    const multiplier = dir === 'desc' ? -1 : 1;
    let av;
    let bv;

    if (key === 'status') {
      av = STATUS_RANK[normalizeStatus(a.status)] || 999;
      bv = STATUS_RANK[normalizeStatus(b.status)] || 999;
    } else if (key === 'contract_value') {
      av = safeNum(a.contract_value);
      bv = safeNum(b.contract_value);
    } else if (key === 'total_revenue') {
      av = projectRevenue(a);
      bv = projectRevenue(b);
    } else if (key === 'total_cost') {
      av = projectCost(a);
      bv = projectCost(b);
    } else if (key === 'total_profit') {
      av = projectProfit(a);
      bv = projectProfit(b);
    } else if (['start_date', 'end_date', 'created_at', 'updated_at'].includes(key)) {
      av = a[key] ? new Date(a[key]).getTime() : 0;
      bv = b[key] ? new Date(b[key]).getTime() : 0;
    } else {
      av = String(a[key] || '').toLowerCase();
      bv = String(b[key] || '').toLowerCase();
    }

    if (av < bv) return -1 * multiplier;
    if (av > bv) return 1 * multiplier;
    return 0;
  }

  function renderTable() {
    if (!els.tbody) return;

    if (!state.filtered.length) {
      els.tbody.innerHTML = `<tr class="table-empty-row"><td colspan="11">No projects match the current filters.</td></tr>`;
      renderTableSummary([]);
      return;
    }

    els.tbody.innerHTML = state.filtered.map((project) => {
      const revenue = projectRevenue(project);
      const cost = projectCost(project);
      const profit = projectProfit(project);

      return `
        <tr data-id="${project.id}">
          <td>${escapeHTML(project.project_code)}</td>
          <td>
            <div class="project-main">
              <span class="project-name">${escapeHTML(project.project_name)}</span>
              <span class="project-sub">${escapeHTML(project.project_manager || 'Unassigned')}</span>
            </div>
          </td>
          <td>${escapeHTML(project.client_name)}</td>
          <td><span class="tag ${statusClass(project.status)} status-click" data-status-pill="${project.id}">${escapeHTML(normalizeStatus(project.status))}</span></td>
          <td>${fmtMoney(project.contract_value)}</td>
          <td>${fmtMoney(revenue)}</td>
          <td>${fmtMoney(cost)}</td>
          <td><span class="${moneyClass(profit)}">${fmtMoney(profit)}</span></td>
          <td>${fmtDate(project.start_date)}</td>
          <td>${fmtDate(project.end_date)}</td>
          <td>
            <div class="row-actions">
              <button class="mini project-view-btn" data-id="${project.id}">View</button>
              <button class="mini ghost project-edit-btn" data-id="${project.id}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateSortIndicators();
    renderTableSummary(state.filtered);
  }

  function renderTableSummary(rows) {
    const revenue = rows.reduce((sum, item) => sum + projectRevenue(item), 0);
    const cost = rows.reduce((sum, item) => sum + projectCost(item), 0);
    const profit = rows.reduce((sum, item) => sum + projectProfit(item), 0);

    if (els.visibleProjectsCount) els.visibleProjectsCount.textContent = String(rows.length);
    if (els.visibleRevenue) els.visibleRevenue.textContent = fmtMoney(revenue);
    if (els.visibleCost) els.visibleCost.textContent = fmtMoney(cost);
    if (els.visibleProfit) els.visibleProfit.textContent = fmtMoney(profit);
  }

  function updateSortIndicators() {
    $$('#projectsTable th.sortable').forEach((th) => {
      const key = th.dataset.sort;
      th.classList.remove('sort-asc', 'sort-desc');
      if (key === state.sortKey) th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    });
  }

  function renderKPIs() {
    const visible = state.filtered;
    const totalProjects = visible.length;
    const archivedCount = visible.filter(isArchived).length;
    const activeCount = visible.filter((project) => normalizeStatus(project.status) === 'Active' && !isArchived(project)).length;
    const openCount = visible.filter((project) => projectOpen(project) && !isArchived(project)).length;

    const revenue = visible.reduce((sum, project) => sum + projectRevenue(project), 0);
    const cost = visible.reduce((sum, project) => sum + projectCost(project), 0);
    const profit = visible.reduce((sum, project) => sum + projectProfit(project), 0);
    const avgRevenue = totalProjects ? revenue / totalProjects : 0;
    const avgCost = totalProjects ? cost / totalProjects : 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const costShare = revenue > 0 ? (cost / revenue) * 100 : 0;
    const healthyProjects = visible.filter((project) => projectMargin(project) >= 20 && !isArchived(project)).length;

    if (els.kpiActiveProjects) els.kpiActiveProjects.textContent = String(activeCount);
    if (els.kpiActiveProjectsCount) els.kpiActiveProjectsCount.textContent = String(activeCount);
    if (els.kpiOpenVsTotal) els.kpiOpenVsTotal.textContent = `${openCount} of ${totalProjects} open`;
    if (els.kpiArchivedCount) els.kpiArchivedCount.textContent = `${archivedCount} archived`;

    if (els.kpiProjectRevenue) els.kpiProjectRevenue.textContent = fmtMoney(revenue);
    if (els.kpiRevenueMargin) {
      els.kpiRevenueMargin.textContent = fmtPct(margin);
      els.kpiRevenueMargin.className = `chip money ${marginClass(margin)}`;
    }
    if (els.kpiAvgRevenue) els.kpiAvgRevenue.textContent = `Avg ${fmtMoney(avgRevenue)} per project`;
    if (els.kpiRevenueSubtitle) els.kpiRevenueSubtitle.textContent = totalProjects ? 'Across visible projects' : 'No visible projects';

    if (els.kpiProjectCost) els.kpiProjectCost.textContent = fmtMoney(cost);
    if (els.kpiCostShare) {
      els.kpiCostShare.textContent = fmtPct(costShare);
      els.kpiCostShare.className = `chip money ${marginClass(Math.max(0, 100 - costShare))}`;
    }
    if (els.kpiAvgCost) els.kpiAvgCost.textContent = `Avg ${fmtMoney(avgCost)} per project`;
    if (els.kpiCostSubtitle) els.kpiCostSubtitle.textContent = revenue ? 'Relative to visible revenue' : 'Waiting for revenue data';

    if (els.kpiProjectProfit) {
      els.kpiProjectProfit.textContent = fmtMoney(profit);
      els.kpiProjectProfit.className = `kpi-num ${moneyClass(profit)}`;
    }
    if (els.kpiProfitMargin) {
      els.kpiProfitMargin.textContent = fmtPct(margin);
      els.kpiProfitMargin.className = `chip money ${marginClass(margin)}`;
    }
    if (els.kpiHealthyProjects) els.kpiHealthyProjects.textContent = `${healthyProjects} healthy projects`;
    if (els.kpiProfitSubtitle) els.kpiProfitSubtitle.textContent = margin >= 20 ? 'Strong blended margin' : 'Watch blended margin';
  }

  function renderHealthSummary() {
    if (!els.projectHealthList) return;

    const projects = state.filtered
      .filter((project) => !isArchived(project))
      .sort((a, b) => projectMargin(b) - projectMargin(a))
      .slice(0, 5);

    if (!projects.length) {
      els.projectHealthList.innerHTML = '<div class="empty-state">No project health data yet.</div>';
      return;
    }

    els.projectHealthList.innerHTML = projects.map((project) => {
      const margin = projectMargin(project);
      const progressClass = marginClass(margin);
      const width = Math.max(6, Math.min(100, margin > 0 ? margin : 6));
      return `
        <div class="health-item">
          <div class="health-top">
            <div>
              <div class="health-name">${escapeHTML(project.project_name)}</div>
              <div class="health-sub">${escapeHTML(project.client_name)} · ${escapeHTML(project.project_manager || 'Unassigned')}</div>
            </div>
            <span class="tag ${statusClass(project.status)}">${escapeHTML(normalizeStatus(project.status))}</span>
          </div>
          <div class="health-meta">
            <span>Profit ${fmtMoney(projectProfit(project))}</span>
            <span>•</span>
            <span>Margin ${fmtPct(margin)}</span>
          </div>
          <div class="progress-track"><div class="progress-bar ${progressClass}" style="width:${width}%"></div></div>
        </div>
      `;
    }).join('');
  }

  function flattenActivity(projects) {
    const rows = [];
    projects.forEach((project) => {
      const items = coerceArray(project.activity, []);
      items.forEach((item) => {
        rows.push({
          projectId: project.id,
          project_name: project.project_name,
          client_name: project.client_name,
          title: item.title || 'Update',
          note: item.note || item.description || '',
          date: item.date || project.updated_at || project.start_date || '',
          type: item.type || 'Project Update',
          status: project.status
        });
      });
    });
    return rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  function renderRecentActivity() {
    if (!els.recentActivityList) return;

    const items = flattenActivity(state.filtered).slice(0, 6);
    if (!items.length) {
      els.recentActivityList.innerHTML = '<div class="empty-state">No activity yet.</div>';
      return;
    }

    els.recentActivityList.innerHTML = items.map((item) => `
      <div class="activity-item">
        <div class="activity-top">
          <div>
            <div class="activity-title">${escapeHTML(item.title)}</div>
            <div class="activity-sub">${escapeHTML(item.project_name)} · ${escapeHTML(item.client_name)}</div>
          </div>
          <span class="tag ${statusClass(item.status)}">${escapeHTML(normalizeStatus(item.status))}</span>
        </div>
        <div class="activity-meta">
          <span>${fmtDate(item.date)}</span>
          <span>•</span>
          <span>${escapeHTML(item.type)}</span>
        </div>
        <div class="muted" style="font-size:13px;line-height:1.55;">${escapeHTML(item.note || 'No extra note.')}</div>
      </div>
    `).join('');
  }

  function renderAll() {
    applyFilters();
    renderKPIs();
    renderHealthSummary();
    renderRecentActivity();
    renderTable();
    
  }

  function findProject(id) {
    return state.projects.find((project) => String(project.id) === String(id)) || null;
  }

  function setModalMode(mode) {
    state.modalMode = mode;
    els.modal?.classList.toggle('editing', mode !== 'view');

    if (mode === 'view') {
      if (els.modalActionsBar) els.modalActionsBar.style.display = 'none';
    } else {
      if (els.modalActionsBar) els.modalActionsBar.style.display = 'flex';
    }
  }

  function setActiveModalTab(tab) {
    state.activeTab = tab;
    $$('.tab-btn', els.tabsWrap || document).forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    $$('.modal-tab-panel', els.modal).forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab));
  }

  function renderDataList(target, items, mapper) {
    if (!target) return;
    if (!items.length) {
      target.innerHTML = '<div class="data-item"><span class="data-item-title">Nothing to show yet.</span></div>';
      return;
    }
    target.innerHTML = items.map(mapper).join('');
  }

  async function fetchProjectInvoices(projectId) {
    if (!projectId) return [];

    const { data, error } = await sb
      .from('invoices')
      .select(`
        id, invoice_no, issue_date, due_date, currency,
        subtotal, tax, total, status, coverage_period, project_id,
        clients(name)
      `)
      .eq('project_id', projectId)
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('[projects] fetchProjectInvoices failed:', error);
      return [];
    }

    return data || [];
  }

  async function fetchProjectExpenses(projectId) {
    if (!projectId) return [];

    const { data, error } = await sb
      .from('expenses')
      .select(`
        id, vendor, description, client_name, service,
        expense_date, amount, frequency, status, project_id
      `)
      .eq('project_id', projectId)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('[projects] fetchProjectExpenses failed:', error);
      return [];
    }

    return data || [];
  }

  function invoiceStatusClass(s) {
    const v = (s || '').toLowerCase();
    return v === 'paid' ? 'ok' :
      ['not paid','unpaid','overdue'].includes(v) ? 'due' :
      v === 'partial payment' ? 'partial' :
      v === 'due soon' ? 'warn' :
      v === 'sent' ? 'sent' :
      ['cancelled','canceled'].includes(v) ? 'null' : 'null';
  }

  function renderProjectInvoices(invoices = []) {
    if (!els.pmRevenueList) return;

    if (!invoices.length) {
      els.pmRevenueList.innerHTML = '<div class="data-item"><span class="data-item-title-2">No project invoices yet.</span></div>';
      return;
    }

    els.pmRevenueList.innerHTML = invoices.map((inv) => {
      const total = Number(inv.total ?? (Number(inv.subtotal || 0) + Number(inv.tax || 0)));
      const statusCls = invoiceStatusClass(inv.status);
      const clientName = inv.clients?.name || '—';
      const coverage = inv.coverage_period ? ` · ${escapeHTML(inv.coverage_period)}` : '';
      return `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-item-title">Invoice #${escapeHTML(inv.invoice_no || '—')} · ${escapeHTML(clientName)}</div>
            <div class="data-item-sub">${fmtDate(inv.issue_date)}${coverage}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            <div class="data-item-value">${fmtMoney(total)}</div>
            <span class="tag ${statusCls} inv-status-pill" data-inv-id="${inv.id}" style="cursor:pointer;" title="Click to change status">${escapeHTML(inv.status || '—')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const PROJECT_INVOICE_FX_USD_PER = {
    USD: 1,
    CAD: 0.74,
    EUR: 1.09,
    GBP: 1.28,
    JOD: 1.41,
    AED: 0.2723,
    SAR: 0.2667
  };

  function projectInvoiceToUSD(amount, from = 'USD') {
    const rate = PROJECT_INVOICE_FX_USD_PER[(from || 'USD').toUpperCase()] ?? 1;
    return Number(amount || 0) * rate;
  }

  function projectInvoiceTodayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function showModalEl(el) {
    if (!el) return;
    el.style.display = '';
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
  }

  function hideModalEl(el) {
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }

  function addProjectInvoiceServiceRow(desc = '', price = '') {
    if (!els.projectInvoiceServiceList) return;

    const row = document.createElement('div');
    row.className = 'service-row';
    row.innerHTML = `
      <input type="text" class="svc-desc" placeholder="Service description" value="${escapeHTML(desc)}" />
      <input type="number" class="svc-price" placeholder="0.00" min="0" step="0.01" value="${escapeHTML(price)}" />
      <button class="remove-btn" type="button" title="Remove">−</button>
    `;

    els.projectInvoiceServiceList.appendChild(row);

    row.querySelector('.svc-price')?.addEventListener('input', updateProjectInvoiceTotals);
    row.querySelector('.remove-btn')?.addEventListener('click', () => {
      row.remove();
      updateProjectInvoiceTotals();
    });

    updateProjectInvoiceTotals();
  }


  function readProjectInvoiceLines() {
    const root = els.projectInvoiceServiceList;
    if (!root) return [];

    return Array.from(root.querySelectorAll('.service-row')).map(row => {
      const desc = row.querySelector('.svc-desc')?.value.trim() || '';
      const price = parseFloat(row.querySelector('.svc-price')?.value || '0');
      return {
        desc,
        price: Number.isFinite(price) ? price : 0
      };
    }).filter(x => x.desc || x.price > 0);
  }

  function updateProjectInvoiceTotals() {
    const lines = readProjectInvoiceLines();
    const subtotal = lines.reduce((sum, line) => sum + (line.price || 0), 0);
    const cur = els.projectInvoiceCurrency?.value || 'USD';

    if (els.projectInvoiceSubtotalLabel) {
      els.projectInvoiceSubtotalLabel.textContent = `${subtotal.toFixed(2)} ${cur}`;
    }
  }


  function clearProjectInvoiceForm() {
    if (els.projectInvoiceError) els.projectInvoiceError.textContent = '';
    if (els.projectInvoiceServiceList) els.projectInvoiceServiceList.innerHTML = '';
    if (els.projectInvoiceCurrency) els.projectInvoiceCurrency.value = 'USD';
    if (els.projectInvoiceTerms) els.projectInvoiceTerms.value = 'monthly';
    if (els.projectInvoiceStart) els.projectInvoiceStart.value = '';
    if (els.projectInvoiceEnd) els.projectInvoiceEnd.value = '';
    if (els.projectInvoiceSubtotalLabel) els.projectInvoiceSubtotalLabel.textContent = '0.00 USD';
  }



  function closeProjectInvoiceModal() {
    hideModalEl(els.projectInvoiceModal);
    state.invoiceBridgeProjectId = null;
  }


  function renderProjectExpenses(expenses = []) {
    if (!els.pmExpenseList) return;

    if (!expenses.length) {
      els.pmExpenseList.innerHTML = '<div class="data-item"><span class="data-item-title-2">No project expenses yet.</span></div>';
      return;
    }

    els.pmExpenseList.innerHTML = expenses.map((exp) => `
      <div class="data-item">
        <div class="data-item-main">
          <div class="data-item-title">${escapeHTML(exp.vendor || 'Vendor')} — ${escapeHTML(exp.description || 'Expense')}</div>
          <div class="data-item-sub">${fmtDate(exp.expense_date)} · ${escapeHTML(exp.service || '—')} · ${escapeHTML(exp.status || '—')}</div>
        </div>
        <div class="data-item-value">${fmtMoney(exp.amount)}</div>
      </div>
    `).join('');
  }

  function todayYMD() {
    return new Date().toISOString().slice(0, 10);
  }

  function closeProjectExpenseModal() {
    els.expenseModal?.classList.remove('show', 'editing');
    if (els.expenseEditError) els.expenseEditError.textContent = '';
    state.expenseBridgeProjectId = null;
  }

  function currentYearRange() {
    const now = new Date();
    const year = now.getFullYear();
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`
    };
  }

  function closeLinkExpenseModal() {
    els.linkExpenseModal?.classList.remove('show');
    els.linkExpenseModal?.setAttribute('aria-hidden', 'true');
    if (els.linkExpenseError) els.linkExpenseError.textContent = '';
    if (els.linkExpenseSelect) {
      els.linkExpenseSelect.innerHTML = '<option value="">Select an expense</option>';
      els.linkExpenseSelect.value = '';
    }
    if (els.linkExpenseProjectIdInput) els.linkExpenseProjectIdInput.value = '';
    state.linkExpenseProjectId = null;
  }

  async function openLinkExpenseModal(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.linkExpenseProjectId = project.id;
    if (els.linkExpenseProjectIdInput) els.linkExpenseProjectIdInput.value = project.id;
    if (els.linkExpenseError) els.linkExpenseError.textContent = '';

    const { start, end } = currentYearRange();

    try {
      const { data, error } = await sb
        .from('expenses')
        .select('id, vendor, description, expense_date, amount, client_name, project_id')
        .eq('client_name', project.client_name)
        .is('project_id', null)
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const rows = data || [];

      if (!els.linkExpenseSelect) return;

      els.linkExpenseSelect.innerHTML =
        '<option value="">Select an expense</option>' +
        rows.map((row) => {
          const label = `${fmtMoney(row.amount)}: ${row.description || 'No description'} - ${row.vendor || 'Unknown vendor'} - ${fmtDate(row.expense_date)}`;
          return `<option value="${row.id}">${escapeHTML(label)}</option>`;
        }).join('');

      els.linkExpenseModal?.classList.add('show');
      els.linkExpenseModal?.setAttribute('aria-hidden', 'false');
    } catch (error) {
      console.error('[projects] openLinkExpenseModal failed:', error);
      if (els.linkExpenseError) {
        els.linkExpenseError.textContent = error?.message || 'Failed to load available expenses.';
      }
      els.linkExpenseModal?.classList.add('show');
      els.linkExpenseModal?.setAttribute('aria-hidden', 'false');
    }
  }

  async function saveLinkedExpenseToProject() {
    const project = findProject(state.linkExpenseProjectId || state.selectedId);
    if (!project) return;

    const expenseId = els.linkExpenseSelect?.value || '';

    if (els.linkExpenseError) els.linkExpenseError.textContent = '';

    if (!expenseId) {
      if (els.linkExpenseError) els.linkExpenseError.textContent = 'Please select an expense.';
      return;
    }

    try {
      const { error } = await sb
        .from('expenses')
        .update({
          project_id: project.id
        })
        .eq('id', expenseId);

      if (error) throw error;

      await refreshProjectLinkedFinancials(project.id);

      await logProjectActivity(project.id, {
        title: 'Expense linked',
        type: 'Expense',
        note: 'An existing expense was linked to this project'
      });

      closeLinkExpenseModal();
      showToast('Expense linked to project');
    } catch (error) {
      console.error('[projects] saveLinkedExpenseToProject failed:', error);
      if (els.linkExpenseError) {
        els.linkExpenseError.textContent = error?.message || 'Failed to link expense.';
      }
    }
  }

  function closeLinkInvoiceModal() {
    els.linkInvoiceModal?.classList.remove('show');
    els.linkInvoiceModal?.setAttribute('aria-hidden', 'true');
    if (els.linkInvoiceError) els.linkInvoiceError.textContent = '';
    if (els.linkInvoiceSelect) {
      els.linkInvoiceSelect.innerHTML = '<option value="">Select an invoice</option>';
      els.linkInvoiceSelect.value = '';
    }
    if (els.linkInvoiceProjectIdInput) els.linkInvoiceProjectIdInput.value = '';
    state.linkInvoiceProjectId = null;
  }

  async function openLinkInvoiceModal(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.linkInvoiceProjectId = project.id;
    if (els.linkInvoiceProjectIdInput) els.linkInvoiceProjectIdInput.value = project.id;
    if (els.linkInvoiceError) els.linkInvoiceError.textContent = '';

    const now = new Date();
    const thisYear = now.getFullYear();
    const prevYear = thisYear - 1;
    const start = `${prevYear}-01-01`;
    const end   = `${thisYear}-12-31`;

    const matchedClient = state.clientsFull.find(c => c.name === project.client_name);
    if (!matchedClient) {
      if (els.linkInvoiceError) els.linkInvoiceError.textContent = 'Could not resolve client — make sure the project has a valid client assigned.';
      els.linkInvoiceModal?.classList.add('show');
      els.linkInvoiceModal?.setAttribute('aria-hidden', 'false');
      return;
    }

    try {
      const { data, error } = await sb
        .from('invoices')
        .select('id, invoice_no, total, subtotal, tax, issue_date, coverage_period, status, clients(name)')
        .eq('client_id', matchedClient.id)
        .is('project_id', null)
        .gte('issue_date', start)
        .lte('issue_date', end)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const rows = data || [];

      if (!els.linkInvoiceSelect) return;

      els.linkInvoiceSelect.innerHTML =
        '<option value="">Select an invoice</option>' +
        rows.map((row) => {
          const total = Number(row.total ?? (Number(row.subtotal || 0) + Number(row.tax || 0)));
          const clientName = row.clients?.name || matchedClient.name;
          const coverage = row.coverage_period ? ` — ${row.coverage_period}` : '';
          const label = `${escapeHTML(row.invoice_no || '—')} ${escapeHTML(clientName)} — ${fmtMoney(total)} (${fmtDate(row.issue_date)})${coverage}`;
          return `<option value="${row.id}">${label}</option>`;
        }).join('');

      els.linkInvoiceModal?.classList.add('show');
      els.linkInvoiceModal?.setAttribute('aria-hidden', 'false');
    } catch (err) {
      console.error('[projects] openLinkInvoiceModal failed:', err);
      if (els.linkInvoiceError) els.linkInvoiceError.textContent = err?.message || 'Failed to load invoices.';
      els.linkInvoiceModal?.classList.add('show');
      els.linkInvoiceModal?.setAttribute('aria-hidden', 'false');
    }
  }

  async function saveLinkedInvoice() {
    const project = findProject(state.linkInvoiceProjectId || state.selectedId);
    if (!project) return;

    const invoiceId = els.linkInvoiceSelect?.value || '';

    if (els.linkInvoiceError) els.linkInvoiceError.textContent = '';

    if (!invoiceId) {
      if (els.linkInvoiceError) els.linkInvoiceError.textContent = 'Please select an invoice.';
      return;
    }

    try {
      const { error } = await sb
        .from('invoices')
        .update({ project_id: project.id })
        .eq('id', invoiceId);

      if (error) throw error;

      const [invoiceRows, expenseRows] = await Promise.all([
        fetchProjectInvoices(project.id),
        fetchProjectExpenses(project.id)
      ]);

      renderProjectInvoices(invoiceRows);
      applyLiveFinancialSummary(project, invoiceRows, expenseRows);

      await logProjectActivity(project.id, {
        title: 'Invoice linked',
        type: 'Revenue',
        note: 'An existing invoice was linked to this project'
      });

      closeLinkInvoiceModal();
      showToast('Invoice linked to project');
    } catch (err) {
      console.error('[projects] saveLinkedInvoice failed:', err);
      if (els.linkInvoiceError) els.linkInvoiceError.textContent = err?.message || 'Failed to link invoice.';
    }
  }

  async function updateInvoiceStatus(invoiceId, newStatus) {
    const candidates = [newStatus];
    if (newStatus === 'Not Paid') candidates.push('Not paid', 'Unpaid', 'Pending', 'Due');
    if (newStatus === 'Cancelled') candidates.push('Canceled');

    for (const val of candidates) {
      const { error } = await sb.from('invoices').update({ status: val }).eq('id', invoiceId);
      if (!error) return { ok: true, value: val };
      if (!/invoices_status_check/i.test(error.message)) return { ok: false, error };
    }
    return { ok: false, error: new Error('Status value not allowed by database.') };
  }

  function openProjectExpenseModal(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.expenseBridgeProjectId = project.id;

    if (els.expenseTitleText) {
      els.expenseTitleText.textContent = `New Expense — ${project.project_name}`;
    }

    if (els.expVendorInput) els.expVendorInput.value = '';
    if (els.expDescInput) els.expDescInput.value = '';
    if (els.expClientInput) els.expClientInput.value = project.client_name || '';
    if (els.expServiceInput) els.expServiceInput.value = els.expServiceInput.querySelector('option')?.value || 'other';
    if (els.expDateInput) els.expDateInput.value = todayYMD();
    if (els.expAmountInput) els.expAmountInput.value = '';
    if (els.expFrequencyInput) els.expFrequencyInput.value = 'Monthly';
    if (els.expStatusInput) els.expStatusInput.value = 'Unpaid';

    if (els.expenseEditError) els.expenseEditError.textContent = '';
    if (els.expenseActionsBar) els.expenseActionsBar.style.display = 'flex';

    if (els.editExpenseBtn) els.editExpenseBtn.style.display = 'none';
    if (els.deleteExpenseBtn) els.deleteExpenseBtn.style.display = 'none';

    if (els.expProjectIdInput) els.expProjectIdInput.value = project.id || '';
    if (els.expProjectInput) els.expProjectInput.value = project.project_name || '';
    if (els.expClientInput) els.expClientInput.value = project.client_name || '';


    els.expenseModal?.classList.add('editing', 'show');
  }

  async function refreshProjectLinkedFinancials(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    const [invoiceRows, expenseRows] = await Promise.all([
      fetchProjectInvoices(project.id),
      fetchProjectExpenses(project.id)
    ]);

    const totalRevenue = getProjectRevenueValue(project, invoiceRows);
    const expenseCost = getProjectExpenseValue(expenseRows);
    const subcontractorCost = getProjectSubcontractorValue(project);
    const totalCost = expenseCost + subcontractorCost;
    const totalProfit = totalRevenue - totalCost;
    const updatedAt = new Date().toISOString();

    try {
      const { data, error } = await sb
        .from('projects')
        .update({
          total_revenue: totalRevenue,
          expense_cost: expenseCost,
          subcontractor_cost: subcontractorCost,
          total_cost: totalCost,
          total_profit: totalProfit,
          updated_at: updatedAt
        })
        .eq('id', project.id)
        .select()
        .single();

      if (error) throw error;

      const refreshedProject = buildProject(data);
      Object.assign(project, refreshedProject);

      if (String(state.selectedId) === String(project.id)) {
        renderProjectInvoices(invoiceRows);
        renderProjectExpenses(expenseRows);
        applyLiveFinancialSummary(project, invoiceRows, expenseRows);
      }

      renderAll();
    } catch (error) {
      console.error('[projects] refreshProjectLinkedFinancials failed:', error);

      // fallback so UI still updates even if DB update fails
      project.total_revenue = totalRevenue;
      project.expense_cost = expenseCost;
      project.subcontractor_cost = subcontractorCost;
      project.total_cost = totalCost;
      project.total_profit = totalProfit;
      project.updated_at = updatedAt;

      if (String(state.selectedId) === String(project.id)) {
        renderProjectInvoices(invoiceRows);
        renderProjectExpenses(expenseRows);
        applyLiveFinancialSummary(project, invoiceRows, expenseRows);
      }

      renderAll();
    }
  }

  async function saveProjectExpenseBridge() {
    const project = findProject(state.expenseBridgeProjectId || state.selectedId);
    if (!project) return;

    if (els.expenseEditError) els.expenseEditError.textContent = '';

    const vendor = els.expVendorInput?.value.trim() || '';
    const description = els.expDescInput?.value.trim() || '';
    const clientName = els.expClientInput?.value.trim() || project.client_name || '';
    const service = els.expServiceInput?.value || 'other';
    const expenseDate = els.expDateInput?.value || '';
    const amount = parseFloat(els.expAmountInput?.value || '');
    const frequency = els.expFrequencyInput?.value || 'Monthly';
    const status = els.expStatusInput?.value || 'Unpaid';

    if (!vendor) {
      els.expenseEditError.textContent = 'Vendor is required.';
      return;
    }

    if (!expenseDate) {
      els.expenseEditError.textContent = 'Date is required.';
      return;
    }

    if (Number.isNaN(amount)) {
      els.expenseEditError.textContent = 'Amount must be a number.';
      return;
    }

    const payload = {
      vendor,
      description,
      client_name: clientName,
      service,
      expense_date: expenseDate,
      amount,
      frequency,
      status,
      project_id: project.id
    };

    try {
      const { error } = await sb
        .from('expenses')
        .insert(payload);

      if (error) throw error;

      await refreshProjectLinkedFinancials(project.id);
      closeProjectExpenseModal();
      showToast('Expense added to project');
    } catch (error) {
      console.error('[projects] save project expense failed:', error);
      els.expenseEditError.textContent = error?.message || 'Failed to save expense.';
    }

    await logProjectActivity(project.id, {
      title: 'Expense added',
      type: 'Expense',
      note: `${vendor} · $${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    });
  }

  function openProjectInvoiceModal(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.invoiceBridgeProjectId = project.id;

    if (els.projectInvoiceProjectIdInput) {
      els.projectInvoiceProjectIdInput.value = project.id || '';
    }

    clearProjectInvoiceForm();

    if (els.projectInvoiceStart) {
      els.projectInvoiceStart.value = '';
    }

    if (els.projectInvoiceEnd) {
      els.projectInvoiceEnd.value = '';
    }

    const matchedClient = state.clientsFull.find(c => c.name === project.client_name);
    if (matchedClient && els.projectInvoiceClientSelect) {
      els.projectInvoiceClientSelect.value = matchedClient.id;
    }

    addProjectInvoiceServiceRow('', '');

    if (els.projectInvoiceError) els.projectInvoiceError.textContent = '';
    showModalEl(els.projectInvoiceModal);
  }



  async function ensureProjectInvoiceLibs() {
    if (!window.docxtemplater && !window.Docxtemplater) {
      await loadScriptOnceExact('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.43.0/docxtemplater.min.js');
    }
    if (!window.PizZip) {
      await loadScriptOnceExact('https://cdn.jsdelivr.net/npm/pizzip@3.1.7/dist/pizzip.min.js');
    }
    if (!window.PizZip) throw new Error('PizZip not loaded');
    if (!window.docxtemplater && !window.Docxtemplater) throw new Error('docxtemplater not loaded');
  }

  async function saveProjectInvoiceBridge() {
    const project = findProject(state.invoiceBridgeProjectId || state.selectedId);
    if (!project) return;

    if (els.projectInvoiceGenerateBtn?.disabled) return;
    if (els.projectInvoiceError) els.projectInvoiceError.textContent = '';

    try {
      const client_id = els.projectInvoiceClientSelect?.value;
      if (!client_id) {
        els.projectInvoiceError.textContent = 'Please choose a client.';
        return;
      }

      const serviceStart = els.projectInvoiceStart?.value || '';
      const serviceEnd = els.projectInvoiceEnd?.value || '';

      if (!serviceStart) {
        els.projectInvoiceError.textContent = 'Please select a service start date.';
        return;
      }

      if (!serviceEnd) {
        els.projectInvoiceError.textContent = 'Please select a service end date.';
        return;
      }

      if (new Date(serviceEnd) < new Date(serviceStart)) {
        els.projectInvoiceError.textContent = 'Service end date cannot be before service start date.';
        return;
      }


      const lines = readProjectInvoiceLines();
      if (!lines.length) {
        els.projectInvoiceError.textContent = 'Add at least one service line.';
        return;
      }

      const prevLabel = els.projectInvoiceGenerateBtn?.textContent;
      if (els.projectInvoiceGenerateBtn) {
        els.projectInvoiceGenerateBtn.disabled = true;
        els.projectInvoiceGenerateBtn.textContent = 'Generating…';
      }

      if (els.projectInvoiceProgressMsg) els.projectInvoiceProgressMsg.textContent = 'Creating invoice record…';
      showModalEl(els.projectInvoiceProgressModal);

      const issue_date = projectInvoiceTodayISO();
      const termKey = els.projectInvoiceTerms?.value || 'monthly';
      const termMap = {
        monthly:  { label: 'Monthly',  months: 1 },
        '3m':     { label: '3 Months', months: 3 },
        '6m':     { label: '6 Months', months: 6 },
        annual:   { label: 'Annual',   months: 12 },
        one_time: { label: 'One time', months: 0 },
      };
      const term = termMap[termKey] || termMap.monthly;

      const due_date = (els.projectInvoiceEnd?.value || '').trim() || issue_date;
      const coverage_period = term.label;
      const currencyDoc = els.projectInvoiceCurrency?.value || 'JOD';

      const subtotal = lines.reduce((s, l) => s + (l.price || 0), 0);
      const tax = 0;
      const total = subtotal + tax;

      const subtotalUSD = projectInvoiceToUSD(subtotal, currencyDoc);
      const totalUSD = projectInvoiceToUSD(total, currencyDoc);

      const isTestMode = document.getElementById('projTestModeCheck')?.checked;

      let id = null, invoice_no = 'TEST';
      if (!isTestMode) {
        if (els.projectInvoiceProgressMsg) els.projectInvoiceProgressMsg.textContent = 'Saving to database…';

        const ins = await sb.from('invoices')
          .insert([{
            client_id,
            project_id: project.id,
            issue_date,
            due_date,
            currency: 'USD',
            subtotal: subtotalUSD,
            tax,
            status: 'Sent',
            coverage_period
          }])
          .select('id, invoice_no')
          .single();

        if (ins.error) throw ins.error;
        ({ id, invoice_no } = ins.data);
      }

      if (els.projectInvoiceProgressMsg) els.projectInvoiceProgressMsg.textContent = 'Fetching client info…';

      const clientRowResp = await sb.from('clients')
        .select('name, client_no, address, email')
        .eq('id', client_id)
        .single();

      const clientRow = clientRowResp.data || {};

      const payload = {
        client_name: clientRow.name || '',
        address: clientRow.address || '',
        email: clientRow.email || '',
        customer_id_label: `Customer ID ${clientRow.client_no || client_id}`,
        start_date: fmtLongDate(serviceStart),
        end_date: fmtLongDate(serviceEnd),
        payment_terms: term.label,
        currency: currencyDoc,
        subtotal: `${subtotal.toFixed(2)} ${currencyDoc}`,
        total_due: `${total.toFixed(2)} ${currencyDoc}`,
        invoice_no,
        today: fmtLongDate(issue_date),
        lines: lines.map(l => ({
          service_desc: l.desc,
          service_price: `${Number(l.price || 0).toFixed(2)} ${currencyDoc}`
        })),
      };

      if (els.projectInvoiceProgressMsg) els.projectInvoiceProgressMsg.textContent = 'Generating Word file…';

      await ensureProjectInvoiceLibs();
      const templateUrl = 'https://eymqvzjwbolgmywpwhgi.supabase.co/storage/v1/object/public/Invoices/Templates/ZAtech%20Invoice.docx';
      const ab = await fetch(templateUrl).then(r => r.arrayBuffer());

      const zip = new window.PizZip(ab);

      const Docx = window.docxtemplater || window.Docxtemplater;
      const doc = new Docx(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '[[', end: ']]' } });
      doc.setData(payload);
      doc.render();

      const docxBlob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const safeClient = (payload.client_name || 'Client').replace(/[^a-z0-9\- ]/gi, '').trim();
      const baseFileName = `Invoice No.${invoice_no} - ${safeClient}`;

      if (isTestMode) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(docxBlob);
        a.download = `${baseFileName} [TEST].docx`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        hideModalEl(els.projectInvoiceProgressModal);
        closeProjectInvoiceModal();
        return;
      }

      if (els.projectInvoiceProgressMsg) els.projectInvoiceProgressMsg.textContent = 'Uploading Word file…';

      const docxPath = `generated/Doc Version/${baseFileName}.docx`;

      const upDocx = await sb.storage.from('Invoices').upload(docxPath, docxBlob, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      if (upDocx.error) throw upDocx.error;

      const docxUrl = sb.storage.from('Invoices').getPublicUrl(docxPath).data.publicUrl;

      if (els.projectInvoiceProgressMsg) els.projectInvoiceProgressMsg.textContent = 'Finalizing…';

      const { error: updErr } = await sb
        .from('invoices')
        .update({ docx_url: docxUrl })
        .eq('id', id);

      if (updErr) throw updErr;

      await refreshProjectLinkedFinancials(project.id);

      await logProjectActivity(project.id, {
        title: 'Invoice created',
        type: 'Invoice',
        note: `${invoice_no} · $${Number(totalUSD).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      });

      hideModalEl(els.projectInvoiceProgressModal);
      closeProjectInvoiceModal();

      window.location.href = './invoices.html';
    } catch (error) {
      console.error('[projects] saveProjectInvoiceBridge failed:', error);
      hideModalEl(els.projectInvoiceProgressModal);
      if (els.projectInvoiceError) {
        els.projectInvoiceError.textContent = error?.message || 'Failed to create invoice.';
      }
    } finally {
      if (els.projectInvoiceGenerateBtn) {
        els.projectInvoiceGenerateBtn.disabled = false;
        els.projectInvoiceGenerateBtn.textContent = 'Generate Invoice';
      }
    }
  }

  function fmtLongDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async function loadScriptOnceExact(src) {
    const existing = Array.from(document.scripts).find(s => s.src === src);
    if (existing) {
      if (existing.dataset.loaded === 'true') return;
      await new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
      return;
    }

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.dataset.loaded = 'true';
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  




  function renderProjectActivity(project) {
    const items = project.activity || [];
    if (!els.pmActivityList) return;

    if (!items.length) {
      els.pmActivityList.innerHTML = '<div class="empty-state compact">No activity yet.</div>';
      return;
    }

    els.pmActivityList.innerHTML = items.map((item) => `
      <div class="activity-timeline-item">
        <div class="activity-timeline-top">
          <div class="activity-timeline-main">
            <div class="activity-timeline-title">${escapeHTML(item.title || 'Untitled Activity')}</div>
            <div class="activity-timeline-meta">
              <span>${fmtDate(item.date)}</span>
              <span>•</span>
              <span>${escapeHTML(item.type || 'General')}</span>
            </div>
          </div>
          <span class="tag ${stageTagClass(item.type)}">${escapeHTML(item.type || 'General')}</span>
        </div>
        <div class="activity-timeline-note">${escapeHTML(item.note || 'No description.')}</div>
      </div>
    `).join('');
  }

  function renderProjectTeam(project) {
    const members = project.team_allocation || [];
    if (!els.pmTeamList) return;

    if (!members.length) {
      els.pmTeamList.innerHTML = `
        <div class="empty-state empty-team">
          <div class="empty-icon">&#128101;</div>
          <div class="empty-title">No team members yet</div>
          <div class="empty-sub">Add a team member above to start tracking payments</div>
        </div>
      `;
      return;
    }

    const projectRevenueValue = safeNum(project.total_revenue || project.contract_value || 0);

    els.pmTeamList.innerHTML = members.map((member, index) => {
      const agreed = safeNum(member.agreed_amount);
      const payments = Array.isArray(member.payments) ? member.payments : [];
      const paid = payments.reduce((sum, p) => sum + safeNum(p.amount), 0);
      const remaining = Math.max(0, agreed - paid);
      const sharePct = projectRevenueValue > 0 ? ((agreed / projectRevenueValue) * 100) : 0;
      const planCount = safeNum(member.installments || 0);
      const progressPct = agreed > 0 ? Math.min(100, (paid / agreed) * 100) : 0;

      return `
        <div class="team-summary-card">
          <div class="team-summary-top">
            <div>
              <div class="team-summary-name">${escapeHTML(member.name || `Member ${index + 1}`)}</div>
              <div class="team-summary-role">${escapeHTML(member.role || 'Contributor')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="tag sent">${planCount || 0} payments plan</span>
              <button class="icon-btn team-edit-btn" data-index="${index}" title="Edit member" style="font-size:13px;">✏️</button>
              <button class="icon-btn team-delete-btn" data-index="${index}" title="Remove member" style="font-size:13px;">🗑️</button>
            </div>
          </div>

          <div class="team-summary-metrics">
            <div class="team-metric">
              <span class="label">Agreed</span>
              <strong>${fmtMoney(agreed)}</strong>
            </div>
            <div class="team-metric">
              <span class="label">Paid</span>
              <strong>${fmtMoney(paid)}</strong>
            </div>
            <div class="team-metric">
              <span class="label">Left</span>
              <strong>${fmtMoney(remaining)}</strong>
            </div>
            <div class="team-metric">
              <span class="label">Project Share</span>
              <strong>${fmtPct(sharePct)}</strong>
            </div>
          </div>

          <div class="team-progress">
            <div class="team-progress-row">
              <span>Payment progress</span>
              <span>${payments.length} / ${planCount || 0} transfers</span>
            </div>
            <div class="team-progress-bar">
              <div class="team-progress-fill" style="width:${progressPct}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function deleteTeamMember(index) {
    const project = findProject(state.selectedId);
    if (!project) return;

    const team = Array.isArray(project.team_allocation) ? [...project.team_allocation] : [];
    const member = team[index];
    if (!member) return;

    if (!confirm(`Remove "${member.name || `Member ${index + 1}`}" from this project? Their payment history will also be removed.`)) return;

    team.splice(index, 1);

    try {
      const { error } = await sb
        .from('projects')
        .update({ team_allocation: team, updated_at: new Date().toISOString() })
        .eq('id', project.id);

      if (error) throw error;

      project.team_allocation = team;

      const refreshed = buildProject(project);
      Object.assign(project, refreshed);

      await refreshProjectLinkedFinancials(project.id);

      renderProjectTeam(project);
      renderProjectPaymentHistory(project);
      syncProjectMemberDropdowns(project);

      await logProjectActivity(project.id, {
        title: 'Team member removed',
        type: 'Team',
        note: `${member.name || `Member ${index + 1}`}${member.role ? ' · ' + member.role : ''}`
      });
    } catch (err) {
      console.error('[projects] deleteTeamMember failed:', err);
      alert(err.message || 'Failed to remove team member.');
    }
  }

  function openEditTeamMemberModal(index) {
    const project = findProject(state.selectedId);
    if (!project) return;

    const team = Array.isArray(project.team_allocation) ? [...project.team_allocation] : [];
    const member = team[index];
    if (!member) return;

    // Remove any existing inline edit modal
    document.getElementById('teamEditInlineModal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'teamEditInlineModal';
    overlay.className = 'modal show';

    overlay.innerHTML = `
      <div class="modal-content" style="width:min(460px,96vw);">
        <h3 style="margin:0 0 4px;font-size:20px;font-weight:700;">Edit Team Member</h3>
        <p class="modal-subtitle" style="margin:0 0 20px;">Update this member's details. Existing payment records are preserved.</p>

        <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
          <div class="form-field">
            <label class="label">Name</label>
            <input id="teamEditName" type="text" class="pm-input" value="${escapeHTML(member.name || '')}" placeholder="Full name" />
          </div>
          <div class="form-field">
            <label class="label">Role</label>
            <input id="teamEditRole" type="text" class="pm-input" value="${escapeHTML(member.role || '')}" placeholder="e.g. Developer" />
          </div>
          <div class="form-field">
            <label class="label">Agreed Amount</label>
            <input id="teamEditAgreed" type="number" class="pm-input" min="0" step="0.01" value="${safeNum(member.agreed_amount)}" placeholder="0.00" />
          </div>
          <div class="form-field">
            <label class="label">Currency</label>
            <select id="teamEditCurrency" class="pm-input">
              ${Object.keys(PROJECT_FX_USD_PER).map(c => `<option value="${c}" ${c === (member.currency || 'USD') ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="label">Installments</label>
            <input id="teamEditInstallments" type="number" class="pm-input" min="1" step="1" value="${safeNum(member.installments || 1)}" placeholder="1" />
          </div>
          <div class="form-field">
            <label class="label">Note</label>
            <input id="teamEditNote" type="text" class="pm-input" value="${escapeHTML(member.note || '')}" placeholder="Optional note" />
          </div>
        </div>

        <div class="modal-error" id="teamEditError" style="display:none;margin-top:10px;"></div>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);">
          <button id="teamEditCancelBtn" class="btn2" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">Cancel</button>
          <button id="teamEditSaveBtn" class="btn2">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#teamEditCancelBtn').addEventListener('click', close);

    overlay.querySelector('#teamEditSaveBtn').addEventListener('click', async () => {
      const name = overlay.querySelector('#teamEditName').value.trim();
      const role = overlay.querySelector('#teamEditRole').value.trim();
      const rawAgreed = safeNum(overlay.querySelector('#teamEditAgreed').value);
      const currency = overlay.querySelector('#teamEditCurrency').value || 'USD';
      const agreed = convertToUSD(rawAgreed, currency);
      const installments = safeNum(overlay.querySelector('#teamEditInstallments').value) || 1;
      const note = overlay.querySelector('#teamEditNote').value.trim();
      const errEl = overlay.querySelector('#teamEditError');

      if (!name) { errEl.textContent = 'Name is required.'; errEl.style.display = 'block'; return; }
      if (!agreed) { errEl.textContent = 'Agreed amount is required.'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';

      const updatedMember = { ...team[index], name, role: role || 'Contributor', agreed_amount: agreed, installments, note };
      team[index] = updatedMember;

      try {
        const { error } = await sb
          .from('projects')
          .update({ team_allocation: team, updated_at: new Date().toISOString() })
          .eq('id', project.id);

        if (error) throw error;

        project.team_allocation = team;

        const refreshed = buildProject(project);
        Object.assign(project, refreshed);

        await refreshProjectLinkedFinancials(project.id);

        renderProjectTeam(project);
        renderProjectPaymentHistory(project);
        syncProjectMemberDropdowns(project);

        await logProjectActivity(project.id, {
          title: 'Team member updated',
          type: 'Team',
          note: `${name}${role ? ' · ' + role : ''}`
        });

        close();
      } catch (err) {
        console.error('[projects] editTeamMember failed:', err);
        errEl.textContent = err.message || 'Failed to save changes.';
        errEl.style.display = 'block';
      }
    });
  }

  async function deletePayment(memberIndex, paymentIndex) {
    const project = findProject(state.selectedId);
    if (!project) return;

    const team = Array.isArray(project.team_allocation) ? [...project.team_allocation] : [];
    const member = team[memberIndex];
    if (!member) return;

    const payments = Array.isArray(member.payments) ? [...member.payments] : [];
    const payment = payments[paymentIndex];
    if (!payment) return;

    if (!confirm(`Delete this payment of ${fmtMoney(safeNum(payment.amount))} for "${member.name}"? This cannot be undone.`)) return;

    payments.splice(paymentIndex, 1);
    team[memberIndex] = { ...member, payments };

    try {
      const { error } = await sb
        .from('projects')
        .update({ team_allocation: team, updated_at: new Date().toISOString() })
        .eq('id', project.id);

      if (error) throw error;

      // Delete the matching expense row
      await sb
        .from('expenses')
        .delete()
        .eq('project_id', project.id)
        .eq('vendor', member.name)
        .eq('expense_date', payment.date)
        .eq('amount', safeNum(payment.amount));

      project.team_allocation = team;

      const refreshed = buildProject(project);
      Object.assign(project, refreshed);

      await refreshProjectLinkedFinancials(project.id);

      renderProjectTeam(project);
      renderProjectPaymentHistory(project);
      syncProjectMemberDropdowns(project);

      await logProjectActivity(project.id, {
        title: 'Team payment deleted',
        type: 'Payment',
        note: `${member.name} · ${fmtMoney(safeNum(payment.amount))}`
      });
    } catch (err) {
      console.error('[projects] deletePayment failed:', err);
      alert(err.message || 'Failed to delete payment.');
    }
  }

  function openEditPaymentModal(memberIndex, paymentIndex) {
    const project = findProject(state.selectedId);
    if (!project) return;

    const team = Array.isArray(project.team_allocation) ? [...project.team_allocation] : [];
    const member = team[memberIndex];
    if (!member) return;

    const payments = Array.isArray(member.payments) ? [...member.payments] : [];
    const payment = payments[paymentIndex];
    if (!payment) return;

    document.getElementById('paymentEditInlineModal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'paymentEditInlineModal';
    overlay.className = 'modal show';

    overlay.innerHTML = `
      <div class="modal-content" style="width:min(460px,96vw);">
        <h3 style="margin:0 0 4px;font-size:20px;font-weight:700;">Edit Payment</h3>
        <p class="modal-subtitle" style="margin:0 0 20px;">Editing payment for <strong>${escapeHTML(member.name || 'member')}</strong>.</p>

        <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
          <div class="form-field">
            <label class="label">Amount</label>
            <input id="paymentEditAmount" type="number" class="pm-input" min="0" step="0.01" value="${safeNum(payment.amount)}" placeholder="0.00" />
          </div>
          <div class="form-field">
            <label class="label">Currency</label>
            <select id="paymentEditCurrency" class="pm-input">
              ${Object.keys(PROJECT_FX_USD_PER).map(c => `<option value="${c}" ${c === 'USD' ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label class="label">Date</label>
            <input id="paymentEditDate" type="date" class="pm-input" value="${payment.date || ''}" />
          </div>
          <div class="form-field">
            <label class="label">Note</label>
            <input id="paymentEditNote" type="text" class="pm-input" value="${escapeHTML(payment.note || '')}" placeholder="Optional note" />
          </div>
        </div>

        <div class="modal-error" id="paymentEditError" style="display:none;margin-top:10px;"></div>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);">
          <button id="paymentEditCancelBtn" class="btn2" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">Cancel</button>
          <button id="paymentEditSaveBtn" class="btn2">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#paymentEditCancelBtn').addEventListener('click', close);

    overlay.querySelector('#paymentEditSaveBtn').addEventListener('click', async () => {
      const rawAmount = safeNum(overlay.querySelector('#paymentEditAmount').value);
      const currency = overlay.querySelector('#paymentEditCurrency').value || 'USD';
      const amount = convertToUSD(rawAmount, currency);
      const date = overlay.querySelector('#paymentEditDate').value || new Date().toISOString().slice(0, 10);
      const note = overlay.querySelector('#paymentEditNote').value.trim();
      const errEl = overlay.querySelector('#paymentEditError');

      if (!amount) { errEl.textContent = 'Amount is required.'; errEl.style.display = 'block'; return; }

      errEl.style.display = 'none';

      payments[paymentIndex] = { ...payment, amount, date, note };
      team[memberIndex] = { ...member, payments };

      try {
        const { error } = await sb
          .from('projects')
          .update({ team_allocation: team, updated_at: new Date().toISOString() })
          .eq('id', project.id);

        if (error) throw error;

        // Sync the matching expense row
        await sb
          .from('expenses')
          .update({
            amount,
            expense_date: date,
            description: note || `Subcontractor payment for ${project.project_name || 'project'}`,
          })
          .eq('project_id', project.id)
          .eq('vendor', member.name)
          .eq('expense_date', payment.date)
          .eq('amount', payment.amount);

        project.team_allocation = team;

        const refreshed = buildProject(project);
        Object.assign(project, refreshed);

        await refreshProjectLinkedFinancials(project.id);

        renderProjectTeam(project);
        renderProjectPaymentHistory(project);
        syncProjectMemberDropdowns(project);

        await logProjectActivity(project.id, {
          title: 'Team payment updated',
          type: 'Payment',
          note: `${member.name} · ${fmtMoney(amount)}`
        });

        close();
      } catch (err) {
        console.error('[projects] editPayment failed:', err);
        errEl.textContent = err.message || 'Failed to save changes.';
        errEl.style.display = 'block';
      }
    });
  }

  function renderProjectPaymentHistory(project) {
    if (!els.pmTeamPaymentsList) return;

    const members = project.team_allocation || [];
    const paymentRows = [];

    members.forEach((member, memberIndex) => {
      const payments = Array.isArray(member.payments) ? member.payments : [];
      payments.forEach((payment, paymentIndex) => {
        paymentRows.push({
          member_name: member.name,
          role: member.role,
          date: payment.date,
          amount: safeNum(payment.amount),
          note: payment.note || '',
          memberIndex,
          paymentIndex
        });
      });
    });

    paymentRows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (!paymentRows.length) {
      els.pmTeamPaymentsList.innerHTML = `
        <div class="empty-state empty-payments">
          <div class="empty-icon">&#128181;</div>
          <div class="empty-title">No payments recorded</div>
          <div class="empty-sub">Payments logged for this project will appear here</div>
        </div>
      `;
      return;
    }

    els.pmTeamPaymentsList.innerHTML = paymentRows.map((row) => `
      <div class="payment-history-item">
        <div class="payment-history-main">
          <div class="payment-history-name">${escapeHTML(row.member_name || 'Unknown Member')}</div>
          <div class="payment-history-meta">${fmtDate(row.date)} · ${escapeHTML(row.role || 'Contributor')}</div>
          <div class="payment-history-note">${escapeHTML(row.note || 'No note')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
          <div style="display:flex;gap:6px;">
            <button class="icon-btn payment-edit-btn" data-member="${row.memberIndex}" data-payment="${row.paymentIndex}" title="Edit payment" style="font-size:13px;width:32px;height:32px;">✏️</button>
            <button class="icon-btn payment-delete-btn" data-member="${row.memberIndex}" data-payment="${row.paymentIndex}" title="Delete payment" style="font-size:13px;width:32px;height:32px;">🗑️</button>
          </div>
          <div class="payment-history-amount">${fmtMoney(row.amount)}</div>
        </div>
      </div>
    `).join('');
  }

  function syncProjectMemberDropdowns(project) {
    const members = project.team_allocation || [];
    const options = ['<option value="">Select member</option>']
      .concat(members.map((member, index) => {
        const value = member.name || `Member ${index + 1}`;
        return `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`;
      }))
      .join('');

    if (els.pmPaymentMemberSelect) {
      els.pmPaymentMemberSelect.innerHTML = options;
    }
  }

  function fillModalView(project) {
    if (!project) return;
    const profit = projectProfit(project);
    const margin = projectMargin(project);

    els.modalTitle.textContent = project.project_name;
    els.modalSubtitle.textContent = `${project.project_code} · ${project.client_name}`;
    els.modalStatusTag.textContent = normalizeStatus(project.status);
    els.modalStatusTag.className = `tag ${statusClass(project.status)}`;

    els.pmProjectCode.textContent = project.project_code;
    els.pmProjectName.textContent = project.project_name;
    els.pmClientName.textContent = project.client_name;
    els.pmProjectManager.textContent = project.project_manager || 'Unassigned';
    els.pmStatus.textContent = normalizeStatus(project.status);
    els.pmContractValue.textContent = fmtMoney(project.contract_value);
    els.pmStartDate.textContent = fmtDate(project.start_date);
    els.pmEndDate.textContent = fmtDate(project.end_date);
    els.pmDescription.textContent = project.description || 'No description added yet.';
    els.pmTotalProfit.className = `data-item-value ${moneyClass(profit)}`;
    els.pmProfitMargin.className = `data-item-value ${marginClass(margin)}`;

    els.pmTotalRevenue.textContent = fmtMoney(safeNum(project.contract_value || 0));
    els.pmTotalCost.textContent = fmtMoney(0);
    els.pmTotalProfit.textContent = fmtMoney(safeNum(project.contract_value || 0));
    els.pmProfitMargin.textContent = fmtPct(safeNum(project.contract_value || 0) > 0 ? 100 : 0);
    els.pmProfitMargin.className = `data-item-value ${marginClass(safeNum(project.contract_value || 0) > 0 ? 100 : 0)}`;

    renderDataList(els.pmCostBreakdown, [
      { label: 'Expenses', amount: 0, sub: 'Linked project expenses' },
      { label: 'Subcontractor Costs', amount: 0, sub: 'Tracked subcontractor / team payments' }
    ], (item) => `
      <div class="data-item">
        <div class="data-item-main">
          <div class="data-item-title">${escapeHTML(item.label)}</div>
          <div class="data-item-sub">${escapeHTML(item.sub || 'Allocated project cost')}</div>
        </div>
        <div class="data-item-value">${fmtMoney(item.amount)}</div>
      </div>
    `);

    renderProjectActivity(project);
    renderProjectTeam(project);
    renderProjectPaymentHistory(project);
    syncProjectMemberDropdowns(project);
  }

  function fillModalForm(project) {
    els.projectCodeInput.value = project?.project_code || 'Auto-generated';
    els.projectNameInput.value = project?.project_name || '';
    els.projectClientInput.value = project?.client_name || '';
    els.projectStatusInput.value = normalizeStatus(project?.status || 'Planned');
    els.projectManagerInput.value = project?.project_manager || '';
    els.projectContractInput.value = safeNum(project?.contract_value || 0) || '';
    if (els.projectCurrencyInput) els.projectCurrencyInput.value = 'USD';
    els.projectStartInput.value = project?.start_date || '';
    els.projectEndInput.value = project?.end_date || '';
    els.projectDescriptionInput.value = project?.description || '';
    updateProfitPreview();
  }

  function updateProfitPreview() {
    const rawContractValue = safeNum(els.projectContractInput.value);
    const selectedCurrency = els.projectCurrencyInput?.value || 'USD';
    const contractValue = convertToUSD(rawContractValue, selectedCurrency);

    const currentProject = state.selectedId ? findProject(state.selectedId) : null;

    const expenseCost = safeNum(currentProject?.expense_cost || 0);
    const subcontractorCost = safeNum(currentProject?.subcontractor_cost || 0);

    const cost = expenseCost + subcontractorCost;
    const profit = contractValue - cost;
    const margin = contractValue > 0 ? (profit / contractValue) * 100 : 0;

    els.projectProfitPreviewInput.value = `${fmtMoney(profit)} · ${fmtPct(margin)}`;
  }

  function getProjectRevenueValue(project, invoiceRows = []) {
    const invoiceTotal = (invoiceRows || []).reduce((sum, row) => {
      const amount = safeNum(row.total ?? row.subtotal ?? row.amount);
      return sum + amount;
    }, 0);

    return invoiceTotal > 0
      ? invoiceTotal
      : safeNum(project?.contract_value || project?.total_revenue || 0);
  }

  function getProjectExpenseValue(expenseRows = []) {
    return coerceArray(expenseRows, []).reduce((sum, row) => {
      const service = String(row?.service || '').toLowerCase().trim();
      if (service === 'subcontractor') return sum;
      return sum + safeNum(row.amount);
    }, 0);
  }

  function getProjectSubcontractorValue(project) {
    const team = coerceArray(project?.team_allocation, []).map(normalizeTeamMember);

    return team.reduce((sum, member) => {
      return sum + safeNum(member.agreed_amount);
    }, 0);
  }

  function applyLiveFinancialSummary(project, invoiceRows = [], expenseRows = []) {
    if (!project) return;

    const totalRevenue = getProjectRevenueValue(project, invoiceRows);
    const expenseCost = getProjectExpenseValue(expenseRows);
    const subcontractorCost = getProjectSubcontractorValue(project);

    const totalCost = expenseCost + subcontractorCost;
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    els.pmTotalRevenue.textContent = fmtMoney(totalRevenue);
    els.pmTotalCost.textContent = fmtMoney(totalCost);
    els.pmTotalProfit.textContent = fmtMoney(totalProfit);
    els.pmTotalProfit.className = `data-item-value ${moneyClass(totalProfit)}`;
    els.pmProfitMargin.textContent = fmtPct(profitMargin);
    els.pmProfitMargin.className = `data-item-value ${marginClass(profitMargin)}`;

    renderDataList(els.pmCostBreakdown, [
      { label: 'Expenses', amount: expenseCost, sub: 'Linked project expenses' },
      { label: 'Subcontractor Costs', amount: subcontractorCost, sub: 'Agreed subcontractor amounts' }
    ], (item) => `
      <div class="data-item">
        <div class="data-item-main">
          <div class="data-item-title">${escapeHTML(item.label)}</div>
          <div class="data-item-sub">${escapeHTML(item.sub)}</div>
        </div>
        <div class="data-item-value">${fmtMoney(item.amount)}</div>
      </div>
    `);
  }

  function openModalView(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.selectedId = project.id;
    setModalMode('view');
    fillModalView(project);

    applyLiveFinancialSummary(project, [], []);
    renderProjectInvoices([]);
    renderProjectExpenses([]);

    Promise.all([
      fetchProjectInvoices(project.id),
      fetchProjectExpenses(project.id)
    ]).then(([invoiceRows, expenseRows]) => {
      renderProjectInvoices(invoiceRows);
      renderProjectExpenses(expenseRows);
      applyLiveFinancialSummary(project, invoiceRows, expenseRows);
    }).catch((err) => {
      console.error('[projects] modal related data load failed:', err);
      applyLiveFinancialSummary(project, [], []);
    });

    fillModalForm(project);
    setActiveModalTab('summary');
    els.modalError.textContent = '';
    els.modal.classList.add('show');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function openModalEdit(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.selectedId = project.id;
    setModalMode('edit');
    fillModalView(project);
    fillModalForm(project);
    els.modalTitle.textContent = `Edit — ${project.project_name}`;
    els.modalSubtitle.textContent = `${project.project_code} · ${project.client_name}`;
    els.modalError.textContent = '';
    els.modal.classList.add('show');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function openModalCreate() {
    state.selectedId = null;
    setModalMode('create');
    fillModalForm(null);
    els.modalTitle.textContent = 'New Project';
    els.modalSubtitle.textContent = 'Create a project record and attach delivery / financial details later.';
    els.modalStatusTag.textContent = 'Planned';
    els.modalStatusTag.className = 'tag null';
    els.modalError.textContent = '';
    els.modal.classList.add('show');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    els.modal.classList.remove('show', 'editing');
    els.modal.setAttribute('aria-hidden', 'true');
    els.modalError.textContent = '';
    state.selectedId = null;
    setActiveModalTab('summary');
  }

  function openArchiveModal(projectId) {
    const project = findProject(projectId);
    if (!project) return;
    state.archiveId = project.id;
    els.archiveMessage.textContent = `Archive “${project.project_name}”? It will be removed from active views but kept for history and reporting.`;
    els.archiveModal.classList.add('show');
    els.archiveModal.setAttribute('aria-hidden', 'false');
  }

  function closeArchiveModal() {
    state.archiveId = null;
    els.archiveModal.classList.remove('show');
    els.archiveModal.setAttribute('aria-hidden', 'true');
  }

  
  function validateForm() {
    const projectName = els.projectNameInput.value.trim();
    const clientName = els.projectClientInput.value.trim();
    const start = els.projectStartInput.value;
    const end = els.projectEndInput.value;

    if (!projectName) return 'Project name is required.';
    if (!clientName) return 'Client name is required.';
    if (start && end && new Date(end) < new Date(start)) return 'End date cannot be before start date.';
    return '';
  }

  function collectPayload() {
    const rawContractValue = safeNum(els.projectContractInput.value);
    const selectedCurrency = els.projectCurrencyInput?.value || 'USD';
    const contractValue = convertToUSD(rawContractValue, selectedCurrency);
    const currentProject = state.selectedId ? findProject(state.selectedId) : null;

    const currentExpenseCost = safeNum(currentProject?.expense_cost || 0);
    const currentSubcontractorCost = getProjectSubcontractorValue(currentProject || {});
    const currentTotalCost = currentExpenseCost + currentSubcontractorCost;

    const payload = {
      project_name: els.projectNameInput.value.trim(),
      client_name: els.projectClientInput.value.trim(),
      description: els.projectDescriptionInput.value.trim(),
      status: normalizeStatus(els.projectStatusInput.value),
      contract_value: contractValue,
      start_date: els.projectStartInput.value || null,
      end_date: els.projectEndInput.value || null,
      project_manager: els.projectManagerInput.value.trim(),
      updated_at: new Date().toISOString()
    };

    if (state.modalMode === 'create') {
      payload.total_revenue = contractValue;
      payload.expense_cost = 0;
      payload.subcontractor_cost = 0;
      payload.total_cost = 0;
      payload.total_profit = contractValue;
    } else {
      payload.project_code = els.projectCodeInput.value.trim();
      payload.total_revenue = contractValue;
      payload.expense_cost = currentExpenseCost;
      payload.subcontractor_cost = currentSubcontractorCost;
      payload.total_cost = currentTotalCost;
      payload.total_profit = contractValue - currentTotalCost;
    }

    return payload;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'idle-top-toast show';
    toast.innerHTML = `
      <span>${escapeHTML(message)}</span>
      <button type="button">Dismiss</button>
    `;
    document.body.appendChild(toast);

    const remove = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('button')?.addEventListener('click', remove);
    setTimeout(remove, 3000);
  }

  async function saveProject() {
    const errorMsg = validateForm();
    if (errorMsg) {
      els.modalError.textContent = errorMsg;
      return;
    }

    const payload = collectPayload();

    try {
      if (state.modalMode === 'create') {
        const { data, error } = await sb
          .from('projects')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        state.projects.unshift(buildProject(data, state.projects.length + 1));
        populateClientFilter();
        renderAll();
        closeModal();
        showToast('Project created');

        await logProjectActivity(data.id, {
          title: 'Project created',
          type: 'Project',
          note: `${data.project_name} was created`
        });

        return;
      }

      const { data, error } = await sb
        .from('projects')
        .update(payload)
        .eq('id', state.selectedId)
        .select()
        .single();

      if (error) throw error;

      const idx = state.projects.findIndex((item) => String(item.id) === String(state.selectedId));
      if (idx !== -1) state.projects[idx] = buildProject(data, idx);

      await refreshProjectLinkedFinancials(data.id);

      populateClientFilter();
      renderAll();
      openModalView(state.selectedId);
      showToast('Project updated');
    } catch (error) {
      console.error('[projects] save failed:', error);
      els.modalError.textContent = error?.message || 'Failed to save project.';
    }
  }


  async function addProjectActivity() {
    const project = findProject(state.selectedId);
    if (!project) return;

    const title = els.pmActivityTitleInput?.value.trim();
    const stage = els.pmActivityStageInput?.value.trim();
    const note = els.pmActivityDescriptionInput?.value.trim();

    if (!title) {
      alert('Activity title is required.');
      return;
    }

    const newItem = {
      title,
      type: stage || 'General',
      note,
      date: new Date().toISOString()
    };

    const nextActivity = [newItem, ...(project.activity || [])];

    try {
      const { error } = await sb
        .from('projects')
        .update({
          activity: nextActivity,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      project.activity = nextActivity;
      renderProjectActivity(project);

      if (els.pmActivityTitleInput) els.pmActivityTitleInput.value = '';
      if (els.pmActivityStageInput) els.pmActivityStageInput.value = 'Planning';
      if (els.pmActivityDescriptionInput) els.pmActivityDescriptionInput.value = '';
    } catch (error) {
      console.error('[projects] add activity failed:', error);
      alert(error.message || 'Failed to add activity.');
    }
  }

  async function addProjectTeamMember() {
    const project = findProject(state.selectedId);
    if (!project) return;

    const subcontractorId = els.pmTeamMemberSelect?.value.trim();
    const matchedSub = state.subcontractors.find(sub => String(sub.id) === String(subcontractorId));

    const name = matchedSub?.name || '';
    const role = els.pmTeamRoleInput?.value.trim();
    const rawAgreed = safeNum(els.pmTeamAgreedInput?.value);
    const agreedCurrency = els.pmTeamCurrencyInput?.value || 'USD';
    const agreed = convertToUSD(rawAgreed, agreedCurrency);
    const installments = safeNum(els.pmTeamInstallmentsInput?.value);
    const note = els.pmTeamNoteInput?.value.trim();

    if (!subcontractorId || !matchedSub) {
      alert('Please select a subcontractor.');
      return;
    }

    if (!agreed) {
      alert('Agreed amount is required.');
      return;
    }

    const nextMember = {
      subcontractor_id: matchedSub.id,
      name: matchedSub.name,
      role: role || 'Contributor',
      agreed_amount: agreed,
      installments: installments || 1,
      note,
      payments: []
    };


    const existing = Array.isArray(project.team_allocation) ? project.team_allocation : [];
    const nextTeam = [nextMember, ...existing];

    try {
      const { error } = await sb
        .from('projects')
        .update({
          team_allocation: nextTeam,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      project.team_allocation = nextTeam;

      const refreshed = buildProject(project);
      Object.assign(project, refreshed);

      await refreshProjectLinkedFinancials(project.id);

      renderProjectTeam(project);
      renderProjectPaymentHistory(project);
      syncProjectMemberDropdowns(project);

      if (els.pmTeamMemberSelect) els.pmTeamMemberSelect.value = '';
      if (els.pmTeamRoleInput) els.pmTeamRoleInput.value = '';
      if (els.pmTeamAgreedInput) els.pmTeamAgreedInput.value = '';
      if (els.pmTeamCurrencyInput) els.pmTeamCurrencyInput.value = 'USD';
      if (els.pmTeamInstallmentsInput) els.pmTeamInstallmentsInput.value = '';
      if (els.pmTeamNoteInput) els.pmTeamNoteInput.value = '';
    } catch (error) {
      console.error('[projects] add team member failed:', error);
      alert(error.message || 'Failed to add team member.');
    }

    await logProjectActivity(project.id, {
      title: 'Team member assigned',
      type: 'Team',
      note: `${name}${role ? ' · ' + role : ''}`
    });
  }

  async function logProjectActivity(projectId, entry) {
    const project = findProject(projectId);
    if (!project) return;

    const newItem = {
      id: crypto.randomUUID(),
      title: entry.title || 'Activity',
      type: entry.type || 'General',
      note: entry.note || '',
      date: entry.date || new Date().toISOString()
    };

    const nextActivity = [newItem, ...(Array.isArray(project.activity) ? project.activity : [])];

    try {
      const { error } = await sb
        .from('projects')
        .update({
          activity: nextActivity,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      project.activity = nextActivity;

      if (String(state.selectedId) === String(project.id)) {
        renderProjectActivity(project);
      }

      renderRecentActivity();
    } catch (error) {
      console.error('[projects] logProjectActivity failed:', error);
    }
  }

  async function addProjectTeamPayment() {
    const project = findProject(state.selectedId);
    if (!project) return;

    const memberName = els.pmPaymentMemberSelect?.value.trim();
    const rawAmount = safeNum(els.pmPaymentAmountInput?.value);
    const paymentCurrency = els.pmPaymentCurrencyInput?.value || 'USD';
    const amount = convertToUSD(rawAmount, paymentCurrency);
    const date = els.pmPaymentDateInput?.value || new Date().toISOString().slice(0, 10);
    const note = els.pmPaymentNoteInput?.value.trim();

    if (!memberName) {
      alert('Please select a member.');
      return;
    }

    if (!amount) {
      alert('Payment amount is required.');
      return;
    }

    const team = Array.isArray(project.team_allocation) ? [...project.team_allocation] : [];
    const memberIndex = team.findIndex((member) => String(member.name).trim() === memberName);

    if (memberIndex === -1) {
      alert('Selected member was not found.');
      return;
    }

    const member = { ...team[memberIndex] };
    const payments = Array.isArray(member.payments) ? [...member.payments] : [];

    payments.push({
      amount,
      date,
      note
    });

    member.payments = payments;
    team[memberIndex] = member;

    try {
      const nowIso = new Date().toISOString();

      const { error: projectUpdateError } = await sb
        .from('projects')
        .update({
          team_allocation: team,
          updated_at: nowIso
        })
        .eq('id', project.id);

      if (projectUpdateError) throw projectUpdateError;

      const expensePayload = {
        vendor: memberName,
        description: note || `Subcontractor payment for ${project.project_name || 'project'}`,
        client_name: project.client_name || '',
        service: 'subcontractor',
        expense_date: date,
        amount,
        frequency: 'One-time',
        status: 'Paid',
        project_id: project.id
      };

      const { error: expenseInsertError } = await sb
        .from('expenses')
        .insert(expensePayload);

      if (expenseInsertError) throw expenseInsertError;

      project.team_allocation = team;

      const refreshed = buildProject(project);
      Object.assign(project, refreshed);

      await refreshProjectLinkedFinancials(project.id);

      renderProjectTeam(project);
      renderProjectPaymentHistory(project);
      syncProjectMemberDropdowns(project);

      if (els.pmPaymentMemberSelect) els.pmPaymentMemberSelect.value = '';
      if (els.pmPaymentDateInput) els.pmPaymentDateInput.value = '';
      if (els.pmPaymentAmountInput) els.pmPaymentAmountInput.value = '';
      if (els.pmPaymentCurrencyInput) els.pmPaymentCurrencyInput.value = 'USD';
      if (els.pmPaymentNoteInput) els.pmPaymentNoteInput.value = '';
    } catch (error) {
      console.error('[projects] add payment failed:', error);
      alert(error.message || 'Failed to save payment.');
    }
    await logProjectActivity(project.id, {
      title: 'Team payment recorded',
      type: 'Payment',
      note: `${memberName} · $${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    });
  }

  async function archiveProject() {
    const project = findProject(state.archiveId);
    if (!project) return;

    try {
      const archivedAt = new Date().toISOString();

      const { data, error } = await sb
        .from('projects')
        .update({ archived_at: archivedAt, updated_at: archivedAt })
        .eq('id', project.id)
        .select()
        .single();

      if (error) throw error;

      const idx = state.projects.findIndex((item) => String(item.id) === String(project.id));
      if (idx !== -1) state.projects[idx] = buildProject(data, idx);

      renderAll();
      closeArchiveModal();
      closeModal();
    } catch (error) {
      console.error('[projects] archive failed:', error);
      alert(error?.message || 'Failed to archive project.');
    }
  }

  function wireEvents() {
    els.tableSearch?.addEventListener('input', (e) => {
      state.tableSearch = e.target.value.trim();
      renderAll();
    });

    els.topSearch?.addEventListener('input', (e) => {
      state.topSearch = e.target.value.trim();
      renderAll();
    });

    els.statusFilter?.addEventListener('change', (e) => {
      state.statusFilter = e.target.value;
      renderAll();
    });

    els.clientFilter?.addEventListener('change', (e) => {
      state.clientFilter = e.target.value;
      renderAll();
    });

    els.recordFilter?.addEventListener('change', (e) => {
      state.recordFilter = e.target.value;
      renderAll();
    });

    els.pmAddActivityBtn?.addEventListener('click', addProjectActivity);
    els.pmAddTeamMemberBtn?.addEventListener('click', addProjectTeamMember);
    els.pmAddTeamPaymentBtn?.addEventListener('click', addProjectTeamPayment);

    els.pmTeamList?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.team-edit-btn');
      const deleteBtn = e.target.closest('.team-delete-btn');
      if (editBtn) openEditTeamMemberModal(Number(editBtn.dataset.index));
      if (deleteBtn) deleteTeamMember(Number(deleteBtn.dataset.index));
    });

    els.pmTeamPaymentsList?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.payment-edit-btn');
      const deleteBtn = e.target.closest('.payment-delete-btn');
      if (editBtn) openEditPaymentModal(Number(editBtn.dataset.member), Number(editBtn.dataset.payment));
      if (deleteBtn) deletePayment(Number(deleteBtn.dataset.member), Number(deleteBtn.dataset.payment));
    });

    els.pmNewExpenseBtn?.addEventListener('click', () => {
      if (!state.selectedId) return;
      openProjectExpenseModal(state.selectedId);
    });

    els.pmLinkExpenseBtn?.addEventListener('click', () => {
      if (!state.selectedId) return;
      openLinkExpenseModal(state.selectedId);
    });

    els.pmLinkInvoiceBtn?.addEventListener('click', () => {
      if (!state.selectedId) return;
      openLinkInvoiceModal(state.selectedId);
    });

    els.linkExpenseSaveBtn?.addEventListener('click', saveLinkedExpenseToProject);
    els.linkExpenseCancelBtn?.addEventListener('click', closeLinkExpenseModal);
    els.linkExpenseCloseBtn?.addEventListener('click', closeLinkExpenseModal);

    els.linkExpenseModal?.addEventListener('click', (e) => {
      if (e.target === els.linkExpenseModal) closeLinkExpenseModal();
    });

    els.linkInvoiceSaveBtn?.addEventListener('click', saveLinkedInvoice);
    els.linkInvoiceCancelBtn?.addEventListener('click', closeLinkInvoiceModal);
    els.linkInvoiceCloseBtn?.addEventListener('click', closeLinkInvoiceModal);

    els.linkInvoiceModal?.addEventListener('click', (e) => {
      if (e.target === els.linkInvoiceModal) closeLinkInvoiceModal();
    });

    // Invoice status pill — click to change inline
    els.pmRevenueList?.addEventListener('click', (e) => {
      const pill = e.target.closest('.inv-status-pill');
      if (!pill) return;

      const invoiceId = pill.dataset.invId;
      const current = pill.textContent.trim();

      const wrap = document.createElement('div');
      wrap.className = 'select-wrap inline';
      const sel = document.createElement('select');
      sel.className = 'filter-select status-select';
      sel.innerHTML = `
        <option value="Paid">Paid</option>
        <option value="Not Paid">Not Paid</option>
        <option value="Cancelled">Cancelled</option>
        <option value="Partial Payment">Partial Payment</option>
      `;
      sel.value = current;
      wrap.appendChild(sel);
      pill.replaceWith(wrap);
      sel.focus();

      const restore = (value) => {
        const span = document.createElement('span');
        span.className = `tag ${invoiceStatusClass(value)} inv-status-pill`;
        span.dataset.invId = invoiceId;
        span.style.cursor = 'pointer';
        span.title = 'Click to change status';
        span.textContent = value;
        wrap.replaceWith(span);
      };

      sel.addEventListener('change', async () => {
        const next = sel.value;
        if (next === current) { restore(current); return; }
        const res = await updateInvoiceStatus(invoiceId, next);
        if (!res.ok) { alert(res.error?.message || 'Could not update status.'); restore(current); return; }
        restore(res.value);
      });

      sel.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') restore(current); });

      document.addEventListener('mousedown', function onOut(ev) {
        if (!wrap.contains(ev.target)) { restore(current); document.removeEventListener('mousedown', onOut); }
      });
    });

    els.saveExpenseBtn?.addEventListener('click', saveProjectExpenseBridge);
    els.cancelExpenseBtn?.addEventListener('click', closeProjectExpenseModal);
    els.expenseCloseBtn?.addEventListener('click', closeProjectExpenseModal);

    els.expenseModal?.addEventListener('click', (e) => {
      if (e.target === els.expenseModal) closeProjectExpenseModal();
    });

    els.resetFiltersBtn?.addEventListener('click', () => {
      state.tableSearch = '';
      state.topSearch = '';
      state.statusFilter = 'all';
      state.clientFilter = 'all';
      state.recordFilter = 'active';

      if (els.tableSearch) els.tableSearch.value = '';
      if (els.topSearch) els.topSearch.value = '';
      if (els.statusFilter) els.statusFilter.value = 'all';
      if (els.clientFilter) els.clientFilter.value = 'all';
      if (els.recordFilter) els.recordFilter.value = 'active';

      renderAll();
    });

    els.newProjectBtn?.addEventListener('click', openModalCreate);

    $$('#projectsTable th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (!key) return;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = ['contract_value', 'total_revenue', 'total_cost', 'total_profit', 'start_date', 'end_date'].includes(key) ? 'desc' : 'asc';
        }
        renderAll();
      });
    });

    els.tbody?.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.project-view-btn');
      if (viewBtn) return openModalView(viewBtn.dataset.id);

      const editBtn = e.target.closest('.project-edit-btn');
      if (editBtn) return openModalEdit(editBtn.dataset.id);

      const pill = e.target.closest('[data-status-pill]');
      if (pill) return openModalView(pill.getAttribute('data-status-pill'));

      // Row click → view (skip other buttons/links)
      if (!e.target.closest('button, a, select, input')) {
        const tr = e.target.closest('tr[data-id]');
        if (tr) openModalView(tr.dataset.id);
      }
    });

    els.modalCloseBtn?.addEventListener('click', closeModal);
    els.cancelBtn?.addEventListener('click', () => {
      if (state.selectedId) {
        openModalView(state.selectedId);
      } else {
        closeModal();
      }
    });
    els.editBtn?.addEventListener('click', () => state.selectedId && openModalEdit(state.selectedId));
    els.saveBtn?.addEventListener('click', saveProject);
    els.archiveBtn?.addEventListener('click', () => state.selectedId && openArchiveModal(state.selectedId));

    els.projectContractInput?.addEventListener('input', updateProfitPreview);
    els.projectCurrencyInput?.addEventListener('change', updateProfitPreview);

    els.tabsWrap?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      setActiveModalTab(btn.dataset.tab);
    });

    els.modal?.addEventListener('click', (e) => {
      if (e.target === els.modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.archiveModal?.classList.contains('show')) closeArchiveModal();
      else if (e.key === 'Escape' && els.modal?.classList.contains('show')) closeModal();
    });

    els.archiveCancelBtn?.addEventListener('click', closeArchiveModal);
    els.archiveConfirmBtn?.addEventListener('click', archiveProject);
    els.archiveModal?.addEventListener('click', (e) => {
      if (e.target === els.archiveModal) closeArchiveModal();
    });

    els.pmNewInvoiceBtn?.addEventListener('click', () => {
      if (!state.selectedId) return;
      openProjectInvoiceModal(state.selectedId);
    });

    els.projectInvoiceCloseBtn?.addEventListener('click', closeProjectInvoiceModal);
    els.projectInvoiceCancelBtn?.addEventListener('click', closeProjectInvoiceModal);

    els.projectInvoiceModal?.addEventListener('click', (e) => {
      if (e.target === els.projectInvoiceModal) closeProjectInvoiceModal();
    });

    els.projectInvoiceAddServiceBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      addProjectInvoiceServiceRow();
    });

    els.projectInvoiceClearBtn?.addEventListener('click', () => {
      if (els.projectInvoiceServiceList) els.projectInvoiceServiceList.innerHTML = '';
      addProjectInvoiceServiceRow();
      updateProjectInvoiceTotals();
    });

    els.projectInvoiceCurrency?.addEventListener('change', updateProjectInvoiceTotals);
    els.projectInvoiceGenerateBtn?.addEventListener('click', saveProjectInvoiceBridge);

  }

  async function init() {
    showLoader(true);
    wireEvents();

    await Promise.all([
      loadClientsForProjectSelect(),
      loadSubcontractorsForTeamSelect()
    ]);

    state.projects = await fetchProjects();
    populateClientFilter();
    renderAll();
    showLoader(false);

    // Auto-open modal if navigated from dashboard with ?open=ID
    const openId = new URLSearchParams(window.location.search).get('open');
    if (openId) openModalView(openId);
  }


  init().catch((error) => {
    console.error('[projects] init failed:', error);
    showLoader(false);
  });
})();