import { sb } from './supabase.js';

(() => {
  const STATUSES = ['Planned', 'Active', 'On Hold', 'Completed', 'Cancelled'];
  const STATUS_RANK = { Planned: 1, Active: 2, 'On Hold': 3, Completed: 4, Cancelled: 5 };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  const els = {
    loader: byId('contentLoader'),
    demoBadge: byId('demoDataBadge'),

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
    projectRevenueInput: byId('projectRevenueInput'),
    projectCostInput: byId('projectCostInput'),
    projectCostTypeInput: byId('projectCostTypeInput'),
    projectStartInput: byId('projectStartInput'),
    projectEndInput: byId('projectEndInput'),
    projectProfitPreviewInput: byId('projectProfitPreviewInput'),
    projectDescriptionInput: byId('projectDescriptionInput'),

    // revenue / expense buttons
    pmNewInvoiceBtn: byId('pmNewInvoiceBtn'),
    pmNewExpenseBtn: byId('pmNewExpenseBtn'),

    // activity
    pmActivityTitleInput: byId('pmActivityTitleInput'),
    pmActivityStageInput: byId('pmActivityStageInput'),
    pmActivityDescriptionInput: byId('pmActivityDescriptionInput'),
    pmAddActivityBtn: byId('pmAddActivityBtn'),

    // team assignment
    pmTeamMemberSelect: byId('pmTeamMemberSelect'),
    pmTeamRoleInput: byId('pmTeamRoleInput'),
    pmTeamAgreedInput: byId('pmTeamAgreedInput'),
    pmTeamInstallmentsInput: byId('pmTeamInstallmentsInput'),
    pmAddTeamMemberBtn: byId('pmAddTeamMemberBtn'),
    pmTeamNoteInput: byId('pmTeamNoteInput'),
    

    // payment tracker
    pmPaymentMemberSelect: byId('pmPaymentMemberSelect'),
    pmPaymentDateInput: byId('pmPaymentDateInput'),
    pmPaymentAmountInput: byId('pmPaymentAmountInput'),
    pmPaymentNoteInput: byId('pmPaymentNoteInput'),
    pmAddTeamPaymentBtn: byId('pmAddTeamPaymentBtn'),
  };

  const state = {
    projects: [],
    filtered: [],
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
    usingDemo: false,
  };

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
    if (['delivery', 'support'].includes(s)) return 'sent';
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

  function projectProfit(project) {
    return safeNum(project.total_profit ?? (safeNum(project.total_revenue) - safeNum(project.total_cost)));
  }

  function projectMargin(project) {
    const revenue = safeNum(project.total_revenue);
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

  function setDemoBadge(show) {
    els.demoBadge?.classList.toggle('show', !!show);
  }

  function uniqueClients(rows) {
    return Array.from(new Set(rows.map((x) => x.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
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
      payments
    };
  }

  function buildProject(project, index = 0) {
    const revenue = safeNum(project.total_revenue);
    const cost = safeNum(project.total_cost);
    const profit = projectProfit(project);
    const contractValue = safeNum(project.contract_value || revenue || 0);

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
      type: item.type || item.cost_type || 'Direct Cost',
      note: item.note || ''
    }));

    const teamAllocation = coerceArray(project.team_allocation, []).map(normalizeTeamMember);

    const activity = coerceArray(project.activity, []).map((item, i) => ({
      title: item.title || `Update ${i + 1}`,
      date: item.date || project.updated_at || project.created_at || project.start_date || '',
      note: item.note || item.description || '',
      type: item.type || 'Project Update'
    }));

    const internalCost = safeNum(project.internal_cost);
    const subcontractorCost = safeNum(project.subcontractor_cost);
    const directCost = safeNum(project.direct_cost);

    const costBreakdownRaw = coerceArray(project.cost_breakdown, []);
    const costBreakdown = costBreakdownRaw.length
      ? costBreakdownRaw.map((item) => ({ label: item.label || item.type || 'Other Cost', amount: safeNum(item.amount) }))
      : [
          { label: 'Internal Cost', amount: internalCost || Math.max(0, cost * 0.4) },
          { label: 'Subcontractor Cost', amount: subcontractorCost || Math.max(0, cost * 0.35) },
          { label: 'Direct Cost', amount: directCost || Math.max(0, cost - (internalCost || Math.max(0, cost * 0.4)) - (subcontractorCost || Math.max(0, cost * 0.35))) }
        ].filter((x) => x.amount > 0 || cost === 0);

    return {
      id: project.id ?? `demo-${index + 1}`,
      project_code: project.project_code || `ZAPROJ-${String(index + 1).padStart(3, '0')}`,
      project_name: project.project_name || 'Untitled Project',
      client_name: project.client_name || 'Unknown Client',
      description: project.description || 'No project description added yet.',
      status: normalizeStatus(project.status),
      contract_value: contractValue,
      total_revenue: revenue,
      total_cost: cost,
      total_profit: profit,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      project_manager: project.project_manager || 'Unassigned',
      cost_type: project.cost_type || 'Mixed',
      team_allocation: teamAllocation,
      activity,
      revenue_lines: revenueLines.length ? revenueLines : [{ label: 'Recognized Revenue', date: project.start_date || '', amount: revenue, note: 'Project-level revenue summary' }],
      expense_lines: expenseLines.length ? expenseLines : costBreakdown.map((x, i) => ({ label: x.label, date: project.start_date || '', amount: x.amount, type: x.label, note: i === 0 ? 'Auto-generated from total cost breakdown' : '' })),
      cost_breakdown: costBreakdown,
      internal_cost: internalCost,
      subcontractor_cost: subcontractorCost,
      direct_cost: directCost,
      archived_at: project.archived_at || null,
      is_archived: !!project.is_archived,
      created_at: project.created_at || new Date().toISOString(),
      updated_at: project.updated_at || project.created_at || new Date().toISOString(),
      source: project.source || 'projects'
    };
  }

  function demoProjects() {
    return [
      {
        id: 'demo-1',
        project_code: 'ZAPROJ-001',
        project_name: 'ArLAR Congress Portal Enhancements',
        client_name: 'ArLAR',
        description: 'Ongoing portal upgrades including abstract workflows, form refinements, and post-launch support.',
        status: 'Active',
        contract_value: 7800,
        total_revenue: 6200,
        total_cost: 2800,
        start_date: '2026-01-18',
        end_date: '2026-04-20',
        project_manager: 'Ahmad',
        cost_type: 'Mixed',
        team_allocation: [
          {
            name: 'Adil',
            role: 'Lead Developer',
            agreed_amount: 3000,
            installments: 4,
            payments: [
              { amount: 1000, date: '2026-02-10', note: 'First transfer' },
              { amount: 1000, date: '2026-03-03', note: 'Second transfer' }
            ]
          },
          {
            name: 'Rami',
            role: 'UI Support',
            agreed_amount: 700,
            installments: 2,
            payments: [{ amount: 350, date: '2026-02-28', note: 'Phase one support' }]
          }
        ],
        activity: [
          { title: 'Program upload workflow refined', date: '2026-03-05', type: 'Delivery', note: 'Client requested smoother file replacement flow.' },
          { title: 'Congress page QA passed', date: '2026-03-01', type: 'QA', note: 'Responsive fixes cleared for tablet and desktop.' }
        ],
        revenue_lines: [
          { label: 'Initial phase payment', date: '2026-01-20', amount: 3000 },
          { label: 'Feature extension invoice', date: '2026-02-18', amount: 3200 }
        ],
        expense_lines: [
          { label: 'Internal dev time', type: 'Internal Cost', date: '2026-02-28', amount: 1800 },
          { label: 'Design support', type: 'Direct Cost', date: '2026-02-24', amount: 450 },
          { label: 'Freelance QA', type: 'Subcontractor Cost', date: '2026-03-02', amount: 550 }
        ]
      },
      {
        id: 'demo-2',
        project_code: 'ZAPROJ-002',
        project_name: 'Faces of Palestine UX Refresh',
        client_name: 'Faces of Palestine',
        description: 'UI/UX overhaul focused on clarity, speed, searchability, and stronger profile storytelling.',
        status: 'Completed',
        contract_value: 5400,
        total_revenue: 5400,
        total_cost: 1900,
        start_date: '2025-12-10',
        end_date: '2026-01-28',
        project_manager: 'Ahmad',
        cost_type: 'Internal Cost',
        team_allocation: [
          {
            name: 'Ahmad',
            role: 'UX / Full Stack',
            agreed_amount: 2200,
            installments: 3,
            payments: [
              { amount: 1000, date: '2026-01-05', note: 'First draw' },
              { amount: 1200, date: '2026-01-28', note: 'Final draw' }
            ]
          }
        ],
        activity: [
          { title: 'UI refresh launched', date: '2026-01-28', type: 'Launch', note: 'Public release went live successfully.' },
          { title: 'Traffic report reviewed', date: '2026-03-04', type: 'Reporting', note: 'Post-launch comparison prepared.' }
        ],
        revenue_lines: [
          { label: 'Project settlement', date: '2026-01-29', amount: 5400 }
        ],
        expense_lines: [
          { label: 'Internal delivery cost', type: 'Internal Cost', date: '2026-01-28', amount: 1900 }
        ]
      },
      {
        id: 'demo-3',
        project_code: 'ZAPROJ-003',
        project_name: 'Pupa Job Simulation Platform',
        client_name: 'Pupa',
        description: 'Custom platform planning and staged build for role-based simulation journeys and admin control.',
        status: 'On Hold',
        contract_value: 12800,
        total_revenue: 4200,
        total_cost: 3100,
        start_date: '2026-02-02',
        end_date: '2026-06-15',
        project_manager: 'Ahmad',
        cost_type: 'Mixed',
        team_allocation: [
          {
            name: 'Adil',
            role: 'Backend Consultant',
            agreed_amount: 1800,
            installments: 3,
            payments: [{ amount: 600, date: '2026-02-25', note: 'Consulting phase 1' }]
          }
        ],
        activity: [
          { title: 'Awaiting final stakeholder scope', date: '2026-03-03', type: 'Blocked', note: 'Paused after priority reshuffle.' }
        ],
        revenue_lines: [
          { label: 'Discovery payment', date: '2026-02-06', amount: 4200 }
        ],
        expense_lines: [
          { label: 'Architecture planning', type: 'Internal Cost', date: '2026-02-20', amount: 1800 },
          { label: 'Backend consultation', type: 'Subcontractor Cost', date: '2026-02-25', amount: 1300 }
        ]
      },
      {
        id: 'demo-4',
        project_code: 'ZAPROJ-004',
        project_name: 'MyWorld White-Label Rollout',
        client_name: 'MyWorld',
        description: 'White-label setup planning for multi-organization rollout with controlled branding and login-based access.',
        status: 'Planned',
        contract_value: 15400,
        total_revenue: 0,
        total_cost: 900,
        start_date: '2026-03-15',
        end_date: '2026-08-30',
        project_manager: 'Zuhri',
        cost_type: 'Direct Cost',
        team_allocation: [],
        activity: [
          { title: 'Architecture outline created', date: '2026-03-04', type: 'Planning', note: 'Prepared multi-tenant direction and rollout assumptions.' }
        ],
        revenue_lines: [],
        expense_lines: [
          { label: 'Discovery workshops', type: 'Direct Cost', date: '2026-03-05', amount: 900 }
        ]
      },
      {
        id: 'demo-5',
        project_code: 'ZAPROJ-005',
        project_name: 'JSR Congress UX Improvements',
        client_name: 'Jordanian Society of Rheumatology',
        description: 'Page-level UX refinement for specialist listings, filters, and mobile-first readability.',
        status: 'Active',
        contract_value: 3600,
        total_revenue: 2400,
        total_cost: 1100,
        start_date: '2026-02-19',
        end_date: '2026-03-28',
        project_manager: 'Ahmad',
        cost_type: 'Internal Cost',
        team_allocation: [
          {
            name: 'Ahmad',
            role: 'Front-End Dev',
            agreed_amount: 1200,
            installments: 2,
            payments: [{ amount: 600, date: '2026-03-06', note: 'Half settled' }]
          }
        ],
        activity: [
          { title: 'Rheumatologists page audit done', date: '2026-03-01', type: 'Review', note: 'Pain points mapped for UX improvements.' },
          { title: 'Filter logic implementation started', date: '2026-03-06', type: 'Building', note: 'Working in Velo with improved sorting flow.' }
        ],
        revenue_lines: [
          { label: 'Initial design/dev fee', date: '2026-02-20', amount: 2400 }
        ],
        expense_lines: [
          { label: 'Internal delivery cost', type: 'Internal Cost', date: '2026-03-06', amount: 1100 }
        ]
      },
      {
        id: 'demo-6',
        project_code: 'ZAPROJ-006',
        project_name: 'Legacy Hosting Cleanup',
        client_name: 'Internal',
        description: 'Internal cost recovery project for hosting cleanup and migration preparation.',
        status: 'Cancelled',
        contract_value: 0,
        total_revenue: 0,
        total_cost: 650,
        start_date: '2026-01-05',
        end_date: '2026-02-08',
        project_manager: 'ZAtech Team',
        cost_type: 'Direct Cost',
        team_allocation: [],
        activity: [
          { title: 'Project cancelled', date: '2026-02-08', type: 'Status Change', note: 'Merged into a broader internal infrastructure stream.' }
        ],
        revenue_lines: [],
        expense_lines: [
          { label: 'Migration prep cost', type: 'Direct Cost', date: '2026-02-08', amount: 650 }
        ],
        archived_at: '2026-02-12T10:00:00.000Z'
      }
    ].map(buildProject);
  }

  async function fetchProjects() {
    try {
      const { data, error } = await sb
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
          cost_type,
          internal_cost,
          subcontractor_cost,
          direct_cost,
          team_allocation,
          activity,
          revenue_lines,
          expense_lines,
          cost_breakdown,
          archived_at,
          is_archived,
          created_at,
          updated_at
        `)
        .order('start_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      state.usingDemo = false;
      return (data || []).map(buildProject);
    } catch (error) {
      console.warn('[projects] Falling back to demo data:', error?.message || error);
      state.usingDemo = true;
      return demoProjects();
    }
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
    let av = a[key];
    let bv = b[key];

    if (key === 'status') {
      av = STATUS_RANK[normalizeStatus(a.status)] || 999;
      bv = STATUS_RANK[normalizeStatus(b.status)] || 999;
    } else if (['contract_value', 'total_revenue', 'total_cost', 'total_profit'].includes(key)) {
      av = key === 'total_profit' ? projectProfit(a) : safeNum(a[key]);
      bv = key === 'total_profit' ? projectProfit(b) : safeNum(b[key]);
    } else if (['start_date', 'end_date', 'created_at', 'updated_at'].includes(key)) {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = String(av || '').toLowerCase();
      bv = String(bv || '').toLowerCase();
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
          <td>${fmtMoney(project.total_revenue)}</td>
          <td>${fmtMoney(project.total_cost)}</td>
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
    const revenue = rows.reduce((sum, item) => sum + safeNum(item.total_revenue), 0);
    const cost = rows.reduce((sum, item) => sum + safeNum(item.total_cost), 0);
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

    const revenue = visible.reduce((sum, project) => sum + safeNum(project.total_revenue), 0);
    const cost = visible.reduce((sum, project) => sum + safeNum(project.total_cost), 0);
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
    setDemoBadge(state.usingDemo);
  }

  function findProject(id) {
    return state.projects.find((project) => String(project.id) === String(id)) || null;
  }

  function setModalMode(mode) {
    state.modalMode = mode;
    els.modal?.classList.toggle('editing', mode !== 'view');

    if (mode === 'view') {
      els.modalActionsBar.style.display = 'none';
    } else {
      els.modalActionsBar.style.display = 'flex';
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
    if (!projectId || state.usingDemo) return [];

    const { data, error } = await sb
      .from('invoices')
      .select(`
        id, invoice_no, issue_date, due_date, currency,
        subtotal, tax, total, status, coverage_period, project_id
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
    if (!projectId || state.usingDemo) return [];

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

  function renderProjectInvoices(invoices = []) {
    if (!els.pmRevenueList) return;

    if (!invoices.length) {
      els.pmRevenueList.innerHTML = '<div class="data-item"><span class="data-item-title-2">No project invoices yet.</span></div>';
      return;
    }

    els.pmRevenueList.innerHTML = invoices.map((inv) => {
      const total = Number(inv.total ?? (Number(inv.subtotal || 0) + Number(inv.tax || 0)));
      return `
        <div class="data-item">
          <div class="data-item-main">
            <div class="data-item-title">Invoice #${escapeHTML(inv.invoice_no || '—')}</div>
            <div class="data-item-sub">${fmtDate(inv.issue_date)} · Due ${fmtDate(inv.due_date)} · ${escapeHTML(inv.status || '—')}</div>
          </div>
          <div class="data-item-value">${fmtMoney(total)}</div>
        </div>
      `;
    }).join('');
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

    const projectRevenue = safeNum(project.total_revenue || project.contract_value || 0);

    els.pmTeamList.innerHTML = members.map((member, index) => {
      const agreed = safeNum(member.agreed_amount);
      const payments = Array.isArray(member.payments) ? member.payments : [];
      const paid = payments.reduce((sum, p) => sum + safeNum(p.amount), 0);
      const remaining = Math.max(0, agreed - paid);
      const sharePct = projectRevenue > 0 ? ((agreed / projectRevenue) * 100) : 0;
      const planCount = safeNum(member.installments || 0);
      const progressPct = agreed > 0 ? Math.min(100, (paid / agreed) * 100) : 0;

      return `
        <div class="team-summary-card">
          <div class="team-summary-top">
            <div>
              <div class="team-summary-name">${escapeHTML(member.name || `Member ${index + 1}`)}</div>
              <div class="team-summary-role">${escapeHTML(member.role || 'Contributor')}</div>
            </div>
            <span class="tag sent">${planCount || 0} payments plan</span>
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

  function renderProjectPaymentHistory(project) {
    if (!els.pmTeamPaymentsList) return;

    const members = project.team_allocation || [];
    const paymentRows = [];

    members.forEach((member) => {
      const payments = Array.isArray(member.payments) ? member.payments : [];
      payments.forEach((payment) => {
        paymentRows.push({
          member_name: member.name,
          role: member.role,
          date: payment.date,
          amount: safeNum(payment.amount),
          note: payment.note || ''
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
        <div class="payment-history-amount">${fmtMoney(row.amount)}</div>
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
    els.pmTotalRevenue.textContent = fmtMoney(project.total_revenue);
    els.pmTotalCost.textContent = fmtMoney(project.total_cost);
    els.pmTotalProfit.textContent = fmtMoney(profit);
    els.pmTotalProfit.className = `data-item-value ${moneyClass(profit)}`;
    els.pmProfitMargin.textContent = fmtPct(margin);
    els.pmProfitMargin.className = `data-item-value ${moneyClass(profit)}`;

    renderDataList(els.pmCostBreakdown, project.cost_breakdown || [], (item) => `
      <div class="data-item">
        <div class="data-item-main">
          <div class="data-item-title">${escapeHTML(item.label)}</div>
          <div class="data-item-sub">Allocated project cost</div>
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
    els.projectCodeInput.value = project?.project_code || suggestNextProjectCode();
    els.projectNameInput.value = project?.project_name || '';
    els.projectClientInput.value = project?.client_name || '';
    els.projectStatusInput.value = normalizeStatus(project?.status || 'Planned');
    els.projectManagerInput.value = project?.project_manager || '';
    els.projectContractInput.value = safeNum(project?.contract_value || 0) || '';
    els.projectRevenueInput.value = safeNum(project?.total_revenue || 0) || '';
    els.projectCostInput.value = safeNum(project?.total_cost || 0) || '';
    els.projectCostTypeInput.value = project?.cost_type || 'Mixed';
    els.projectStartInput.value = project?.start_date || '';
    els.projectEndInput.value = project?.end_date || '';
    els.projectDescriptionInput.value = project?.description || '';
    updateProfitPreview();
  }

  function updateProfitPreview() {
    const revenue = safeNum(els.projectRevenueInput.value);
    const cost = safeNum(els.projectCostInput.value);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    els.projectProfitPreviewInput.value = `${fmtMoney(profit)} · ${fmtPct(margin)}`;
  }

  function openModalView(projectId) {
    const project = findProject(projectId);
    if (!project) return;

    state.selectedId = project.id;
    setModalMode('view');
    fillModalView(project);

    Promise.all([
      fetchProjectInvoices(project.id),
      fetchProjectExpenses(project.id)
    ]).then(([invoiceRows, expenseRows]) => {
      renderProjectInvoices(invoiceRows);
      renderProjectExpenses(expenseRows);
    }).catch((err) => {
      console.error('[projects] modal related data load failed:', err);
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

  function suggestNextProjectCode() {
    const codes = state.projects
      .map((p) => p.project_code || '')
      .map((code) => {
        const match = code.match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      });
    const next = (codes.length ? Math.max(...codes) : 0) + 1;
    return `ZAPROJ-${String(next).padStart(3, '0')}`;
  }

  function validateForm() {
    const projectName = els.projectNameInput.value.trim();
    const clientName = els.projectClientInput.value.trim();
    const code = els.projectCodeInput.value.trim();
    const start = els.projectStartInput.value;
    const end = els.projectEndInput.value;

    if (!code) return 'Project ID is required.';
    if (!projectName) return 'Project name is required.';
    if (!clientName) return 'Client name is required.';
    if (start && end && new Date(end) < new Date(start)) return 'End date cannot be before start date.';
    return '';
  }

  function collectPayload() {
    const revenue = safeNum(els.projectRevenueInput.value);
    const cost = safeNum(els.projectCostInput.value);
    return {
      project_code: els.projectCodeInput.value.trim(),
      project_name: els.projectNameInput.value.trim(),
      client_name: els.projectClientInput.value.trim(),
      description: els.projectDescriptionInput.value.trim(),
      status: normalizeStatus(els.projectStatusInput.value),
      contract_value: safeNum(els.projectContractInput.value),
      total_revenue: revenue,
      total_cost: cost,
      total_profit: revenue - cost,
      start_date: els.projectStartInput.value || null,
      end_date: els.projectEndInput.value || null,
      project_manager: els.projectManagerInput.value.trim(),
      cost_type: els.projectCostTypeInput.value,
      updated_at: new Date().toISOString()
    };
  }

  async function saveProject() {
    const errorMsg = validateForm();
    if (errorMsg) {
      els.modalError.textContent = errorMsg;
      return;
    }

    const payload = collectPayload();

    try {
      if (state.usingDemo) {
        if (state.modalMode === 'create') {
          const project = buildProject({
            id: `demo-${Date.now()}`,
            ...payload,
            activity: [{ title: 'Project created', date: new Date().toISOString(), type: 'Manual Entry', note: 'Added from Projects page.' }],
            team_allocation: [],
            revenue_lines: payload.total_revenue ? [{ label: 'Project revenue', date: payload.start_date || new Date().toISOString().slice(0, 10), amount: payload.total_revenue }] : [],
            expense_lines: payload.total_cost ? [{ label: 'Project cost', date: payload.start_date || new Date().toISOString().slice(0, 10), amount: payload.total_cost, type: payload.cost_type }] : []
          }, state.projects.length + 1);
          state.projects.unshift(project);
        } else {
          const idx = state.projects.findIndex((item) => String(item.id) === String(state.selectedId));
          if (idx !== -1) {
            const existing = state.projects[idx];
            state.projects[idx] = buildProject({
              ...existing,
              ...payload,
              activity: [
                { title: 'Project updated', date: new Date().toISOString(), type: 'Manual Update', note: 'Updated from Projects page.' },
                ...(existing.activity || [])
              ]
            }, idx);
          }
        }
      } else if (state.modalMode === 'create') {
        const { data, error } = await sb.from('projects').insert(payload).select().single();
        if (error) throw error;
        state.projects.unshift(buildProject(data, state.projects.length + 1));
      } else {
        const { data, error } = await sb.from('projects').update(payload).eq('id', state.selectedId).select().single();
        if (error) throw error;
        const idx = state.projects.findIndex((item) => String(item.id) === String(state.selectedId));
        if (idx !== -1) state.projects[idx] = buildProject(data, idx);
      }

      populateClientFilter();
      renderAll();

      if (state.modalMode === 'create') {
        closeModal();
      } else {
        openModalView(state.selectedId);
      }
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
      if (state.usingDemo) {
        project.activity = nextActivity;
      } else {
        const { error } = await sb
          .from('projects')
          .update({
            activity: nextActivity,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id);

        if (error) throw error;
        project.activity = nextActivity;
      }

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

    const name = els.pmTeamMemberSelect?.value.trim();
    const role = els.pmTeamRoleInput?.value.trim();
    const agreed = safeNum(els.pmTeamAgreedInput?.value);
    const installments = safeNum(els.pmTeamInstallmentsInput?.value);
    const note = els.pmTeamNoteInput.value.trim();

    if (!name) {
      alert('Please select a team member.');
      return;
    }

    if (!agreed) {
      alert('Agreed amount is required.');
      return;
    }

    const nextMember = {
      name,
      role: role || 'Contributor',
      agreed_amount: agreed,
      installments: installments || 1,
      note,
      payments: []
    };

    const existing = Array.isArray(project.team_allocation) ? project.team_allocation : [];
    const nextTeam = [nextMember, ...existing];

    try {
      if (state.usingDemo) {
        project.team_allocation = nextTeam;
      } else {
        const { error } = await sb
          .from('projects')
          .update({
            team_allocation: nextTeam,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id);

        if (error) throw error;
        project.team_allocation = nextTeam;
      }

      renderProjectTeam(project);
      renderProjectPaymentHistory(project);
      syncProjectMemberDropdowns(project);

      if (els.pmTeamMemberSelect) els.pmTeamMemberSelect.value = '';
      if (els.pmTeamRoleInput) els.pmTeamRoleInput.value = '';
      if (els.pmTeamAgreedInput) els.pmTeamAgreedInput.value = '';
      if (els.pmTeamInstallmentsInput) els.pmTeamInstallmentsInput.value = '';
      if (els.pmTeamNoteInput) els.pmTeamNoteInput.value = '';
    } catch (error) {
      console.error('[projects] add team member failed:', error);
      alert(error.message || 'Failed to add team member.');
    }
  }

  async function addProjectTeamPayment() {
    const project = findProject(state.selectedId);
    if (!project) return;

    const memberName = els.pmPaymentMemberSelect?.value.trim();
    const amount = safeNum(els.pmPaymentAmountInput?.value);
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
      if (state.usingDemo) {
        project.team_allocation = team;
      } else {
        const { error } = await sb
          .from('projects')
          .update({
            team_allocation: team,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id);

        if (error) throw error;
        project.team_allocation = team;
      }

      renderProjectTeam(project);
      renderProjectPaymentHistory(project);
      syncProjectMemberDropdowns(project);

      if (els.pmPaymentMemberSelect) els.pmPaymentMemberSelect.value = '';
      if (els.pmPaymentDateInput) els.pmPaymentDateInput.value = '';
      if (els.pmPaymentAmountInput) els.pmPaymentAmountInput.value = '';
      if (els.pmPaymentNoteInput) els.pmPaymentNoteInput.value = '';
    } catch (error) {
      console.error('[projects] add payment failed:', error);
      alert(error.message || 'Failed to save payment.');
    }
  }

  async function archiveProject() {
    const project = findProject(state.archiveId);
    if (!project) return;

    try {
      const archivedAt = new Date().toISOString();

      if (state.usingDemo) {
        const idx = state.projects.findIndex((item) => String(item.id) === String(project.id));
        if (idx !== -1) {
          state.projects[idx] = buildProject({
            ...state.projects[idx],
            archived_at: archivedAt,
            updated_at: archivedAt,
            activity: [{ title: 'Project archived', date: archivedAt, type: 'Archive', note: 'Project moved out of active view.' }, ...(state.projects[idx].activity || [])]
          }, idx);
        }
      } else {
        const { data, error } = await sb
          .from('projects')
          .update({ archived_at: archivedAt, updated_at: archivedAt })
          .eq('id', project.id)
          .select()
          .single();
        if (error) throw error;
        const idx = state.projects.findIndex((item) => String(item.id) === String(project.id));
        if (idx !== -1) state.projects[idx] = buildProject(data, idx);
      }

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
      if (pill) {
        const id = pill.getAttribute('data-status-pill');
        openModalView(id);
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

    [els.projectRevenueInput, els.projectCostInput].forEach((input) => input?.addEventListener('input', updateProfitPreview));

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
  }

  async function init() {
    showLoader(true);
    wireEvents();
    state.projects = await fetchProjects();
    populateClientFilter();
    renderAll();
    showLoader(false);
  }

  init().catch((error) => {
    console.error('[projects] init failed:', error);
    showLoader(false);
    state.projects = demoProjects();
    state.usingDemo = true;
    populateClientFilter();
    renderAll();
  });
})();