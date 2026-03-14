(() => {
  if (!window.sb) {
    console.error("[subcontractors] Supabase client not found.");
  }

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const fmt$ = (n) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));

  const els = {
    loader: $("#contentLoader"),
    main: $(".main"),

    body: $("#subcontractorsBody"),
    search: $("#subSearch"),
    topSearch: $("#searchInput"),
    statusFilter: $("#subStatusFilter"),
    projectFilter: $("#subProjectFilter"),
    newBtn: $("#newSubcontractorBtn"),

    kpiCountBadge: $("#subKpiCountBadge"),
    kpiCount: $("#subKpiCount"),
    kpiAgreed: $("#subKpiAgreed"),
    kpiPaid: $("#subKpiPaid"),
    kpiRemaining: $("#subKpiRemaining"),

    modal: $("#subcontractorModal"),
    modalClose: $("#subModalCloseBtn"),
    modalTitle: $("#subModalTitle"),
    modalSubtitle: $("#subModalSubtitle"),
    editBtn: $("#subEditBtn"),

    viewMode: $("#subViewMode"),
    editMode: $("#subEditMode"),

    cancelBtn: $("#subCancelBtn"),
    saveBtn: $("#subSaveBtn"),
    modalError: $("#subModalError"),

    vSubCode: $("#vSubCode"),
    vSubName: $("#vSubName"),
    vSubEmail: $("#vSubEmail"),
    vSubPhone: $("#vSubPhone"),
    vSubCountry: $("#vSubCountry"),
    vSubStatus: $("#vSubStatus"),
    vSubNotes: $("#vSubNotes"),

    assignedProjectsBody: $("#subAssignedProjectsBody"),

    vSubAgreed: $("#vSubAgreed"),
    vSubPaid: $("#vSubPaid"),
    vSubRemaining: $("#vSubRemaining"),

    subNameInput: $("#subNameInput"),
    subEmailInput: $("#subEmailInput"),
    subPhoneInput: $("#subPhoneInput"),
    subCountryInput: $("#subCountryInput"),
    subStatusInput: $("#subStatusInput"),
    subNotesInput: $("#subNotesInput"),
  };

    const state = {
      rows: [],
      projects: [],
      sortKey: "name",
      sortDir: "asc",
      currentId: null,
      modalMode: "view", // view | create | edit
    };




  function setLoader(on) {
    if (!els.loader) return;
    els.loader.style.display = on ? "grid" : "none";
    els.loader.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function statusTag(status) {
    const s = String(status || "").toLowerCase();
    const cls =
      s === "active" ? "ok" :
      s === "paused" ? "warn" :
      s === "archived" ? "null" : "null";
    return `<span class="tag ${cls}">${esc(status || "—")}</span>`;
  }

  function normalizeSub(row) {
    return {
      id: row.id,
      subcontractor_code: row.subcontractor_code || "Auto-generated",
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      country: row.country || "",
      status: row.status || "Active",
      notes: row.notes || ""
    };
  }



  function normalizeProject(row) {
    return {
      id: row.id,
      project_code: row.project_code || row.id || "—",
      project_name: row.project_name || "—",
      client_name: row.client_name || "—",
      contract_value: Number(row.contract_value || 0),
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      team_allocation: Array.isArray(row.team_allocation) ? row.team_allocation : [],
    };
  }

  async function fetchSubcontractors() {
    const { data, error } = await window.sb
      .from("subcontractors")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeSub);
  }


  async function fetchProjects() {
    const { data, error } = await window.sb
      .from("projects")
      .select("id, project_code, project_name, client_name, contract_value, start_date, end_date, team_allocation")
      .order("project_name", { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeProject);
  }


  function datestr(v) {
    if (!v) return "—";
    try {
      const d = new Date(v);
      return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    } catch {
      return v;
    }
  }

  function getAssignmentsForSub(sub) {
    const subId = String(sub.id || "");
    const subName = String(sub.name || "").trim().toLowerCase();
    const rows = [];

    state.projects.forEach(project => {
      (project.team_allocation || []).forEach(item => {
        const itemSubId = String(item.subcontractor_id || "");
        const itemName = String(item.member_name || item.name || "").trim().toLowerCase();

        const matches =
          (itemSubId && subId && itemSubId === subId) ||
          (subName && itemName && itemName === subName);

        if (!matches) return;

        const agreed = Number(item.agreed_amount || item.agreed || item.amount || 0);
        const paid = Array.isArray(item.payments)
          ? item.payments.reduce((s, p) => s + Number(p.amount || 0), 0)
          : 0;

        rows.push({
          project_id: project.id,
          project_code: project.project_code,
          project_name: project.project_name,
          client_name: project.client_name,
          contract_value: Number(project.contract_value || 0),
          start_date: project.start_date,
          end_date: project.end_date,
          agreed_amount: agreed,
          paid_amount: paid,
          remaining: agreed - paid,
        });
      });
    });

    return rows;
  }

  function getSummaryForSub(sub) {
    const assignments = getAssignmentsForSub(sub);
    const agreed = assignments.reduce((s, x) => s + Number(x.agreed_amount || 0), 0);
    const paid = assignments.reduce((s, x) => s + Number(x.paid_amount || 0), 0);

    return {
      assignments,
      agreed,
      paid,
      remaining: agreed - paid,
    };
  }

  function renderProjectFilter() {
    const names = Array.from(new Set(
      state.projects.map(p => p.project_name).filter(Boolean)
    )).sort();

    const current = els.projectFilter?.value || "all";
    if (!els.projectFilter) return;

    els.projectFilter.innerHTML =
      `<option value="all">All Projects</option>` +
      names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("");

    els.projectFilter.value = names.includes(current) ? current : "all";
  }

  function filteredRows() {
    const q = (els.search?.value || els.topSearch?.value || "").trim().toLowerCase();
    const status = els.statusFilter?.value || "all";
    const projectFilter = els.projectFilter?.value || "all";

    let rows = [...state.rows].map(sub => {
      const summary = getSummaryForSub(sub);
      return {
        ...sub,
        assigned_projects: summary.assignments,
        assigned_value: summary.agreed,
        paid_value: summary.paid,
        remaining_value: summary.remaining,
      };
    });

    if (q) {
      rows = rows.filter(r => {
        const hay = [
          r.subcontractor_code,
          r.name,
          r.email,
          r.phone,
          r.country,
          r.status,
          r.notes,
          ...(r.assigned_projects || []).flatMap(p => [p.project_name, p.client_name, p.project_code])
        ].join(" ").toLowerCase();

        return hay.includes(q);
      });
    }

    if (status !== "all") {
      rows = rows.filter(r => r.status === status);
    }

    if (projectFilter !== "all") {
      rows = rows.filter(r => (r.assigned_projects || []).some(p => p.project_name === projectFilter));
    }

    rows.sort((a, b) => {
      const getVal = (row) => {
        switch (state.sortKey) {
          case "code": return row.subcontractor_code || "";
          case "name": return row.name || "";
          case "projects": return (row.assigned_projects || []).length;
          case "agreed": return row.assigned_value || 0;
          case "paid": return row.paid_value || 0;
          case "remaining": return row.remaining_value || 0;
          case "status": return row.status || "";
          default: return row.name || "";
        }
      };

      const va = getVal(a);
      const vb = getVal(b);

      if (typeof va === "number" && typeof vb === "number") {
        return state.sortDir === "asc" ? va - vb : vb - va;
      }

      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return state.sortDir === "asc" ? -1 : 1;
      if (sa > sb) return state.sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }

  function renderKPIs(rows) {
    const total = rows.length;
    const agreed = rows.reduce((s, r) => s + Number(r.assigned_value || 0), 0);
    const paid = rows.reduce((s, r) => s + Number(r.paid_value || 0), 0);
    const remaining = agreed - paid;

    if (els.kpiCountBadge) els.kpiCountBadge.textContent = total;
    if (els.kpiCount) els.kpiCount.textContent = total;
    if (els.kpiAgreed) els.kpiAgreed.textContent = fmt$(agreed);
    if (els.kpiPaid) els.kpiPaid.textContent = fmt$(paid);
    if (els.kpiRemaining) els.kpiRemaining.textContent = fmt$(remaining);
  }

  function renderTable() {
    const rows = filteredRows();
    renderKPIs(rows);

    if (!els.body) return;

    if (!rows.length) {
      els.body.innerHTML = `<tr><td colspan="8" class="table-empty">No subcontractors found.</td></tr>`;
      return;
    }

    els.body.innerHTML = rows.map(r => `
      <tr data-id="${esc(r.id)}">
        <td>${esc(r.subcontractor_code)}</td>
        <td>
          <div class="sub-main-cell">
            <div class="sub-main-name">${esc(r.name || "—")}</div>
            <div class="sub-main-sub">${esc(r.email || "No email set")}</div>
          </div>
        </td>
        <td>
          <div class="sub-projects-cell">
            ${(r.assigned_projects || []).length
              ? r.assigned_projects.map(p => `<span class="sub-pill">${esc(p.project_name)}</span>`).join("")
              : `<span class="muted">No projects</span>`}
          </div>
        </td>
        <td>${fmt$(r.assigned_value)}</td>
        <td>${fmt$(r.paid_value)}</td>
        <td>${fmt$(r.remaining_value)}</td>
        <td>${statusTag(r.status)}</td>
        <td class="row-actions">
          <button class="mini sub-view-btn" data-id="${esc(r.id)}">View</button>
        </td>
      </tr>
    `).join("");
  }

  function setMode(mode) {
    state.modalMode = mode;

    const isEdit = mode === "edit" || mode === "create";
    els.viewMode.style.display = isEdit ? "none" : "";
    els.editMode.style.display = isEdit ? "" : "none";
    els.editBtn.style.display = mode === "view" ? "inline-flex" : "none";
    els.cancelBtn.style.display = isEdit ? "inline-flex" : "none";
    els.saveBtn.style.display = isEdit ? "inline-flex" : "none";

    if (els.modalError) els.modalError.textContent = "";
  }

  function openModal() {
    els.modal.classList.add("show");
    els.modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    els.modal.classList.remove("show");
    els.modal.setAttribute("aria-hidden", "true");
    state.currentId = null;
  }

  function fillAssignedProjects(assignments) {
    if (!assignments.length) {
      els.assignedProjectsBody.innerHTML = `<tr><td colspan="7">No assigned projects yet.</td></tr>`;
      return;
    }

    els.assignedProjectsBody.innerHTML = assignments.map(a => `
      <tr>
        <td>${esc(a.project_code || "—")}</td>
        <td>${esc(a.project_name || "—")}</td>
        <td>${esc(a.client_name || "—")}</td>
        <td>${fmt$(a.contract_value)}</td>
        <td>${fmt$(a.agreed_amount)}</td>
        <td>${datestr(a.start_date)}</td>
        <td>${datestr(a.end_date)}</td>
      </tr>
    `).join("");
  }

  function fillView(sub) {
    const summary = getSummaryForSub(sub);

    els.vSubCode.textContent = sub.subcontractor_code || "—";
    els.vSubName.textContent = sub.name || "—";
    els.vSubEmail.textContent = sub.email || "—";
    els.vSubPhone.textContent = sub.phone || "—";
    els.vSubCountry.textContent = sub.country || "—";
    els.vSubStatus.innerHTML = statusTag(sub.status);
    els.vSubNotes.textContent = sub.notes || "No notes yet.";

    fillAssignedProjects(summary.assignments);
    els.vSubAgreed.textContent = fmt$(summary.agreed);
    els.vSubPaid.textContent = fmt$(summary.paid);
    els.vSubRemaining.textContent = fmt$(summary.remaining);
  }

  function fillEdit(sub = null) {
    els.subNameInput.value = sub?.name || "";
    els.subEmailInput.value = sub?.email || "";
    els.subPhoneInput.value = sub?.phone || "";
    els.subCountryInput.value = sub?.country || "";
    els.subStatusInput.value = sub?.status || "Active";
    els.subNotesInput.value = sub?.notes || "";
  }

  function currentSub() {
    return state.rows.find(r => String(r.id) === String(state.currentId)) || null;
  }

  function openView(id) {
    const sub = state.rows.find(r => String(r.id) === String(id));
    if (!sub) return;

    state.currentId = sub.id;
    els.modalTitle.textContent = sub.name || "Subcontractor";
    els.modalSubtitle.textContent = "View subcontractor details and assigned project financial summary.";
    fillView(sub);
    fillEdit(sub);
    setMode("view");
    openModal();
  }

  function openCreate() {
    state.currentId = null;
    els.modalTitle.textContent = "New Subcontractor";
    els.modalSubtitle.textContent = "Create a new subcontractor record.";
    fillEdit(null);
    setMode("create");
    openModal();
  }

  function enterEdit() {
    const sub = currentSub();
    if (!sub) return;

    els.modalTitle.textContent = `Edit — ${sub.name}`;
    els.modalSubtitle.textContent = "Update subcontractor info.";
    fillEdit(sub);
    setMode("edit");
  }

  function buildPayload() {
    return {
      name: els.subNameInput.value.trim(),
      email: els.subEmailInput.value.trim(),
      phone: els.subPhoneInput.value.trim(),
      country: els.subCountryInput.value.trim(),
      status: els.subStatusInput.value,
      notes: els.subNotesInput.value.trim(),
    };
  }

  function validatePayload(payload) {
    if (!payload.name) return "Name is required.";
    return "";
  }


  async function saveSub() {
    const payload = buildPayload();
    const problem = validatePayload(payload);

    if (problem) {
      els.modalError.textContent = problem;
      return;
    }

    try {
      els.saveBtn.disabled = true;
      els.saveBtn.textContent = "Saving…";

      if (state.modalMode === "create") {
        const { data, error } = await window.sb
          .from("subcontractors")
          .insert([payload])
          .select("*")
          .single();

        if (error) throw error;

        const row = normalizeSub(data);
        state.rows.unshift(row);
        renderTable();
        openView(row.id);
      } else {
        const { data, error } = await window.sb
          .from("subcontractors")
          .update(payload)
          .eq("id", state.currentId)
          .select("*")
          .single();

        if (error) throw error;

        const idx = state.rows.findIndex(r => String(r.id) === String(state.currentId));
        if (idx >= 0) state.rows[idx] = normalizeSub(data);
        renderTable();
        openView(state.currentId);
      }
    } catch (err) {
      console.error("[subcontractors] save error:", err);
      els.modalError.textContent = err.message || "Failed to save subcontractor.";
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = "Save Subcontractor";
    }
  }


  function wireEvents() {
    els.newBtn?.addEventListener("click", openCreate);
    els.editBtn?.addEventListener("click", enterEdit);
    els.modalClose?.addEventListener("click", closeModal);

    els.cancelBtn?.addEventListener("click", () => {
      if (state.modalMode === "create") closeModal();
      else openView(state.currentId);
    });

    els.saveBtn?.addEventListener("click", saveSub);

    els.search?.addEventListener("input", renderTable);
    els.topSearch?.addEventListener("input", () => {
      if (els.search) els.search.value = els.topSearch.value;
      renderTable();
    });

    els.statusFilter?.addEventListener("change", renderTable);
    els.projectFilter?.addEventListener("change", renderTable);

    $$("#subcontractorsTable thead th[data-sort]").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        renderTable();
      });
    });

    els.body?.addEventListener("click", (e) => {
      const btn = e.target.closest(".sub-view-btn");
      if (!btn) return;
      openView(btn.dataset.id);
    });

    els.modal?.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal?.classList.contains("show")) {
        closeModal();
      }
    });
  }

  async function init() {
    setLoader(true);
    wireEvents();

    const [subs, projects] = await Promise.all([
      fetchSubcontractors(),
      fetchProjects(),
    ]);

    state.rows = subs;
    state.projects = projects;

    renderProjectFilter();
    renderTable();

    setLoader(false);
    els.main?.classList.add("content-ready");
  }

  init().catch((err) => {
    console.error("[subcontractors] init failed:", err);
    setLoader(false);
    if (els.body) {
      els.body.innerHTML = `<tr><td colspan="8" class="table-empty">Failed to load subcontractors.</td></tr>`;
    }
  });


  init();
})();