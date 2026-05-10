import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "zatech-portal";
const REQUIRE_AUTH = (Deno.env.get("IRIS_REQUIRE_AUTH") || "true").toLowerCase() !== "false";
const FAST_MODEL = Deno.env.get("IRIS_MODEL_FAST") || "gpt-5.4-mini";
const SMART_MODEL = Deno.env.get("IRIS_MODEL_SMART") || "gpt-5.4";
const MAX_OUTPUT_TOKENS = Number(Deno.env.get("IRIS_MAX_OUTPUT_TOKENS") || 650);
const MAX_HISTORY_MESSAGES = Number(Deno.env.get("IRIS_MAX_HISTORY_MESSAGES") || 8);
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown[];
};

type FirebaseUser = {
  uid: string;
  email: string;
  name: string;
};

type UserProfile = {
  greeting: string;
  persona: string;
};

const USER_PROFILES: Record<string, UserProfile> = {
  "ahmad-abuawwad@zatechjo.com": {
    greeting: "Hey boss",
    persona: [
      "You are talking to Ahmad, the person who built this portal and Iris.",
      "He is a Wix Certified Developer and Velo expert who runs ZAtech and handles frontend, backend, automations, Supabase, and custom JS.",
      "Do not over-explain technical basics. Be sharp, practical, and direct. If the data looks bad, say it straight.",
    ].join(" "),
  },
  "za@zatechjo.com": {
    greeting: "Hey Zuhri",
    persona: [
      "You are talking to Zuhri, the strategic half of ZAtech: co-founder, entrepreneur, and business developer.",
      "Frame answers in outcomes, clarity, cash, risk, and company impact. Avoid technical over-explanation.",
      "Give organized, actionable answers and call out financial issues plainly.",
    ].join(" "),
  },
};

type ToolContext = {
  sb: ReturnType<typeof createClient>;
  user: FirebaseUser | null;
  now: Date;
  timezone: string;
};

type ToolResult = {
  ok: boolean;
  tool: string;
  data?: unknown;
  error?: string;
};

type JsonWebKeySet = {
  keys: JsonWebKey[];
};

let jwksCache: { keys: JsonWebKey[]; expiresAt: number } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "Iris is missing OPENAI_API_KEY." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Iris is missing Supabase configuration." }, 500);
    }

    const authUser = await authenticateRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = mergeUserContext(authUser, body?.user);
    const messages = sanitizeMessages(body.messages);
    const latestQuestion = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    if (!latestQuestion.trim()) {
      return jsonResponse({ error: "No question provided." }, 400);
    }

    const timezone = String(body?.context?.timezone || "Asia/Amman");
    const ctx: ToolContext = {
      sb: createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      user,
      now: new Date(),
      timezone,
    };

    const directAnswer = await maybeAnswerDirect(latestQuestion, ctx);
    if (directAnswer) {
      return jsonResponse({
        reply: directAnswer.reply,
        model: "deterministic",
        toolsUsed: directAnswer.toolsUsed,
        usage: null,
      });
    }

    const model = chooseModel(latestQuestion);
    const toolsUsed: string[] = [];
    const workingMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt({ user, timezone, page: body?.context?.page }) },
      ...messages,
    ];

    let completion = await callOpenAI(openaiKey, {
      model,
      messages: workingMessages,
      tools: IRIS_TOOLS,
      tool_choice: "auto",
      max_completion_tokens: MAX_OUTPUT_TOKENS,
    });

    for (let i = 0; i < 3; i++) {
      const assistantMessage = completion?.choices?.[0]?.message;
      const toolCalls = assistantMessage?.tool_calls || [];

      if (!toolCalls.length) {
        return jsonResponse({
          reply: cleanReply(assistantMessage?.content),
          model,
          toolsUsed,
          usage: completion?.usage || null,
        });
      }

      workingMessages.push({
        role: "assistant",
        content: assistantMessage.content ?? null,
        tool_calls: assistantMessage.tool_calls,
      });

      const toolResults = await Promise.all(toolCalls.map(async (toolCall: any) => {
        const name = String(toolCall?.function?.name || "");
        const args = safeJsonParse(toolCall?.function?.arguments || "{}");
        toolsUsed.push(name);
        const result = await runTool(name, args, ctx);
        return {
          role: "tool" as const,
          tool_call_id: String(toolCall.id),
          name,
          content: compactJson(result, 14000),
        };
      }));

      workingMessages.push(...toolResults);

      completion = await callOpenAI(openaiKey, {
        model,
        messages: workingMessages,
        tools: IRIS_TOOLS,
        tool_choice: "auto",
        max_completion_tokens: MAX_OUTPUT_TOKENS,
      });
    }

    const finalCompletion = await callOpenAI(openaiKey, {
      model,
      messages: [
        ...workingMessages,
        {
          role: "user",
          content: "Answer my original question directly from the gathered tool results. Do not call more tools.",
        },
      ],
      max_completion_tokens: MAX_OUTPUT_TOKENS,
    });

    return jsonResponse({
      reply: cleanReply(finalCompletion?.choices?.[0]?.message?.content),
      model,
      toolsUsed,
      usage: finalCompletion?.usage || completion?.usage || null,
    });
  } catch (err) {
    console.error("[iris]", err);
    const message = err instanceof Error ? err.message : "Unexpected Iris error.";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return jsonResponse({ error: status === 401 ? "Unauthorized." : message }, status);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function systemPrompt(input: { user: FirebaseUser | null; timezone: string; page?: string }) {
  const userProfile = resolveUserProfile(input.user);
  const userLine = input.user?.email
    ? `Current user: ${input.user.name || input.user.email} <${input.user.email}>.`
    : "Current user: unknown portal user.";
  const currentDate = isoDateInTimeZone(new Date(), input.timezone);

  return [
    "You are Iris, the ZAtech portal AI assistant.",
    "ZAtech is a digital agency based in Jordan that builds websites, apps, CRMs, and digital solutions for clients across the region.",
    userLine,
    `Timezone: ${input.timezone}. Current date: ${currentDate}.`,
    input.page ? `Current portal page: ${String(input.page).slice(0, 80)}.` : "",
    "",
    "Who you are talking to:",
    userProfile.persona,
    "",
    "Personality:",
    "You are not a generic chatbot. You are part of the ZAtech team: direct, fast, and useful.",
    `In a fresh conversation, your natural opening is: "${userProfile.greeting}". Do not force it into every answer.`,
    "Never open with 'Certainly', 'Great question', 'Of course', or 'As an AI'.",
    "A little dry wit is fine, but the work comes first.",
    "Be sharp, direct, and useful. Keep most answers under 180 words unless the user asks for detail.",
    "For portal/business data questions, call tools instead of guessing. Never invent numbers, invoices, clients, dates, balances, or project status.",
    "For simple counts like 'how many clients do we have?', pull the exact table count immediately. Never say 'if you want, I can pull it' when a read-only tool can answer now.",
    "If the user asks about clients, use get_clients unless the question is clearly only general strategy.",
    "When you calculate a total, briefly say what data it is based on. If a table or field is unavailable, say what is missing.",
    "If something looks off, like overdue invoices, weak margins, unpaid subcontractors, or a losing project, flag it plainly.",
    "You are read-only. Do not claim to create, edit, delete, send, upload, or change portal records.",
    "For general knowledge questions, answer briefly from your own knowledge. If the answer needs live web/current data, say you do not have web access from this portal.",
    "Use USD formatting for money unless the record explicitly gives another currency.",
  ].filter(Boolean).join("\n");
}

function resolveUserProfile(user: FirebaseUser | null): UserProfile {
  const email = String(user?.email || "").toLowerCase();
  if (email && USER_PROFILES[email]) return USER_PROFILES[email];

  const name = String(user?.name || user?.email?.split("@")[0] || "").trim();
  if (name) {
    return {
      greeting: `Hey ${name}`,
      persona: `You are talking to ${name}, a ZAtech team member. Be helpful, direct, and professional.`,
    };
  }

  return {
    greeting: "Hey",
    persona: "You are talking to a ZAtech team member. Be helpful, professional, and direct.",
  };
}

function mergeUserContext(authUser: FirebaseUser | null, browserUser: unknown): FirebaseUser | null {
  if (!authUser) return null;
  const browser = browserUser && typeof browserUser === "object" ? browserUser as Record<string, unknown> : {};
  const browserName = String(browser.name || "").trim();
  return {
    ...authUser,
    name: authUser.name && authUser.name !== authUser.email ? authUser.name : browserName || authUser.name,
  };
}

function sanitizeMessages(input: unknown): ChatMessage[] {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .filter((m) => m && typeof m === "object")
    .map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 3000),
    }))
    .filter((m) => m.content?.trim())
    .slice(-MAX_HISTORY_MESSAGES);
}

function chooseModel(question: string) {
  const q = question.toLowerCase();
  const needsReasoning = /\b(analy[sz]e|why|forecast|predict|strategy|recommend|compare|trend|margin|profit|loss|cash flow|risk|explain|summari[sz]e|insight)\b/.test(q);
  return needsReasoning ? SMART_MODEL : FAST_MODEL;
}

async function maybeAnswerDirect(question: string, ctx: ToolContext): Promise<{ reply: string; toolsUsed: string[] } | null> {
  const clientCountArgs = parseClientCountIntent(question);
  if (!clientCountArgs) return null;

  const result = await getClients(ctx, { ...clientCountArgs, limit: 1 });
  const count = Number(result.count || 0);
  const scope = clientCountArgs.status ? `${String(clientCountArgs.status).toLowerCase()} clients` : "clients";
  const noun = count === 1
    ? (clientCountArgs.status ? `${String(clientCountArgs.status).toLowerCase()} client` : "client")
    : scope;

  return {
    reply: `We have ${count} ${noun} in the portal.`,
    toolsUsed: ["get_clients"],
  };
}

function parseClientCountIntent(question: string): Record<string, unknown> | null {
  const q = question.toLowerCase();
  const asksCount = /\b(how many|count|number of|total|total number|client count)\b/.test(q);
  if (!asksCount || !/\bclients?\b/.test(q)) return null;

  if (/\barchived|archive\b/.test(q)) return { status: "Archived" };
  if (/\bpaused|pause|on hold\b/.test(q)) return { status: "Paused" };
  if (/\bactive|current|live\b/.test(q)) return { status: "Active" };
  return {};
}

async function callOpenAI(openaiKey: string, payload: Record<string, unknown>) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `OpenAI request failed with ${res.status}.`;
    throw new Error(message);
  }
  return data;
}

async function authenticateRequest(req: Request): Promise<FirebaseUser | null> {
  if (!REQUIRE_AUTH) return null;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Unauthorized: missing bearer token.");

  const user = await verifyFirebaseToken(token);
  const allowed = (Deno.env.get("IRIS_ALLOWED_EMAILS") || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length && !allowed.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized: email not allowed.");
  }

  return user;
}

async function verifyFirebaseToken(token: string): Promise<FirebaseUser> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Unauthorized: malformed token.");

  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  const signature = base64UrlToBytes(parts[2]);
  const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unauthorized: unsupported token.");
  }

  const keys = await getFirebaseJwks();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Unauthorized: unknown token key.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signedData);
  if (!verified) throw new Error("Unauthorized: invalid token signature.");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Unauthorized: invalid audience.");
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error("Unauthorized: invalid issuer.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("Unauthorized: expired token.");
  if (typeof payload.iat !== "number" || payload.iat > now + 60) throw new Error("Unauthorized: invalid issue time.");
  if (!payload.sub) throw new Error("Unauthorized: missing subject.");

  return {
    uid: String(payload.sub),
    email: String(payload.email || ""),
    name: String(payload.name || payload.email || "Portal user"),
  };
}

async function getFirebaseJwks(): Promise<JsonWebKey[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;

  const res = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!res.ok) throw new Error("Unauthorized: could not load Firebase keys.");

  const body = await res.json() as JsonWebKeySet;
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  jwksCache = {
    keys: body.keys || [],
    expiresAt: Date.now() + Math.max(60, maxAge - 30) * 1000,
  };
  return jwksCache.keys;
}

function decodeJwtPart(part: string): any {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const IRIS_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_portal_overview",
      description: "Get high-level current totals for clients, invoices, revenue, expenses, projects, opportunities, and tasks.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invoices",
      description: "Find invoices and invoice totals by status, client, due date, issue date, overdue state, or upcoming due window.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Invoice status, or owed for unpaid/sent/partial/overdue invoices." },
          client: { type: "string", description: "Client name or client number search." },
          dueWithinDays: { type: "number", description: "Only invoices due from today through this many days ahead." },
          overdue: { type: "boolean", description: "Only invoices due before today and not paid/cancelled." },
          dateFrom: { type: "string", description: "Issue date lower bound, YYYY-MM-DD." },
          dateTo: { type: "string", description: "Issue date upper bound, YYYY-MM-DD." },
          limit: { type: "number", description: "Maximum rows to return, up to 50." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expenses",
      description: "Find expenses by status, vendor, client, service/category, date range, overdue state, or upcoming window.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          vendor: { type: "string" },
          client: { type: "string" },
          service: { type: "string" },
          upcomingDays: { type: "number" },
          overdue: { type: "boolean" },
          dateFrom: { type: "string" },
          dateTo: { type: "string" },
          excludeSubcontractors: { type: "boolean" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_projects",
      description: "Find projects and financial metrics, including calculated cost, profit, and margin.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          client: { type: "string" },
          manager: { type: "string" },
          includeArchived: { type: "boolean" },
          search: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_clients",
      description: "Find clients and client counts by name, email, phone, sector, country, or status. Use this for 'how many clients', 'client count', and client lists.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          status: { type: "string" },
          country: { type: "string" },
          sector: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_subcontractor_balances",
      description: "Calculate subcontractor agreed, paid, and remaining balances from project team allocation records.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Subcontractor or project search." },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_opportunities",
      description: "Find sales opportunities by status, client/name, value, or last contact.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          search: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Find dashboard tasks by completion status, assignee, priority, due date, or upcoming window.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "all, active, or done." },
          assignee: { type: "string" },
          priority: { type: "string" },
          dueWithinDays: { type: "number" },
          overdue: { type: "boolean" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_project_files",
      description: "Search uploaded project file metadata. Does not read file contents.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          search: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_data_catalog",
      description: "Explain what portal data Iris can and cannot access.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

async function runTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_portal_overview":
        return { ok: true, tool: name, data: await getPortalOverview(ctx) };
      case "get_invoices":
        return { ok: true, tool: name, data: await getInvoices(ctx, args) };
      case "get_expenses":
        return { ok: true, tool: name, data: await getExpenses(ctx, args) };
      case "get_projects":
        return { ok: true, tool: name, data: await getProjects(ctx, args) };
      case "get_clients":
        return { ok: true, tool: name, data: await getClients(ctx, args) };
      case "get_subcontractor_balances":
        return { ok: true, tool: name, data: await getSubcontractorBalances(ctx, args) };
      case "get_opportunities":
        return { ok: true, tool: name, data: await getOpportunities(ctx, args) };
      case "get_tasks":
        return { ok: true, tool: name, data: await getTasks(ctx, args) };
      case "search_project_files":
        return { ok: true, tool: name, data: await searchProjectFiles(ctx, args) };
      case "get_data_catalog":
        return { ok: true, tool: name, data: getDataCatalog() };
      default:
        return { ok: false, tool: name, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`[iris:${name}]`, err);
    return { ok: false, tool: name, error: err instanceof Error ? err.message : "Tool failed." };
  }
}

async function getPortalOverview(ctx: ToolContext) {
  const [invoiceRows, expenses, projects, opportunities, tasks, clients] = await Promise.all([
    fetchInvoicesWithPayments(ctx.sb, {}),
    fetchTable(ctx.sb, "expenses", "id, vendor, description, client_name, amount, expense_date, status, service", 1000),
    fetchProjectsWithComputedCosts(ctx.sb, {}),
    fetchTable(ctx.sb, "opportunities", "id, name, opportunity, status, value, last_contact", 1000),
    fetchTable(ctx.sb, "tasks", "id, text, priority, due_date, assigned_to, done, created_at", 1000),
    fetchTable(ctx.sb, "clients", "id, status, country, sector", 1000),
  ]);

  const owedInvoices = invoiceRows.filter((inv) => isOwedStatus(inv.status));
  const overdueInvoices = invoiceRows.filter((inv) => isOverdue(inv.due_date, ctx.now, ctx.timezone) && isOwedStatus(inv.status));
  const paidRevenue = invoiceRows
    .filter((inv) => normalizeStatus(inv.status) === "paid")
    .reduce((sum, inv) => sum + invoiceTotal(inv), 0);
  const unpaidTotal = owedInvoices.reduce((sum, inv) => sum + invoiceDue(inv), 0);
  const expenseRows = expenses.rows || [];
  const unpaidExpenses = expenseRows.filter((exp: any) => ["unpaid", "upcoming", "partial payment"].includes(normalizeStatus(exp.status)));
  const activeProjects = projects.rows.filter((p: any) => !p.is_archived && !p.archived_at);
  const projectRevenue = activeProjects.reduce((sum: number, p: any) => sum + safeNumber(p.revenue), 0);
  const projectCost = activeProjects.reduce((sum: number, p: any) => sum + safeNumber(p.cost), 0);
  const projectProfit = projectRevenue - projectCost;
  const clientRows = clients.rows || [];

  return {
    generated_at: ctx.now.toISOString(),
    clients: {
      total_count: clientRows.length,
      active_count: clientRows.filter((client: any) => normalizeStatus(client.status) === "active").length,
      paused_count: clientRows.filter((client: any) => normalizeStatus(client.status) === "paused").length,
      archived_count: clientRows.filter((client: any) => normalizeStatus(client.status) === "archived").length,
    },
    invoices: {
      total_count: invoiceRows.length,
      owed_count: owedInvoices.length,
      owed_total: roundMoney(unpaidTotal),
      overdue_count: overdueInvoices.length,
      overdue_total: roundMoney(overdueInvoices.reduce((sum, inv) => sum + invoiceDue(inv), 0)),
      paid_revenue_total: roundMoney(paidRevenue),
    },
    expenses: {
      total_count: expenseRows.length,
      unpaid_or_upcoming_count: unpaidExpenses.length,
      unpaid_or_upcoming_total: roundMoney(unpaidExpenses.reduce((sum: number, exp: any) => sum + safeNumber(exp.amount), 0)),
    },
    projects: {
      active_count: activeProjects.length,
      archived_count: projects.rows.length - activeProjects.length,
      revenue: roundMoney(projectRevenue),
      cost: roundMoney(projectCost),
      profit: roundMoney(projectProfit),
      margin_percent: projectRevenue > 0 ? roundPct(projectProfit / projectRevenue * 100) : null,
    },
    opportunities: summarizeByStatus(opportunities.rows || [], "value"),
    tasks: {
      total_count: (tasks.rows || []).length,
      active_count: (tasks.rows || []).filter((t: any) => !t.done).length,
      overdue_count: (tasks.rows || []).filter((t: any) => !t.done && isOverdue(t.due_date, ctx.now, ctx.timezone)).length,
    },
  };
}

async function getInvoices(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 15, 50);
  let rows = await fetchInvoicesWithPayments(ctx.sb, { maxRows: 1000 });

  if (args.status) {
    const wanted = normalizeStatus(args.status);
    rows = wanted === "owed"
      ? rows.filter((row) => isOwedStatus(row.status))
      : rows.filter((row) => normalizeStatus(row.status) === wanted);
  }
  if (args.client) rows = rows.filter((row) => searchMatch([row.client_name, row.client_no], args.client));
  if (args.dateFrom) rows = rows.filter((row) => !row.issue_date || row.issue_date >= args.dateFrom);
  if (args.dateTo) rows = rows.filter((row) => !row.issue_date || row.issue_date <= args.dateTo);
  if (args.overdue) rows = rows.filter((row) => isOwedStatus(row.status) && isOverdue(row.due_date, ctx.now, ctx.timezone));
  if (args.dueWithinDays !== undefined) {
    const days = Math.max(0, Number(args.dueWithinDays) || 0);
    rows = rows.filter((row) => isOwedStatus(row.status) && isWithinDays(row.due_date, ctx.now, days, ctx.timezone));
  }

  rows.sort((a, b) => String(a.due_date || a.issue_date || "").localeCompare(String(b.due_date || b.issue_date || "")));

  return {
    count: rows.length,
    totals: {
      invoice_total: roundMoney(rows.reduce((sum, row) => sum + invoiceTotal(row), 0)),
      paid_total: roundMoney(rows.reduce((sum, row) => sum + safeNumber(row.paid_amount), 0)),
      due_total: roundMoney(rows.reduce((sum, row) => sum + invoiceDue(row), 0)),
    },
    rows: rows.slice(0, limit).map((row) => ({
      id: row.id,
      invoice_no: row.invoice_no,
      client: row.client_name || row.client_no || "Unknown",
      issue_date: row.issue_date,
      due_date: row.due_date,
      status: row.status,
      coverage_period: row.coverage_period,
      currency: row.currency || "USD",
      total: roundMoney(invoiceTotal(row)),
      paid: roundMoney(safeNumber(row.paid_amount)),
      due: roundMoney(invoiceDue(row)),
      note: truncate(row.note, 220),
    })),
  };
}

async function getExpenses(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 15, 50);
  const { rows } = await fetchTable(
    ctx.sb,
    "expenses",
    "id, vendor, description, client_name, amount, expense_date, status, service, frequency, note, project_id",
    1000,
  );
  let data = rows || [];

  if (args.status) data = data.filter((row: any) => normalizeStatus(row.status) === normalizeStatus(args.status));
  if (args.vendor) data = data.filter((row: any) => searchMatch([row.vendor, row.description], args.vendor));
  if (args.client) data = data.filter((row: any) => searchMatch([row.client_name], args.client));
  if (args.service) data = data.filter((row: any) => normalizeStatus(row.service) === normalizeStatus(args.service));
  if (args.excludeSubcontractors) data = data.filter((row: any) => normalizeStatus(row.service) !== "subcontractor");
  if (args.dateFrom) data = data.filter((row: any) => !row.expense_date || row.expense_date >= args.dateFrom);
  if (args.dateTo) data = data.filter((row: any) => !row.expense_date || row.expense_date <= args.dateTo);
  if (args.overdue) data = data.filter((row: any) => normalizeStatus(row.status) !== "paid" && isOverdue(row.expense_date, ctx.now, ctx.timezone));
  if (args.upcomingDays !== undefined) {
    const days = Math.max(0, Number(args.upcomingDays) || 0);
    data = data.filter((row: any) => normalizeStatus(row.status) !== "paid" && isWithinDays(row.expense_date, ctx.now, days, ctx.timezone));
  }

  data.sort((a: any, b: any) => String(a.expense_date || "").localeCompare(String(b.expense_date || "")));

  return {
    count: data.length,
    total_amount: roundMoney(data.reduce((sum: number, row: any) => sum + safeNumber(row.amount), 0)),
    rows: data.slice(0, limit).map((row: any) => ({
      id: row.id,
      vendor: row.vendor,
      description: row.description,
      client: row.client_name,
      amount: roundMoney(row.amount),
      date: row.expense_date,
      status: row.status,
      service: row.service,
      frequency: row.frequency,
      note: truncate(row.note, 220),
    })),
  };
}

async function getProjects(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 15, 50);
  const result = await fetchProjectsWithComputedCosts(ctx.sb, args);
  let rows = result.rows;

  if (!args.includeArchived) rows = rows.filter((row: any) => !row.is_archived && !row.archived_at);
  if (args.status) rows = rows.filter((row: any) => normalizeStatus(row.status) === normalizeStatus(args.status));
  if (args.client) rows = rows.filter((row: any) => searchMatch([row.client_name], args.client));
  if (args.manager) rows = rows.filter((row: any) => searchMatch([row.project_manager], args.manager));
  if (args.search) rows = rows.filter((row: any) => searchMatch([row.project_code, row.project_name, row.client_name, row.description], args.search));

  rows.sort((a: any, b: any) => safeNumber(b.profit) - safeNumber(a.profit));

  return {
    count: rows.length,
    totals: {
      revenue: roundMoney(rows.reduce((sum: number, row: any) => sum + safeNumber(row.revenue), 0)),
      cost: roundMoney(rows.reduce((sum: number, row: any) => sum + safeNumber(row.cost), 0)),
      profit: roundMoney(rows.reduce((sum: number, row: any) => sum + safeNumber(row.profit), 0)),
    },
    rows: rows.slice(0, limit),
  };
}

async function getClients(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 20, 50);
  const { rows } = await fetchTable(
    ctx.sb,
    "clients",
    "id, client_no, name, contact_name, email, phone, address, notes, joined, status, sector, country, created_at, updated_at",
    1000,
  );
  let data = rows || [];

  if (args.status) data = data.filter((row: any) => normalizeStatus(row.status) === normalizeStatus(args.status));
  if (args.country) data = data.filter((row: any) => searchMatch([row.country], args.country));
  if (args.sector) data = data.filter((row: any) => searchMatch([row.sector], args.sector));
  if (args.search) {
    data = data.filter((row: any) => searchMatch([
      row.client_no,
      row.name,
      row.contact_name,
      row.email,
      row.phone,
      row.address,
      row.notes,
      row.sector,
      row.country,
    ], args.search));
  }

  data.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

  return {
    count: data.length,
    rows: data.slice(0, limit).map((row: any) => ({
      id: row.id,
      client_no: row.client_no,
      name: row.name,
      contact: row.contact_name,
      email: row.email,
      phone: row.phone,
      country: row.country,
      sector: row.sector,
      status: row.status,
      joined: row.joined,
      notes: truncate(row.notes, 220),
    })),
  };
}

async function getSubcontractorBalances(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 20, 50);
  const [subsRes, projectsRes] = await Promise.all([
    fetchTable(ctx.sb, "subcontractors", "id, subcontractor_code, name, email, phone, country, status, notes", 1000),
    fetchTable(ctx.sb, "projects", "id, project_code, project_name, client_name, contract_value, start_date, end_date, team_allocation", 1000),
  ]);

  let rows = (subsRes.rows || []).map((sub: any) => {
    const assignments: any[] = [];
    const subId = String(sub.id || "");
    const subName = String(sub.name || "").trim().toLowerCase();

    for (const project of projectsRes.rows || []) {
      for (const member of asArray(project.team_allocation)) {
        const memberId = String(member.subcontractor_id || "");
        const memberName = String(member.member_name || member.name || "").trim().toLowerCase();
        const matches = (subId && memberId && subId === memberId) || (subName && memberName && subName === memberName);
        if (!matches) continue;

        const agreed = safeNumber(member.agreed_amount ?? member.agreed ?? member.amount);
        const paid = asArray(member.payments).reduce((sum, payment: any) => sum + safeNumber(payment.amount), 0);
        assignments.push({
          project_id: project.id,
          project_code: project.project_code,
          project_name: project.project_name,
          client: project.client_name,
          contract_value: roundMoney(project.contract_value),
          start_date: project.start_date,
          end_date: project.end_date,
          agreed: roundMoney(agreed),
          paid: roundMoney(paid),
          remaining: roundMoney(agreed - paid),
        });
      }
    }

    const agreed = assignments.reduce((sum, item) => sum + safeNumber(item.agreed), 0);
    const paid = assignments.reduce((sum, item) => sum + safeNumber(item.paid), 0);

    return {
      id: sub.id,
      code: sub.subcontractor_code,
      name: sub.name,
      email: sub.email,
      phone: sub.phone,
      country: sub.country,
      status: sub.status,
      agreed: roundMoney(agreed),
      paid: roundMoney(paid),
      remaining: roundMoney(agreed - paid),
      assignments,
    };
  });

  if (args.search) {
    rows = rows.filter((row: any) => searchMatch([
      row.code,
      row.name,
      row.email,
      row.phone,
      row.country,
      row.status,
      ...row.assignments.flatMap((item: any) => [item.project_code, item.project_name, item.client]),
    ], args.search));
  }

  rows.sort((a: any, b: any) => safeNumber(b.remaining) - safeNumber(a.remaining));

  return {
    count: rows.length,
    totals: {
      agreed: roundMoney(rows.reduce((sum: number, row: any) => sum + safeNumber(row.agreed), 0)),
      paid: roundMoney(rows.reduce((sum: number, row: any) => sum + safeNumber(row.paid), 0)),
      remaining: roundMoney(rows.reduce((sum: number, row: any) => sum + safeNumber(row.remaining), 0)),
    },
    rows: rows.slice(0, limit),
  };
}

async function getOpportunities(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 20, 50);
  const { rows } = await fetchTable(ctx.sb, "opportunities", "id, opp_no, name, opportunity, status, value, last_contact, notes", 1000);
  let data = rows || [];

  if (args.status) data = data.filter((row: any) => normalizeStatus(row.status) === normalizeStatus(args.status));
  if (args.search) data = data.filter((row: any) => searchMatch([row.opp_no, row.name, row.opportunity, row.notes], args.search));

  data.sort((a: any, b: any) => safeNumber(b.value) - safeNumber(a.value));

  return {
    count: data.length,
    total_value: roundMoney(data.reduce((sum: number, row: any) => sum + safeNumber(row.value), 0)),
    by_status: summarizeByStatus(data, "value"),
    rows: data.slice(0, limit).map((row: any) => ({
      id: row.id,
      opp_no: row.opp_no,
      client: row.name,
      opportunity: row.opportunity,
      status: row.status,
      value: roundMoney(row.value),
      last_contact: row.last_contact,
      notes: truncate(row.notes, 220),
    })),
  };
}

async function getTasks(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 20, 50);
  const { rows } = await fetchTable(ctx.sb, "tasks", "id, text, priority, due_date, assigned_to, done, created_at", 1000);
  let data = rows || [];

  if (args.status === "active") data = data.filter((row: any) => !row.done);
  if (args.status === "done") data = data.filter((row: any) => !!row.done);
  if (args.assignee) data = data.filter((row: any) => searchMatch([row.assigned_to], args.assignee));
  if (args.priority) data = data.filter((row: any) => normalizeStatus(row.priority) === normalizeStatus(args.priority));
  if (args.overdue) data = data.filter((row: any) => !row.done && isOverdue(row.due_date, ctx.now, ctx.timezone));
  if (args.dueWithinDays !== undefined) {
    const days = Math.max(0, Number(args.dueWithinDays) || 0);
    data = data.filter((row: any) => !row.done && isWithinDays(row.due_date, ctx.now, days, ctx.timezone));
  }

  data.sort((a: any, b: any) => String(a.due_date || "9999-99-99").localeCompare(String(b.due_date || "9999-99-99")));

  return {
    count: data.length,
    rows: data.slice(0, limit).map((row: any) => ({
      id: row.id,
      text: row.text,
      priority: row.priority,
      due_date: row.due_date,
      assigned_to: row.assigned_to,
      done: !!row.done,
      created_at: row.created_at,
    })),
  };
}

async function searchProjectFiles(ctx: ToolContext, args: any) {
  const limit = clampLimit(args.limit, 20, 50);
  const { rows } = await fetchTable(
    ctx.sb,
    "project_files",
    "id, project_id, storage_key, file_id, file_name, file_size, content_type, uploaded_by, uploaded_at, created_at",
    1000,
  );
  let data = rows || [];

  if (args.projectId) data = data.filter((row: any) => String(row.project_id) === String(args.projectId));
  if (args.search) data = data.filter((row: any) => searchMatch([row.file_name, row.content_type, row.uploaded_by, row.storage_key], args.search));

  data.sort((a: any, b: any) => String(b.uploaded_at || b.created_at || "").localeCompare(String(a.uploaded_at || a.created_at || "")));

  return {
    count: data.length,
    note: "Iris can see file metadata only, not the contents of uploaded files.",
    rows: data.slice(0, limit).map((row: any) => ({
      id: row.id,
      project_id: row.project_id,
      file_name: row.file_name,
      file_size: row.file_size,
      content_type: row.content_type,
      uploaded_by: row.uploaded_by,
      uploaded_at: row.uploaded_at || row.created_at,
    })),
  };
}

function getDataCatalog() {
  return {
    can_answer_from_database: [
      "Invoices, due dates, statuses, notes, totals, and payment history",
      "Expenses, vendors, services, dates, statuses, notes, and project links",
      "Projects, status, clients, managers, contract values, costs, profit, margins, activity, and team allocation",
      "Clients and contact metadata",
      "Subcontractors and balances derived from project team allocation",
      "Opportunities and pipeline value",
      "Dashboard tasks",
      "Project file metadata",
    ],
    cannot_currently_access: [
      "Uploaded file contents",
      "External web/current news",
      "Browser-only UI state not saved to Supabase",
      "Any action that changes portal data",
    ],
  };
}

async function fetchTable(sb: ReturnType<typeof createClient>, table: string, select: string, limit: number) {
  const { data, error } = await sb.from(table).select(select).limit(limit);
  if (error) throw new Error(`${table}: ${error.message}`);
  return { rows: data || [] };
}

async function fetchInvoicesWithPayments(sb: ReturnType<typeof createClient>, options: { maxRows?: number }) {
  const maxRows = options.maxRows || 1000;
  const { data, error } = await sb
    .from("invoices")
    .select(`
      id, invoice_no, client_id, issue_date, due_date, currency,
      subtotal, tax, total, status, coverage_period, docx_url, pdf_url, note,
      clients!invoices_client_id_fkey ( name, client_no )
    `)
    .limit(maxRows);

  if (error) throw new Error(`invoices: ${error.message}`);

  const rows = (data || []).map((row: any) => {
    const client = relationObject(row.clients);
    return {
      ...row,
      client_name: client?.name || "",
      client_no: client?.client_no || "",
      paid_amount: 0,
    };
  });

  const ids = rows.map((row: any) => String(row.id)).filter(Boolean);
  if (!ids.length) return rows;

  const payments = await fetchPaymentsMap(sb, ids);
  return rows.map((row: any) => ({ ...row, paid_amount: payments.get(String(row.id)) || 0 }));
}

async function fetchPaymentsMap(sb: ReturnType<typeof createClient>, invoiceIds: string[]) {
  const map = new Map<string, number>();
  const { data, error } = await sb
    .from("invoice_payments")
    .select("invoice_id, amount")
    .in("invoice_id", invoiceIds);

  if (error) {
    console.warn("[iris] invoice_payments unavailable:", error.message);
    return map;
  }

  for (const payment of data || []) {
    const key = String(payment.invoice_id || "");
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + safeNumber(payment.amount));
  }
  return map;
}

async function fetchProjectsWithComputedCosts(sb: ReturnType<typeof createClient>, _args: any) {
  const [projectRes, expenseRes] = await Promise.all([
    fetchTable(
      sb,
      "projects",
      `
        id, project_code, project_name, client_name, description, status,
        contract_value, total_revenue, total_cost, total_profit,
        subcontractor_cost, expense_cost, start_date, end_date,
        project_manager, team_allocation, activity, archived_at, is_archived,
        created_at, updated_at
      `,
      1000,
    ),
    fetchTable(sb, "expenses", "project_id, amount, service", 1000),
  ]);

  const expenseByProject = new Map<string, number>();
  for (const row of expenseRes.rows || []) {
    const projectId = String((row as any).project_id || "");
    if (!projectId) continue;
    if (normalizeStatus((row as any).service) === "subcontractor") continue;
    expenseByProject.set(projectId, (expenseByProject.get(projectId) || 0) + safeNumber((row as any).amount));
  }

  return {
    rows: (projectRes.rows || []).map((row: any) => {
      const revenue = safeNumber(row.total_revenue || row.contract_value);
      const subcontractorCost = safeNumber(row.subcontractor_cost);
      const expenseCost = expenseByProject.get(String(row.id)) ?? safeNumber(row.expense_cost);
      const cost = subcontractorCost + expenseCost;
      const profit = revenue - cost;
      return {
        id: row.id,
        project_code: row.project_code,
        project_name: row.project_name,
        client_name: row.client_name,
        description: truncate(row.description, 240),
        status: row.status,
        project_manager: row.project_manager,
        start_date: row.start_date,
        end_date: row.end_date,
        contract_value: roundMoney(row.contract_value),
        revenue: roundMoney(revenue),
        cost: roundMoney(cost),
        subcontractor_cost: roundMoney(subcontractorCost),
        expense_cost: roundMoney(expenseCost),
        profit: roundMoney(profit),
        margin_percent: revenue > 0 ? roundPct(profit / revenue * 100) : null,
        team_count: asArray(row.team_allocation).length,
        activity_count: asArray(row.activity).length,
        archived_at: row.archived_at,
        is_archived: !!row.is_archived,
        updated_at: row.updated_at,
      };
    }),
  };
}

function summarizeByStatus(rows: any[], amountKey?: string) {
  const buckets = new Map<string, { count: number; total: number }>();
  for (const row of rows) {
    const key = row.status || "Unknown";
    const current = buckets.get(key) || { count: 0, total: 0 };
    current.count += 1;
    current.total += amountKey ? safeNumber(row[amountKey]) : 0;
    buckets.set(key, current);
  }
  return Object.fromEntries([...buckets.entries()].map(([key, value]) => [
    key,
    { count: value.count, total: roundMoney(value.total) },
  ]));
}

function relationObject(value: unknown): any {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

function compactJson(value: unknown, maxChars: number) {
  const text = JSON.stringify(value);
  return text.length > maxChars
    ? JSON.stringify({ ok: true, truncated: true, data: text.slice(0, maxChars) })
    : text;
}

function cleanReply(input: unknown) {
  const text = String(input || "").trim();
  return text || "I could not produce an answer.";
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isOwedStatus(status: unknown) {
  return ["not paid", "sent", "partial payment", "unpaid", "overdue"].includes(normalizeStatus(status));
}

function invoiceTotal(row: any) {
  return safeNumber(row.total ?? row.subtotal);
}

function invoiceDue(row: any) {
  if (!isOwedStatus(row.status)) return 0;
  return Math.max(0, invoiceTotal(row) - safeNumber(row.paid_amount));
}

function isOverdue(dateValue: unknown, now: Date, timezone = "UTC") {
  const date = isoDateText(dateValue);
  if (!date) return false;
  return date < isoDateInTimeZone(now, timezone);
}

function isWithinDays(dateValue: unknown, now: Date, days: number, timezone = "UTC") {
  const date = isoDateText(dateValue);
  if (!date) return false;
  const today = isoDateInTimeZone(now, timezone);
  const end = addDaysIso(today, days);
  return date >= today && date <= end;
}

function isoDateText(value: unknown) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function isoDateInTimeZone(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function searchMatch(values: unknown[], query: unknown) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value || "").toLowerCase().includes(needle));
}

function safeNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: unknown) {
  return Math.round(safeNumber(value) * 100) / 100;
}

function roundPct(value: unknown) {
  return Math.round(safeNumber(value) * 10) / 10;
}

function clampLimit(value: unknown, fallback: number, max: number) {
  const n = Number(value || fallback);
  return Math.max(1, Math.min(max, Number.isFinite(n) ? Math.round(n) : fallback));
}

function truncate(value: unknown, max: number) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
