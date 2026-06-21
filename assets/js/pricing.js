(() => {
  /* global sb */
  if (!window.sb) {
    console.error("[pricing:init] Supabase client (window.sb) NOT found. Did supabase.js load before pricing.js?");
  } else {
    console.log("[pricing:init] Supabase client detected.");
  }

  // ===== Helpers =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt$ = (n) => {
    const v = Number(n || 0);
    if (window.fmtPortalMoney) return window.fmtPortalMoney(v);
    return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const isMissingTable = (err) => {
    if (!err) return false;
    const msg = (err.message || err.details || "").toLowerCase();
    return (msg.includes("relation") && msg.includes("does not exist"))
      || err.code === "42P01"
      || err.code === "PGRST205"
      || msg.includes("could not find the table");
  };
  const flashErr = (text) => {
    const el = document.getElementById("estimateError");
    if (!el) return;
    el.textContent = text || "";
    if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 6000);
  };
  const flashInfo = (text) => {
    const el = document.getElementById("estimateInfo");
    if (!el) return;
    el.textContent = text || "";
    if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 4000);
  };
  const setSetupErr = (text) => {
    const el = document.getElementById("pricingSetupErr");
    if (el) el.textContent = text ? `(${text})` : "";
  };
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  }

  // ===== Catalog state =====
  const catalog = {
    ready: false,
    questions: [],
    optionsByQuestion: {},
    services: [],
    serviceBySlug: {},
    vendorPlans: [],
    vendorPlanByRef: {},
    vendorPlanById: {},
    rules: [],
    profiles: [],
    profileBySlug: {},
    defaultProfile: null,
  };

  // ===== Estimate state =====
  const state = {
    stage: 1,
    answers: {},
    profileSlug: "zatech-standard",
    projectName: "",
    clientName: "",
    clientEmail: "",
    status: "draft",
    editingId: null,
    estimateNo: null,
    lines: [],
    totals: {},
  };

  // ===== Stage definitions =====
  // Question sections → stage. Stage 1 is hard-coded (project_type tiles).
  // The 'general' section is split: project-type → stage 1; the rest → stage 2.
  const STAGE_SECTIONS = {
    2: ["general", "platform", "website", "ecommerce", "app", "crm", "ai", "social_media"],
    3: ["infrastructure", "maintenance"],
  };

  const PROJECT_TYPE_META = {
    website:        { icon: "🌐", desc: "Marketing or business website, landing pages, CMS, blogs." },
    ecommerce:      { icon: "🛒", desc: "Online store, products, checkout, payments, shipping." },
    web_app:        { icon: "⚙️", desc: "Custom portal, dashboard, admin tools, Supabase backend." },
    crm_automation: { icon: "🔄", desc: "Zoho CRM setup, workflows, data migration, automation." },
    ai_data:        { icon: "🤖", desc: "Iris-style assistant, knowledge base, AI usage budget." },
    social_media:   { icon: "📣", desc: "Content calendar, posts, reels, community, paid ads." },
  };

  // ===== Loaders =====
  async function loadCatalog() {
    const fetches = [
      sb.from("pricing_questions").select("*").eq("active", true).order("sort_order", { ascending: true }),
      sb.from("pricing_question_options").select("*").eq("active", true).order("sort_order", { ascending: true }),
      sb.from("pricing_service_catalog").select("*").eq("active", true).order("sort_order", { ascending: true }),
      sb.from("pricing_vendor_plan_monthly_costs").select("*").eq("active", true),
      sb.from("pricing_formula_rules").select("*").eq("active", true).order("sort_order", { ascending: true }),
      sb.from("pricing_calculation_profiles").select("*").order("is_default", { ascending: false }),
    ];
    const [qRes, oRes, sRes, vRes, rRes, pRes] = await Promise.all(fetches);

    const firstErr = [qRes, oRes, sRes, vRes, rRes, pRes].map(r => r.error).find(Boolean);
    if (firstErr) {
      if (isMissingTable(firstErr)) {
        document.getElementById("pricingSetup").style.display = "block";
        setSetupErr(firstErr.message || "");
        return false;
      }
      console.error("[pricing:catalog] load error", firstErr);
      flashErr("Failed to load pricing catalog.");
      return false;
    }

    catalog.questions = qRes.data || [];
    catalog.services = sRes.data || [];
    catalog.vendorPlans = vRes.data || [];
    catalog.rules = rRes.data || [];
    catalog.profiles = pRes.data || [];

    catalog.serviceBySlug = {};
    catalog.services.forEach(s => { catalog.serviceBySlug[s.slug] = s; });

    catalog.vendorPlanByRef = {};
    catalog.vendorPlanById = {};
    catalog.vendorPlans.forEach(p => {
      catalog.vendorPlanByRef[`${p.vendor_slug}:${p.plan_slug}`] = p;
      catalog.vendorPlanById[p.id] = p;
    });

    catalog.profileBySlug = {};
    catalog.profiles.forEach(p => { catalog.profileBySlug[p.slug] = p; });
    catalog.defaultProfile = catalog.profiles.find(p => p.is_default) || catalog.profiles[0] || null;
    if (catalog.defaultProfile) state.profileSlug = catalog.defaultProfile.slug;

    catalog.optionsByQuestion = {};
    (oRes.data || []).forEach(o => {
      if (!catalog.optionsByQuestion[o.question_id]) catalog.optionsByQuestion[o.question_id] = [];
      catalog.optionsByQuestion[o.question_id].push(o);
    });

    // Seed defaults
    catalog.questions.forEach(q => {
      const def = q.default_value;
      if (def !== undefined && def !== null && state.answers[q.answer_key] === undefined) {
        state.answers[q.answer_key] = def;
      }
    });

    catalog.ready = true;
    return true;
  }

  // ===== Display rule =====
  function shouldShowQuestion(q) {
    const rule = q.display_rule || {};
    const keys = Object.keys(rule);
    if (!keys.length) return true;
    return keys.every(k => {
      const expected = rule[k];
      const actual = state.answers[k];
      if (Array.isArray(expected)) return expected.includes(actual);
      return expected === actual;
    });
  }

  // ===== Stage rendering =====
  function renderStage() {
    const area = document.getElementById("stageArea");
    area.innerHTML = "";
    if (state.stage === 1)      area.appendChild(renderStageOne());
    else if (state.stage === 2) area.appendChild(renderStageTwo());
    else if (state.stage === 3) area.appendChild(renderStageThree());
    else if (state.stage === 4) area.appendChild(renderStageFour());
    updateStepper();
    updateNav();
  }

  function updateStepper() {
    $$(".step").forEach(el => {
      const s = Number(el.dataset.stage);
      el.classList.toggle("active", s === state.stage);
      el.classList.toggle("done",   s < state.stage);
    });
  }

  function updateNav() {
    const prev = document.getElementById("prevBtn");
    const next = document.getElementById("nextBtn");
    const save = document.getElementById("saveEstimateBtn");
    const hint = document.getElementById("navHint");
    prev.style.display = state.stage === 1 ? "none" : "";
    next.style.display = state.stage >= 4 ? "none" : "";
    save.style.display = state.stage >= 4 ? "" : "none";

    let canAdvance = true;
    if (state.stage === 1 && !state.answers.project_type) {
      canAdvance = false;
      hint.textContent = "Pick a project type to continue.";
    } else {
      hint.textContent = "";
    }
    next.disabled = !canAdvance;
    next.style.opacity = canAdvance ? "1" : ".5";
    next.style.cursor = canAdvance ? "pointer" : "not-allowed";
  }

  // --- Stage 1: project type tiles ---
  function renderStageOne() {
    const card = document.createElement("div");
    card.className = "stage-card";
    card.innerHTML = `
      <div class="stage-head">
        <h2>What are we pricing?</h2>
        <p>Pick the closest match. You can fine-tune the scope in the next step.</p>
      </div>
    `;
    const q = catalog.questions.find(qq => qq.answer_key === "project_type");
    if (!q) return card;
    const grid = document.createElement("div");
    grid.className = "type-grid";
    (catalog.optionsByQuestion[q.id] || []).forEach(o => {
      const meta = PROJECT_TYPE_META[o.value] || { icon: "•", desc: "" };
      const tile = document.createElement("div");
      tile.className = "type-tile" + (state.answers.project_type === o.value ? " on" : "");
      tile.innerHTML = `
        <span class="icon">${meta.icon}</span>
        <span class="ttl">${escapeHtml(o.label)}</span>
        <span class="desc">${escapeHtml(meta.desc)}</span>
      `;
      tile.addEventListener("click", () => {
        state.answers.project_type = o.value;
        recomputeTotalsOnly();
        renderStage();
      });
      grid.appendChild(tile);
    });
    card.appendChild(grid);
    return card;
  }

  // --- Stage 2: project details + scope ---
  function renderStageTwo() {
    const card = document.createElement("div");
    card.className = "stage-card";
    card.innerHTML = `
      <div class="stage-head">
        <h2>Project details</h2>
        <p>Tell us how big it is, how urgent, and what's already in place.</p>
      </div>
    `;

    // Section groupings shown inside this stage
    const SECTION_TITLES = {
      general: "Basics",
      platform: "Platform",
      website: "Website scope",
      ecommerce: "Ecommerce",
      app: "App & users",
      crm: "CRM & automation",
      ai: "AI / Iris",
      social_media: "Social media",
    };

    const sectionOrder = ["general", "platform", "website", "ecommerce", "app", "crm", "ai", "social_media"];
    sectionOrder.forEach(sec => {
      const qs = catalog.questions.filter(q =>
        q.section === sec &&
        q.answer_key !== "project_type" &&
        shouldShowQuestion(q)
      );
      if (!qs.length) return;
      const group = document.createElement("div");
      group.className = "pq-group";
      group.innerHTML = `<h4 class="pq-group-title">${SECTION_TITLES[sec] || sec}</h4>`;
      const grid = document.createElement("div");
      grid.className = "pq-grid";
      qs.forEach(q => grid.appendChild(renderField(q)));
      group.appendChild(grid);
      card.appendChild(group);
    });

    return card;
  }

  // --- Stage 3: infrastructure & maintenance ---
  function renderStageThree() {
    const card = document.createElement("div");
    card.className = "stage-card";
    card.innerHTML = `
      <div class="stage-head">
        <h2>Infrastructure &amp; ongoing</h2>
        <p>Vendor subscriptions, email, hosting, and ongoing care after launch.</p>
      </div>
    `;
    const sectionTitles = { infrastructure: "Infrastructure", maintenance: "Ongoing care" };
    ["infrastructure", "maintenance"].forEach(sec => {
      const qs = catalog.questions.filter(q => q.section === sec && shouldShowQuestion(q));
      if (!qs.length) return;
      const group = document.createElement("div");
      group.className = "pq-group";
      group.innerHTML = `<h4 class="pq-group-title">${sectionTitles[sec]}</h4>`;
      const grid = document.createElement("div");
      grid.className = "pq-grid";
      qs.forEach(q => grid.appendChild(renderField(q)));
      group.appendChild(grid);
      card.appendChild(group);
    });
    return card;
  }

  // --- Stage 4: review & save ---
  function renderStageFour() {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="stage-card">
        <div class="stage-head">
          <h2>Review &amp; save</h2>
          <p>Confirm the client info, double-check the line items, then save.</p>
        </div>
        <div class="review-grid">
          <div>
            <div class="pq-group">
              <h4 class="pq-group-title">Client &amp; project</h4>
              <div class="pq-grid">
                <div class="pq-field"><span class="pq-label">Project name</span><input id="estProjectName" class="pm-input" type="text" placeholder="e.g., ArLAR new website"></div>
                <div class="pq-field"><span class="pq-label">Client name</span><input id="estClientName" class="pm-input" type="text" placeholder="Client / company"></div>
                <div class="pq-field"><span class="pq-label">Client email</span><input id="estClientEmail" class="pm-input" type="email" placeholder="optional"></div>
                <div class="pq-field"><span class="pq-label">Margin profile</span><div class="select-wrap"><select id="estProfile" class="pm-input"></select></div></div>
                <div class="pq-field"><span class="pq-label">Status</span><div class="select-wrap"><select id="estStatus" class="pm-input">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select></div></div>
              </div>
            </div>

            <div class="pq-group" id="reviewLinesWrap">
              <h4 class="pq-group-title">Line items</h4>
              <div id="linesBlock"></div>
            </div>
          </div>
          <aside>
            <div class="pq-group">
              <h4 class="pq-group-title">Totals</h4>
              <div class="totals-grid">
                <div class="totals-tile featured"><div class="ttl-label">One-time total</div><div class="ttl-value" id="ttlOneTime">$0</div></div>
                <div class="totals-tile featured"><div class="ttl-label">Monthly</div><div class="ttl-value" id="ttlMonthly">$0</div></div>
                <div class="totals-tile"><div class="ttl-label">Services subtotal</div><div class="ttl-value" id="ttlSvcSubtotal">$0</div></div>
                <div class="totals-tile"><div class="ttl-label">Vendor / pass-through</div><div class="ttl-value" id="ttlVendor">$0</div></div>
                <div class="totals-tile"><div class="ttl-label">Management / markup</div><div class="ttl-value" id="ttlMargin">$0</div></div>
                <div class="totals-tile"><div class="ttl-label">Contingency</div><div class="ttl-value" id="ttlContingency">$0</div></div>
              </div>
              <div id="footerBreakdown" style="margin-top:14px;font-size:12px;color:var(--muted);"></div>
            </div>
          </aside>
        </div>
      </div>
    `;

    // Hydrate client fields & profile dropdown
    queueMicrotask(() => {
      const pn = document.getElementById("estProjectName");
      const cn = document.getElementById("estClientName");
      const ce = document.getElementById("estClientEmail");
      const st = document.getElementById("estStatus");
      const pr = document.getElementById("estProfile");
      if (pn) pn.value = state.projectName;
      if (cn) cn.value = state.clientName;
      if (ce) ce.value = state.clientEmail;
      if (st) st.value = state.status;
      if (pr) {
        pr.innerHTML = "";
        catalog.profiles.forEach(p => {
          const o = document.createElement("option");
          o.value = p.slug; o.textContent = `${p.name} (margin ${p.target_gross_margin_pct}%)`;
          if (p.slug === state.profileSlug) o.selected = true;
          pr.appendChild(o);
        });
        pr.addEventListener("change", () => { state.profileSlug = pr.value; recomputeTotalsOnly(); renderReviewLines(); });
      }
      pn && pn.addEventListener("input", () => { state.projectName = pn.value; });
      cn && cn.addEventListener("input", () => { state.clientName  = cn.value; });
      ce && ce.addEventListener("input", () => { state.clientEmail = ce.value; });
      st && st.addEventListener("change", () => { state.status = st.value; });
      renderReviewLines();
    });

    return wrap;
  }

  // ===== Field renderer =====
  function renderField(q) {
    const wrap = document.createElement("div");
    wrap.className = "pq-field";
    if (q.input_type === "multi_choice") wrap.classList.add("full");

    const lbl = document.createElement("span");
    lbl.className = "pq-label";
    lbl.textContent = q.question_text;
    wrap.appendChild(lbl);

    const opts = catalog.optionsByQuestion[q.id] || [];
    const val = state.answers[q.answer_key];

    if (q.input_type === "single_choice") {
      const box = document.createElement("div");
      box.className = "pq-chips";
      opts.forEach(o => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pq-chip" + (o.value === val ? " on" : "");
        b.textContent = o.label;
        b.addEventListener("click", () => {
          state.answers[q.answer_key] = o.value;
          recomputeTotalsOnly();
          renderStage(); // re-render in case display rules change
        });
        box.appendChild(b);
      });
      wrap.appendChild(box);

    } else if (q.input_type === "multi_choice") {
      const box = document.createElement("div");
      box.className = "pq-chips";
      const cur = Array.isArray(val) ? val : [];
      opts.forEach(o => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pq-chip multi" + (cur.includes(o.value) ? " on" : "");
        b.textContent = o.label;
        b.addEventListener("click", () => {
          const arr = Array.isArray(state.answers[q.answer_key]) ? state.answers[q.answer_key].slice() : [];
          const idx = arr.indexOf(o.value);
          if (idx === -1) arr.push(o.value); else arr.splice(idx, 1);
          state.answers[q.answer_key] = arr;
          recomputeTotalsOnly();
          b.classList.toggle("on");
        });
        box.appendChild(b);
      });
      wrap.appendChild(box);

    } else if (q.input_type === "boolean") {
      const box = document.createElement("div");
      box.className = "pq-toggle";
      const cur = !!val;
      ["Yes", "No"].forEach((label, i) => {
        const b = document.createElement("button");
        b.type = "button";
        const isYes = i === 0;
        b.textContent = label;
        b.className = (isYes === cur) ? "on" : "";
        b.addEventListener("click", () => {
          state.answers[q.answer_key] = isYes;
          recomputeTotalsOnly();
          renderStage(); // child questions may appear
        });
        box.appendChild(b);
      });
      wrap.appendChild(box);

    } else if (q.input_type === "number") {
      const inp = document.createElement("input");
      inp.type = "number";
      inp.className = "pm-input";
      inp.value = (val === undefined || val === null) ? "" : val;
      inp.min = "0";
      inp.step = "1";
      inp.addEventListener("input", () => {
        const num = inp.value === "" ? null : Number(inp.value);
        state.answers[q.answer_key] = (Number.isFinite(num) ? num : null);
        recomputeTotalsOnly();
      });
      wrap.appendChild(inp);

    } else {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "pm-input";
      inp.value = val == null ? "" : String(val);
      inp.addEventListener("input", () => {
        state.answers[q.answer_key] = inp.value;
        recomputeTotalsOnly();
      });
      wrap.appendChild(inp);
    }

    if (q.help_text) {
      const h = document.createElement("span");
      h.className = "pq-help";
      h.textContent = q.help_text;
      wrap.appendChild(h);
    }
    return wrap;
  }

  // ===== Line generation (same engine as before) =====
  function svc(slug) { return catalog.serviceBySlug[slug] || null; }
  function pushServiceLine(lines, slug, opts = {}) {
    const s = svc(slug);
    if (!s) return null;
    const qty = opts.quantity != null ? Number(opts.quantity) : Number(s.default_quantity || 1);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const unit = opts.unitPrice != null ? Number(opts.unitPrice) : Number(s.base_price || 0);
    const cost = opts.unitCost  != null ? Number(opts.unitCost)  : Number(s.internal_cost_basis || 0);
    const existing = lines.find(l => l.kind === "service" && l.service_slug === slug);
    if (existing && !opts.allowDuplicate) {
      existing.quantity = round2(existing.quantity + qty);
      existing.line_total = round2(existing.quantity * existing.unit_price);
      existing.line_cost  = round2(existing.quantity * existing.unit_cost);
      return existing;
    }
    const line = {
      kind: "service", service_slug: slug, service_id: s.id,
      description: opts.description || s.name,
      unit_label: s.unit_label, billing_interval: s.billing_interval,
      quantity: round2(qty), unit_price: round2(unit), unit_cost: round2(cost),
      line_total: round2(qty * unit), line_cost: round2(qty * cost),
      group: opts.group || (s.billing_interval === "month" ? "recurring" : "service"),
      meta: opts.meta || {},
    };
    lines.push(line);
    return line;
  }
  function pushVendorLine(lines, ref, opts = {}) {
    const plan = catalog.vendorPlanByRef[ref];
    if (!plan) return null;
    const qty = opts.quantity != null ? Number(opts.quantity) : 1;
    const unitMonthly = Number(plan.monthly_equivalent != null ? plan.monthly_equivalent : plan.price_amount || 0);
    if (!unitMonthly && !opts.allowZero) return null;
    const line = {
      kind: "vendor", vendor_plan_id: plan.id, service_slug: null,
      description: opts.description || `${plan.vendor_name} – ${plan.plan_name}`,
      unit_label: plan.unit_label, billing_interval: "month",
      quantity: round2(qty), unit_price: round2(unitMonthly), unit_cost: round2(unitMonthly),
      line_total: round2(qty * unitMonthly), line_cost: round2(qty * unitMonthly),
      group: "vendor_monthly", meta: opts.meta || {},
    };
    lines.push(line);
    return line;
  }
  function pushManualLine(lines, description, unitPrice, billing = "month", group = "ad_passthrough") {
    const line = {
      kind: "manual", service_slug: null, vendor_plan_id: null, description,
      unit_label: billing === "month" ? "month" : "unit", billing_interval: billing,
      quantity: 1, unit_price: round2(unitPrice || 0), unit_cost: round2(unitPrice || 0),
      line_total: round2(unitPrice || 0), line_cost: round2(unitPrice || 0),
      group, meta: {},
    };
    lines.push(line);
    return line;
  }

  function buildLines() {
    const a = state.answers;
    const lines = [];

    if (a.project_type) pushServiceLine(lines, "discovery-strategy");

    const projTypeQ = catalog.questions.find(q => q.answer_key === "project_type");
    if (projTypeQ) {
      const opt = (catalog.optionsByQuestion[projTypeQ.id] || []).find(o => o.value === a.project_type);
      const recs = opt && opt.metadata && Array.isArray(opt.metadata.recommended_services) ? opt.metadata.recommended_services : [];
      recs.forEach(slug => pushServiceLine(lines, slug));
    }

    if (a.project_type === "website" || a.project_type === "ecommerce") {
      const extra = Math.max(Number(a.page_count || 0) - 5, 0);
      if (extra > 0) pushServiceLine(lines, "additional-page", { quantity: extra });
      if (a.content_ready === "needs_writing") {
        const pages = Math.max(Number(a.page_count || 0), 1);
        pushServiceLine(lines, "copywriting-page", { quantity: pages });
      } else if (a.content_ready === "partial") {
        const pages = Math.max(Math.round(Number(a.page_count || 0) / 2), 1);
        pushServiceLine(lines, "copywriting-page", { quantity: pages });
      }
      pushServiceLine(lines, "seo-basic-setup");
      pushServiceLine(lines, "analytics-tracking");
      if (a.needs_ecommerce && a.project_type === "website") {
        pushServiceLine(lines, "ecommerce-setup");
        pushServiceLine(lines, "payment-shipping-config");
      }
      if (a.needs_ecommerce && Number(a.products_count || 0) > 0) {
        pushServiceLine(lines, "product-catalog-import", { quantity: Number(a.products_count || 0) });
      }
      if (a.needs_booking) pushServiceLine(lines, "booking-membership-setup");
    }

    if (Number(a.integrations_count || 0) > 0) {
      pushServiceLine(lines, "api-integration", { quantity: Number(a.integrations_count) });
    }

    if (a.needs_crm || a.project_type === "crm_automation") {
      pushServiceLine(lines, "zoho-crm-setup");
      if (Number(a.workflows_count || 0) > 0) {
        pushServiceLine(lines, "automation-workflow", { quantity: Number(a.workflows_count) });
      }
    }

    if (a.needs_ai_iris || a.project_type === "ai_data") {
      pushServiceLine(lines, "iris-style-chat-assistant");
      pushServiceLine(lines, "ai-knowledge-base");
      const chats = Number(a.expected_ai_chats || 0);
      const tier = chats <= 500 ? 25 : chats <= 2500 ? 75 : chats <= 10000 ? 200 : 500;
      pushServiceLine(lines, "ai-usage-budget", { unitPrice: tier, quantity: 1, description: `AI usage budget (~${chats.toLocaleString()} chats/mo)` });
    }

    if (a.project_type === "social_media") {
      const platforms = Array.isArray(a.social_platforms) ? a.social_platforms : [];
      if (platforms.length) pushServiceLine(lines, "social-media-account-setup", { quantity: platforms.length });
      pushServiceLine(lines, "social-media-strategy");

      if (a.social_package === "basic")    pushServiceLine(lines, "social-media-management-basic");
      else if (a.social_package === "growth")  pushServiceLine(lines, "social-media-management-growth");
      else if (a.social_package === "premium") pushServiceLine(lines, "social-media-management-premium");
      else if (a.social_package === "custom_content") {
        if (Number(a.posts_per_month || 0) > 0) pushServiceLine(lines, "social-post-design", { quantity: Number(a.posts_per_month) });
        if (Number(a.reels_per_month || 0) > 0) pushServiceLine(lines, "social-reel-short-video", { quantity: Number(a.reels_per_month) });
        if (Number(a.story_sets_per_month || 0) > 0) pushServiceLine(lines, "social-story-set", { quantity: Number(a.story_sets_per_month) });
        pushServiceLine(lines, "social-content-calendar");
      }
      if (a.needs_community_management) pushServiceLine(lines, "community-management-basic");
      if (a.needs_paid_ads) {
        pushServiceLine(lines, "paid-ads-setup");
        pushServiceLine(lines, "paid-ads-management");
      }
      if (a.needs_paid_ads && Number(a.monthly_ad_budget || 0) > 0) {
        pushManualLine(lines, `Client ad spend (pass-through)`, Number(a.monthly_ad_budget), "month", "ad_passthrough");
      }
      if (a.creative_readiness === "needs_production") pushServiceLine(lines, "photoshoot-creative-direction");
      pushServiceLine(lines, "social-reporting");
    }

    const hostingPref = a.hosting_preference || a.platform || "recommend";
    if (a.platform === "wix" || hostingPref === "wix") {
      const wixPlan = a.needs_ecommerce ? "wix:business-annual" : "wix:core-annual";
      pushVendorLine(lines, wixPlan, { description: a.needs_ecommerce ? "Wix Business (annual)" : "Wix Core (annual)" });
    }
    if (a.platform === "custom_stack" || hostingPref === "vercel_supabase") {
      pushVendorLine(lines, "vercel:pro-seat", { description: "Vercel Pro (1 seat)" });
      pushVendorLine(lines, "supabase:pro",   { description: "Supabase Pro" });
    }

    const inboxes = Number(a.email_inboxes || 0);
    if (inboxes > 0) {
      pushVendorLine(lines, "google-workspace:business-standard-annual", {
        quantity: inboxes,
        description: `Google Workspace Business Standard × ${inboxes}`,
      });
    }

    if ((a.needs_crm || a.project_type === "crm_automation") && Number(a.users_count || 0) > 0) {
      pushVendorLine(lines, "zoho-crm:standard-annual", {
        quantity: Number(a.users_count),
        description: `Zoho CRM Standard × ${Number(a.users_count)}`,
      });
    }

    if (a.platform === "custom_stack" || hostingPref === "vercel_supabase") {
      pushServiceLine(lines, "hosting-management");
    }

    if (a.maintenance_level === "basic")  pushServiceLine(lines, "website-care-basic");
    else if (a.maintenance_level === "growth") pushServiceLine(lines, "website-care-growth");
    else if (a.maintenance_level === "app")    pushServiceLine(lines, "app-care");

    return lines;
  }

  function computeTotals(lines) {
    const profile = catalog.profileBySlug[state.profileSlug] || catalog.defaultProfile || {};
    const contingencyPct = Number(profile.contingency_pct || 0);
    const vendorMarkupPct = Number(profile.default_vendor_markup_pct || 0);
    const minFee = Number(profile.minimum_project_fee || 0);
    const rushPct = (() => {
      const dl = state.answers.deadline;
      if (dl === "soon") return 10;
      if (dl === "urgent") return 20;
      return 0;
    })();
    const langCount = Math.max(Number(state.answers.languages_count || 1), 1);
    const langMult = langCount > 1 ? (1 + (langCount - 1) * 0.45) : 1;

    let svcOneTime = 0, svcMonthly = 0, vendorMonthly = 0, vendorOneTime = 0;
    let internalOneTime = 0, internalMonthly = 0, adSpend = 0;

    lines.forEach(l => {
      if (l.kind === "service") {
        if (l.billing_interval === "month") { svcMonthly += l.line_total; internalMonthly += l.line_cost; }
        else { svcOneTime += l.line_total; internalOneTime += l.line_cost; }
      } else if (l.kind === "vendor") {
        if (l.billing_interval === "month") vendorMonthly += l.line_total;
        else vendorOneTime += l.line_total;
      } else if (l.kind === "manual") {
        if (l.group === "ad_passthrough") adSpend += l.line_total;
        else if (l.billing_interval === "month") vendorMonthly += l.line_total;
        else vendorOneTime += l.line_total;
      }
    });

    const adjustedSvcOneTime = round2(svcOneTime * langMult * (1 + rushPct / 100));
    const langRushDelta = round2(adjustedSvcOneTime - svcOneTime);

    const vendorMarkupMonthly = round2(vendorMonthly * (vendorMarkupPct / 100));
    const vendorMarkupOneTime = round2(vendorOneTime * (vendorMarkupPct / 100));
    const contingencyAmount = round2((adjustedSvcOneTime + vendorOneTime + vendorMarkupOneTime) * (contingencyPct / 100));
    const marginAmount = round2((adjustedSvcOneTime - internalOneTime) + (svcMonthly - internalMonthly));

    let totalOneTimePreMin = round2(adjustedSvcOneTime + vendorOneTime + vendorMarkupOneTime + contingencyAmount);
    const minFeeApplied = totalOneTimePreMin < minFee && minFee > 0;
    const totalOneTime = minFeeApplied ? minFee : totalOneTimePreMin;
    const totalMonthly = round2(svcMonthly + vendorMonthly + vendorMarkupMonthly + adSpend);

    return {
      profile, svcOneTime, svcMonthly, adjustedSvcOneTime, langRushDelta,
      vendorOneTime, vendorMonthly, vendorMarkupOneTime, vendorMarkupMonthly,
      contingencyAmount, contingencyPct, rushPct, langMult, langCount,
      marginAmount, internalOneTime, internalMonthly, adSpend,
      minFee, minFeeApplied, totalOneTime, totalMonthly,
    };
  }

  // ===== Render ribbon (always visible) =====
  function renderRibbon() {
    const t = state.totals;
    document.getElementById("rbOneTime").textContent = fmt$(t.totalOneTime || 0);
    document.getElementById("rbMonthly").textContent = `${fmt$(t.totalMonthly || 0)}/mo`;
    document.getElementById("rbLineCount").textContent = String(state.lines.length);
    const tag = document.getElementById("rbTag");
    if (!state.answers.project_type) {
      tag.textContent = "Pick a project type to start.";
    } else {
      const bits = [];
      if (t.langCount > 1) bits.push(`× ${t.langCount} langs`);
      if (t.rushPct) bits.push(`+${t.rushPct}% rush`);
      if (t.minFeeApplied) bits.push(`min fee ${fmt$(t.minFee)}`);
      tag.textContent = bits.length ? bits.join(" · ") : `${t.profile?.name || "Standard"} profile`;
    }
  }

  // ===== Render line items into review =====
  function renderReviewLines() {
    const t = state.totals;
    const $el = (id) => document.getElementById(id);
    if ($el("ttlOneTime")) {
      $el("ttlOneTime").textContent  = fmt$(t.totalOneTime || 0);
      $el("ttlMonthly").textContent  = fmt$(t.totalMonthly || 0);
      $el("ttlSvcSubtotal").textContent = fmt$((t.adjustedSvcOneTime || 0) + (t.svcMonthly || 0));
      $el("ttlVendor").textContent   = fmt$((t.vendorOneTime || 0) + (t.vendorMonthly || 0));
      $el("ttlMargin").textContent   = fmt$((t.vendorMarkupOneTime || 0) + (t.vendorMarkupMonthly || 0));
      $el("ttlContingency").textContent = fmt$(t.contingencyAmount || 0);
    }

    const block = document.getElementById("linesBlock");
    if (!block) return;
    block.innerHTML = "";

    if (!state.lines.length) {
      block.innerHTML = '<div class="pricing-empty">No line items yet. Go back and pick a project type.</div>';
      return;
    }

    const groups = {
      "service":   { title: "ZAtech service work (one-time)", lines: [] },
      "recurring": { title: "ZAtech recurring monthly", lines: [] },
      "vendor_monthly": { title: "Vendor / pass-through (monthly)", lines: [] },
      "ad_passthrough": { title: "Paid ads – client spend (pass-through)", lines: [] },
    };
    state.lines.forEach(l => {
      const g = groups[l.group] || (l.billing_interval === "month" ? groups.recurring : groups.service);
      g.lines.push(l);
    });

    Object.values(groups).forEach(g => {
      if (!g.lines.length) return;
      const h = document.createElement("h5");
      h.textContent = g.title;
      block.appendChild(h);
      g.lines.forEach(l => {
        const row = document.createElement("div");
        row.className = "line-row";
        const monthly = l.billing_interval === "month";
        const tagHtml = monthly
          ? '<span class="lr-tag monthly">monthly</span>'
          : (l.kind === "vendor" ? '<span class="lr-tag vendor">vendor</span>' : '<span class="lr-tag">one-time</span>');
        row.innerHTML = `
          <div>
            <div class="lr-desc">${escapeHtml(l.description)} ${tagHtml}</div>
            <div class="lr-qty">${l.quantity} ${escapeHtml(l.unit_label || "")} × ${fmt$(l.unit_price)}</div>
          </div>
          <div class="lr-amt">${fmt$(l.line_total)}${monthly ? "/mo" : ""}</div>
        `;
        block.appendChild(row);
      });
    });

    // Footer breakdown
    const fb = document.getElementById("footerBreakdown");
    if (fb) {
      const bits = [];
      if (t.langCount > 1) bits.push(`Multilingual × ${t.langCount} (mult ${t.langMult.toFixed(2)})`);
      if (t.rushPct) bits.push(`Rush deadline +${t.rushPct}%`);
      if (t.langRushDelta) bits.push(`Multiplier delta +${fmt$(t.langRushDelta)}`);
      if (t.contingencyPct) bits.push(`Contingency ${t.contingencyPct}% = ${fmt$(t.contingencyAmount)}`);
      if (t.vendorMarkupMonthly || t.vendorMarkupOneTime) bits.push(`Vendor markup ${(t.profile?.default_vendor_markup_pct || 0)}%`);
      if (t.minFeeApplied) bits.push(`Minimum project fee applied (${fmt$(t.minFee)})`);
      fb.innerHTML = bits.length ? bits.map(b => `• ${escapeHtml(b)}`).join("<br>") : "";
    }
  }

  function recomputeTotalsOnly() {
    state.lines = buildLines();
    state.totals = computeTotals(state.lines);
    renderRibbon();
    if (state.stage === 4) renderReviewLines();
    updateNav();
  }

  // ===== Save / load =====
  async function saveEstimate() {
    if (!catalog.ready) { flashErr("Catalog not loaded."); return; }
    if (!state.answers.project_type) { flashErr("Pick a project type first."); return; }

    const t = state.totals;
    const profile = catalog.profileBySlug[state.profileSlug] || catalog.defaultProfile;

    const payload = {
      status: state.status || "draft",
      client_name: state.clientName || null,
      client_email: state.clientEmail || null,
      project_name: state.projectName || null,
      currency: profile?.currency || "USD",
      profile_id: profile?.id || null,
      subtotal_one_time: round2(t.adjustedSvcOneTime || 0),
      subtotal_recurring_monthly: round2(t.svcMonthly || 0),
      vendor_cost_one_time: round2((t.vendorOneTime || 0) + (t.vendorMarkupOneTime || 0)),
      vendor_cost_monthly: round2((t.vendorMonthly || 0) + (t.vendorMarkupMonthly || 0) + (t.adSpend || 0)),
      internal_cost_one_time: round2(t.internalOneTime || 0),
      internal_cost_monthly: round2(t.internalMonthly || 0),
      margin_amount: round2(t.marginAmount || 0),
      contingency_amount: round2(t.contingencyAmount || 0),
      tax_amount: 0,
      total_one_time: round2(t.totalOneTime || 0),
      total_recurring_monthly: round2(t.totalMonthly || 0),
      source: "pricing_tool",
      created_by: "portal",
    };

    let estimateId = state.editingId;
    try {
      if (estimateId) {
        const { error } = await sb.from("pricing_estimates").update(payload).eq("id", estimateId);
        if (error) throw error;
      } else {
        const estimateNo = await nextEstimateNo();
        payload.estimate_no = estimateNo;
        const { data, error } = await sb.from("pricing_estimates").insert(payload).select("id, estimate_no").single();
        if (error) throw error;
        estimateId = data.id;
        state.editingId = estimateId;
        state.estimateNo = data.estimate_no;
      }

      await sb.from("pricing_estimate_answers").delete().eq("estimate_id", estimateId);
      await sb.from("pricing_estimate_lines").delete().eq("estimate_id", estimateId);

      const answerRows = Object.entries(state.answers)
        .filter(([k, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => {
          const q = catalog.questions.find(qq => qq.answer_key === k);
          return {
            estimate_id: estimateId,
            question_id: q ? q.id : null,
            question_slug: q ? q.slug : k,
            answer_value: v,
          };
        });
      if (answerRows.length) {
        const { error: aerr } = await sb.from("pricing_estimate_answers").insert(answerRows);
        if (aerr) throw aerr;
      }

      const lineRows = state.lines.map((l, i) => ({
        estimate_id: estimateId,
        line_type: l.kind === "service" ? "service" : (l.kind === "vendor" ? "vendor" : "manual"),
        service_item_id: l.service_id || null,
        vendor_plan_id: l.vendor_plan_id || null,
        description: l.description,
        quantity: l.quantity,
        unit_label: l.unit_label || "unit",
        billing_interval: l.billing_interval || "one_time",
        unit_cost: l.unit_cost,
        unit_price: l.unit_price,
        markup_pct: 0,
        sort_order: i * 10,
        metadata: { group: l.group, ...(l.meta || {}) },
      }));
      if (lineRows.length) {
        const { error: lerr } = await sb.from("pricing_estimate_lines").insert(lineRows);
        if (lerr) throw lerr;
      }

      const snapshot = {
        savedAt: new Date().toISOString(),
        answers: state.answers,
        totals: state.totals,
        lines: state.lines,
        profileSlug: state.profileSlug,
      };
      await sb.from("pricing_estimate_snapshots").insert({ estimate_id: estimateId, snapshot });

      flashInfo(`Saved ${state.estimateNo || ""} ✓`);
      await loadHistory();
    } catch (err) {
      console.error("[pricing:save]", err);
      flashErr(err.message || "Save failed.");
    }
  }

  async function nextEstimateNo() {
    try {
      const yr = new Date().getFullYear();
      const { data } = await sb
        .from("pricing_estimates")
        .select("estimate_no")
        .like("estimate_no", `EST-${yr}-%`)
        .order("estimate_no", { ascending: false })
        .limit(1);
      const last = data && data[0] && data[0].estimate_no;
      const lastN = last ? Number(last.split("-").pop()) : 0;
      const n = Number.isFinite(lastN) ? lastN + 1 : 1;
      return `EST-${yr}-${String(n).padStart(4, "0")}`;
    } catch (_) {
      return `EST-${Date.now()}`;
    }
  }

  // ===== History =====
  async function loadHistory() {
    const body = document.getElementById("historyBody");
    if (!body) return;
    const statusF = document.getElementById("historyStatusFilter").value;
    let q = sb.from("pricing_estimates").select("*").order("created_at", { ascending: false }).limit(200);
    if (statusF && statusF !== "all") q = q.eq("status", statusF);
    const { data, error } = await q;
    if (error) {
      if (isMissingTable(error)) return;
      console.error("[pricing:history]", error);
      return;
    }
    document.getElementById("historyMeta").textContent = `${data.length} estimate${data.length === 1 ? "" : "s"}`;
    body.innerHTML = "";
    if (!data.length) {
      body.innerHTML = `<tr><td colspan="7" class="pricing-empty">No saved estimates yet.</td></tr>`;
      return;
    }
    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.estimate_no || row.id.slice(0,8))}</td>
        <td>${escapeHtml(row.project_name || "—")}</td>
        <td>${escapeHtml(row.client_name || "—")}</td>
        <td><span class="status-pill ${row.status}">${escapeHtml(row.status)}</span></td>
        <td>${fmt$(row.total_one_time)}</td>
        <td>${fmt$(row.total_recurring_monthly)}/mo</td>
        <td>${new Date(row.created_at).toLocaleDateString()}</td>
      `;
      tr.addEventListener("click", () => openEstimate(row.id));
      body.appendChild(tr);
    });
  }

  async function openEstimate(id) {
    try {
      const [eRes, aRes] = await Promise.all([
        sb.from("pricing_estimates").select("*").eq("id", id).single(),
        sb.from("pricing_estimate_answers").select("*").eq("estimate_id", id),
      ]);
      if (eRes.error) throw eRes.error;
      const e = eRes.data;
      state.answers = {};
      catalog.questions.forEach(q => {
        if (q.default_value !== undefined && q.default_value !== null) state.answers[q.answer_key] = q.default_value;
      });
      (aRes.data || []).forEach(a => {
        const q = catalog.questions.find(qq => qq.slug === a.question_slug);
        if (q) state.answers[q.answer_key] = a.answer_value;
      });
      state.editingId = e.id;
      state.estimateNo = e.estimate_no;
      state.profileSlug = (catalog.profiles.find(p => p.id === e.profile_id) || {}).slug || state.profileSlug;
      state.projectName = e.project_name || "";
      state.clientName = e.client_name || "";
      state.clientEmail = e.client_email || "";
      state.status = e.status || "draft";
      state.stage = 4; // jump straight to review
      switchTab("estimator");
      recomputeTotalsOnly();
      renderStage();
      flashInfo(`Opened ${e.estimate_no || e.id.slice(0,8)}`);
    } catch (err) {
      console.error("[pricing:open]", err);
      flashErr("Failed to open estimate.");
    }
  }

  // ===== Tabs / navigation =====
  function switchTab(tab) {
    $$(".ptab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("estimator-tab").style.display = tab === "estimator" ? "" : "none";
    document.getElementById("history-tab").style.display   = tab === "history"  ? "" : "none";
    if (tab === "history") loadHistory();
  }

  function goToStage(s) {
    s = Math.max(1, Math.min(4, Number(s) || 1));
    if (s > 1 && !state.answers.project_type) return; // gate
    state.stage = s;
    renderStage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetEstimate() {
    state.answers = {};
    catalog.questions.forEach(q => {
      if (q.default_value !== undefined && q.default_value !== null) state.answers[q.answer_key] = q.default_value;
    });
    state.editingId = null;
    state.estimateNo = null;
    state.projectName = "";
    state.clientName = "";
    state.clientEmail = "";
    state.status = "draft";
    state.stage = 1;
    recomputeTotalsOnly();
    renderStage();
  }

  function bindEvents() {
    document.querySelectorAll(".ptab").forEach(b => {
      b.addEventListener("click", () => switchTab(b.dataset.tab));
    });
    document.getElementById("prevBtn").addEventListener("click", () => goToStage(state.stage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => {
      if (state.stage === 1 && !state.answers.project_type) { flashErr("Pick a project type first."); return; }
      goToStage(state.stage + 1);
    });
    document.getElementById("saveEstimateBtn").addEventListener("click", saveEstimate);
    document.getElementById("resetEstimateBtn").addEventListener("click", () => {
      if (state.editingId && !confirm("Discard the current estimate and start over?")) return;
      resetEstimate();
    });
    document.getElementById("historyStatusFilter").addEventListener("change", loadHistory);
    // Stepper clicks
    $$(".step").forEach(el => el.addEventListener("click", () => goToStage(el.dataset.stage)));
  }

  // ===== Boot =====
  async function boot() {
    if (!window.sb) return;
    const ok = await loadCatalog();
    if (!ok) return;
    bindEvents();
    recomputeTotalsOnly();
    renderStage();
    loadHistory();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
