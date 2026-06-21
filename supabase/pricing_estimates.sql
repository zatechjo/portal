create extension if not exists pgcrypto;

create table if not exists public.pricing_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null,
  publisher text,
  url text not null,
  checked_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null,
  category text not null default 'software',
  website_url text,
  default_currency text not null default 'USD',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_vendor_plans (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.pricing_vendors(id) on delete cascade,
  slug text not null check (length(btrim(slug)) > 0),
  plan_name text not null,
  price_amount numeric(12, 4) check (price_amount is null or price_amount >= 0),
  currency text not null default 'USD',
  billing_interval text not null default 'month'
    check (billing_interval in ('one_time', 'month', 'year', 'usage', 'custom')),
  commitment text not null default 'none',
  unit_type text not null default 'flat',
  unit_label text not null default 'unit',
  included_quantity numeric(12, 4),
  usage_metric text,
  source_url text,
  source_checked_at date not null default current_date,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low', 'needs_verification')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, slug)
);

create table if not exists public.pricing_service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_service_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.pricing_service_categories(id) on delete set null,
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null,
  description text,
  pricing_model text not null default 'fixed'
    check (pricing_model in ('fixed', 'range', 'hourly', 'per_unit', 'monthly', 'pass_through', 'custom')),
  min_price numeric(12, 2) check (min_price is null or min_price >= 0),
  base_price numeric(12, 2) check (base_price is null or base_price >= 0),
  max_price numeric(12, 2) check (max_price is null or max_price >= 0),
  internal_cost_basis numeric(12, 2) check (internal_cost_basis is null or internal_cost_basis >= 0),
  default_quantity numeric(12, 2) not null default 1 check (default_quantity >= 0),
  unit_label text not null default 'item',
  billing_interval text not null default 'one_time'
    check (billing_interval in ('one_time', 'month', 'year', 'usage', 'custom')),
  complexity_weight numeric(8, 4) not null default 1 check (complexity_weight > 0),
  ai_prompt_hint text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_service_components (
  id uuid primary key default gen_random_uuid(),
  parent_service_item_id uuid not null references public.pricing_service_items(id) on delete cascade,
  component_kind text not null check (component_kind in ('vendor_plan', 'service_item', 'manual_cost', 'labor', 'risk')),
  vendor_plan_id uuid references public.pricing_vendor_plans(id) on delete set null,
  service_item_id uuid references public.pricing_service_items(id) on delete set null,
  label text not null,
  quantity_default numeric(12, 4) not null default 1 check (quantity_default >= 0),
  quantity_unit text not null default 'unit',
  unit_cost_override numeric(12, 4) check (unit_cost_override is null or unit_cost_override >= 0),
  markup_pct numeric(8, 4) not null default 0,
  pass_through boolean not null default true,
  required_by_default boolean not null default false,
  condition jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_calculation_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null,
  currency text not null default 'USD',
  target_gross_margin_pct numeric(8, 4) not null default 45,
  default_vendor_markup_pct numeric(8, 4) not null default 15,
  contingency_pct numeric(8, 4) not null default 10,
  rush_markup_pct numeric(8, 4) not null default 20,
  tax_pct numeric(8, 4) not null default 0,
  minimum_project_fee numeric(12, 2) not null default 500,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  section text not null default 'general',
  question_text text not null,
  input_type text not null check (input_type in ('single_choice', 'multi_choice', 'number', 'text', 'boolean')),
  answer_key text not null,
  required boolean not null default true,
  help_text text,
  default_value jsonb,
  display_rule jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.pricing_questions(id) on delete cascade,
  label text not null,
  value text not null,
  price_delta numeric(12, 2) not null default 0,
  multiplier_delta numeric(8, 4) not null default 0,
  vendor_plan_id uuid references public.pricing_vendor_plans(id) on delete set null,
  service_item_id uuid references public.pricing_service_items(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (question_id, value)
);

create table if not exists public.pricing_formula_rules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(btrim(slug)) > 0),
  name text not null,
  rule_type text not null check (rule_type in ('modifier', 'line_generator', 'validation', 'recommendation')),
  applies_to text not null default 'estimate',
  rule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_estimates (
  id uuid primary key default gen_random_uuid(),
  estimate_no text unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'archived')),
  client_id text,
  client_name text,
  client_email text,
  project_name text,
  summary text,
  currency text not null default 'USD',
  profile_id uuid references public.pricing_calculation_profiles(id) on delete set null,
  subtotal_one_time numeric(12, 2) not null default 0,
  subtotal_recurring_monthly numeric(12, 2) not null default 0,
  vendor_cost_one_time numeric(12, 2) not null default 0,
  vendor_cost_monthly numeric(12, 2) not null default 0,
  internal_cost_one_time numeric(12, 2) not null default 0,
  internal_cost_monthly numeric(12, 2) not null default 0,
  margin_amount numeric(12, 2) not null default 0,
  contingency_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_one_time numeric(12, 2) not null default 0,
  total_recurring_monthly numeric(12, 2) not null default 0,
  source text not null default 'pricing_tool',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_estimate_answers (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.pricing_estimates(id) on delete cascade,
  question_id uuid references public.pricing_questions(id) on delete set null,
  question_slug text not null,
  answer_value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  unique (estimate_id, question_slug)
);

create table if not exists public.pricing_estimate_lines (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.pricing_estimates(id) on delete cascade,
  line_type text not null check (line_type in ('service', 'vendor', 'labor', 'discount', 'tax', 'contingency', 'manual')),
  service_item_id uuid references public.pricing_service_items(id) on delete set null,
  vendor_plan_id uuid references public.pricing_vendor_plans(id) on delete set null,
  description text not null,
  quantity numeric(12, 4) not null default 1 check (quantity >= 0),
  unit_label text not null default 'unit',
  billing_interval text not null default 'one_time'
    check (billing_interval in ('one_time', 'month', 'year', 'usage', 'custom')),
  unit_cost numeric(12, 4) not null default 0,
  unit_price numeric(12, 4) not null default 0,
  markup_pct numeric(8, 4) not null default 0,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  line_cost numeric(12, 2) generated always as (round((quantity * unit_cost)::numeric, 2)) stored,
  line_total numeric(12, 2) generated always as (round((quantity * unit_price)::numeric, 2)) stored
);

create table if not exists public.pricing_estimate_snapshots (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.pricing_estimates(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists pricing_vendor_plans_vendor_id_idx
  on public.pricing_vendor_plans(vendor_id);

create index if not exists pricing_service_items_category_id_idx
  on public.pricing_service_items(category_id);

create index if not exists pricing_service_components_parent_idx
  on public.pricing_service_components(parent_service_item_id);

create index if not exists pricing_question_options_question_idx
  on public.pricing_question_options(question_id);

create index if not exists pricing_estimates_status_idx
  on public.pricing_estimates(status);

create index if not exists pricing_estimates_client_id_idx
  on public.pricing_estimates(client_id);

create index if not exists pricing_estimate_lines_estimate_idx
  on public.pricing_estimate_lines(estimate_id);

create or replace view public.pricing_vendor_plan_monthly_costs as
select
  p.id,
  v.slug as vendor_slug,
  v.name as vendor_name,
  p.slug as plan_slug,
  p.plan_name,
  p.price_amount,
  p.currency,
  p.billing_interval,
  p.commitment,
  p.unit_type,
  p.unit_label,
  case
    when p.price_amount is null then null
    when p.billing_interval = 'month' then p.price_amount
    when p.billing_interval = 'year' then round((p.price_amount / 12)::numeric, 4)
    else null
  end as monthly_equivalent,
  p.included_quantity,
  p.usage_metric,
  p.confidence,
  p.source_url,
  p.source_checked_at,
  p.notes,
  p.metadata,
  p.active
from public.pricing_vendor_plans p
join public.pricing_vendors v on v.id = p.vendor_id;

create or replace view public.pricing_service_catalog as
select
  i.id,
  c.slug as category_slug,
  c.name as category_name,
  i.slug,
  i.name,
  i.description,
  i.pricing_model,
  i.min_price,
  i.base_price,
  i.max_price,
  i.internal_cost_basis,
  i.default_quantity,
  i.unit_label,
  i.billing_interval,
  i.complexity_weight,
  i.ai_prompt_hint,
  i.sort_order,
  i.active
from public.pricing_service_items i
left join public.pricing_service_categories c on c.id = i.category_id;

insert into public.pricing_sources (slug, name, publisher, url, checked_at, notes)
values
  ('wix-premium-plans', 'Wix Premium Plans', 'Wix', 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'US annual plan article lists Light, Core, Business, and Business Elite monthly equivalents.'),
  ('google-workspace-business', 'Google Workspace Business Editions', 'Google', 'https://support.google.com/a/answer/13062337', '2026-05-14', 'Official Google Admin Help page lists flexible and annual/fixed-term USD prices.'),
  ('vercel-pricing', 'Vercel Pricing', 'Vercel', 'https://vercel.com/pricing', '2026-05-14', 'Official plan and usage pricing.'),
  ('supabase-pricing', 'Supabase Pricing', 'Supabase', 'https://supabase.com/pricing', '2026-05-14', 'Official plan, compute, and add-on pricing.'),
  ('zoom-workplace', 'Zoom Workplace Plans', 'Zoom', 'https://www.zoom.com/en/products/collaboration-tools/', '2026-05-14', 'Official page confirms Workplace Basic, Pro, and Business plan structure. Numeric checkout prices are region-sensitive and should be rechecked before quoting.'),
  ('zoho-mail-workplace', 'Zoho Mail and Workplace Pricing', 'Zoho', 'https://www.zoho.com/mail/zohomail-pricing.html', '2026-05-14', 'Official page and plan comparison PDF list Mail Lite, Workplace Standard, and Workplace Professional.'),
  ('zoho-crm-pricing', 'Zoho CRM Edition Comparison', 'Zoho', 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'Official PDF lists Free, Standard, Professional, Enterprise, and Ultimate annual/monthly USD prices.'),
  ('zoho-books-pricing', 'Zoho Books Pricing', 'Zoho', 'https://www.zoho.com/books/pricing/', '2026-05-14', 'Official global pricing page lists monthly and annual org prices plus add-ons.'),
  ('openai-api-pricing', 'OpenAI API Pricing', 'OpenAI', 'https://openai.com/api/pricing/', '2026-05-14', 'Official API pricing for GPT-5.5, GPT-5.4, GPT-5.4 mini, realtime, image, web search, and containers.'),
  ('stripe-us-pricing', 'Stripe US Pricing', 'Stripe', 'https://stripe.com/us/pricing', '2026-05-14', 'Official US card processing pricing.'),
  ('paypal-us-business-pricing', 'PayPal US Business Pricing', 'PayPal', 'https://www.paypal.com/us/business/pricing', '2026-05-14', 'Official US business transaction fees.'),
  ('calendly-pricing', 'Calendly Pricing', 'Calendly', 'https://calendly.com/pricing/', '2026-05-14', 'Official pricing page lists Free, Standard, Teams, and Enterprise.'),
  ('notion-pricing', 'Notion Pricing', 'Notion', 'https://www.notion.com/pricing', '2026-05-14', 'Official pricing page lists Free, Plus, Business, and Enterprise.'),
  ('microsoft-365-business', 'Microsoft 365 Business Plans', 'Microsoft', 'https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing', '2026-05-14', 'Official business plan pricing page.'),
  ('slack-pricing', 'Slack Pricing', 'Slack', 'https://slack.com/pricing', '2026-05-14', 'Official pricing page. Numeric prices can vary by region and billing mode.'),
  ('namecheap-domains', 'Namecheap Domain Pricing', 'Namecheap', 'https://www.namecheap.com/domains/', '2026-05-14', 'Official domain price search result for common .com pricing. Domain prices change often.'),
  ('sendgrid-pricing', 'Twilio SendGrid Pricing', 'Twilio SendGrid', 'https://www.twilio.com/content/dam/sendgrid/global/en/other/sendgrid-pricing/twi121--sendgrid-pricing-pdf-st1.pdf', '2026-05-14', 'Official SendGrid pricing PDF for Essentials, Pro, and Premier.'),
  ('cloudflare-plans', 'Cloudflare Plans', 'Cloudflare', 'https://www.cloudflare.com/plans/', '2026-05-14', 'Official product plan pricing page.'),
  ('portal-expenses-observed', 'Portal Expenses Observed Vendor Costs', 'ZAtech Portal', 'supabase://public.expenses', '2026-05-14', 'Read-only snapshot of existing expenses table used to seed historical vendor cost baselines. These are observed costs, not vendor list prices.')
on conflict (slug) do update set
  name = excluded.name,
  publisher = excluded.publisher,
  url = excluded.url,
  checked_at = excluded.checked_at,
  notes = excluded.notes,
  updated_at = now();

insert into public.pricing_vendors (slug, name, category, website_url, notes)
values
  ('wix', 'Wix', 'website_builder', 'https://www.wix.com', 'Hosted website builder and Wix/Velo project platform.'),
  ('google-workspace', 'Google Workspace', 'productivity', 'https://workspace.google.com', 'Business email, Drive, Meet, Docs, and admin suite.'),
  ('microsoft-365', 'Microsoft 365', 'productivity', 'https://www.microsoft.com/microsoft-365/business', 'Business email, Office apps, OneDrive, SharePoint, and Teams.'),
  ('vercel', 'Vercel', 'hosting', 'https://vercel.com', 'Frontend/app hosting, serverless functions, analytics, blob, and deployment platform.'),
  ('supabase', 'Supabase', 'database', 'https://supabase.com', 'Postgres, auth, storage, edge functions, realtime, and vector database.'),
  ('zoom', 'Zoom Workplace', 'video', 'https://www.zoom.com', 'Meetings, chat, scheduler, docs, and workplace collaboration.'),
  ('zoho-mail', 'Zoho Mail and Workplace', 'productivity', 'https://www.zoho.com/mail/', 'Email-only and workplace suite plans.'),
  ('zoho-crm', 'Zoho CRM', 'crm', 'https://www.zoho.com/crm/', 'CRM implementation, sales pipelines, automation, and portals.'),
  ('zoho-books', 'Zoho Books', 'accounting', 'https://www.zoho.com/books/', 'Accounting, invoicing, inventory, and reporting.'),
  ('openai', 'OpenAI API', 'ai', 'https://openai.com/api/', 'Iris-style assistants, text, image, realtime, search, and tool execution.'),
  ('stripe', 'Stripe', 'payments', 'https://stripe.com', 'Online payments and card processing.'),
  ('paypal', 'PayPal', 'payments', 'https://www.paypal.com/business', 'PayPal, Venmo, card, POS, and invoicing payments.'),
  ('calendly', 'Calendly', 'scheduling', 'https://calendly.com', 'Scheduling, routing, reminders, and booking workflows.'),
  ('notion', 'Notion', 'collaboration', 'https://www.notion.com', 'Docs, wikis, projects, databases, and AI workspace.'),
  ('slack', 'Slack', 'collaboration', 'https://slack.com', 'Team chat, app integrations, and workflow automation.'),
  ('adobe', 'Adobe', 'creative_tools', 'https://www.adobe.com', 'Creative software subscriptions observed in existing expenses.'),
  ('anthropic', 'Anthropic Claude', 'ai', 'https://www.anthropic.com', 'Claude subscription/API vendor observed in existing expenses.'),
  ('namecheap', 'Namecheap', 'domains', 'https://www.namecheap.com', 'Domain registration, DNS, SSL, and hosting add-ons.'),
  ('godaddy', 'GoDaddy', 'domains', 'https://www.godaddy.com', 'Domain registrar observed in existing expenses.'),
  ('hostgator', 'HostGator', 'hosting_email', 'https://www.hostgator.com', 'Hosting and email vendor observed in existing expenses.'),
  ('foxrig', 'Foxrig', 'domains', null, 'Domain vendor observed in existing expenses. Verify manually before quoting.'),
  ('sendgrid', 'Twilio SendGrid', 'email_delivery', 'https://sendgrid.com', 'Transactional and marketing email delivery.'),
  ('cloudflare', 'Cloudflare', 'security_cdn', 'https://www.cloudflare.com', 'DNS, CDN, WAF, registrar, and edge security.'),
  ('manual', 'Manual / Client-owned Vendor', 'manual', null, 'Placeholder for paid apps, plugins, stock assets, SMS, WhatsApp, maps, or any client-owned subscription.')
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  website_url = excluded.website_url,
  notes = excluded.notes,
  updated_at = now();

insert into public.pricing_vendor_plans (
  vendor_id, slug, plan_name, price_amount, currency, billing_interval, commitment,
  unit_type, unit_label, included_quantity, usage_metric, source_url, source_checked_at,
  confidence, notes, metadata
)
select
  v.id, p.slug, p.plan_name, p.price_amount, p.currency, p.billing_interval, p.commitment,
  p.unit_type, p.unit_label, p.included_quantity, p.usage_metric, p.source_url, p.source_checked_at::date,
  p.confidence, p.notes, p.metadata
from (
  values
    ('wix', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'site', 'site / month', 1, null, 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'high', 'Free Wix site with Wix branding and limited features.', '{"hosting_included":true}'::jsonb),
    ('wix', 'light-annual', 'Light', 17.00, 'USD', 'month', 'annual', 'site', 'site / month', 1, null, 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'high', 'Annual monthly equivalent listed by Wix.', '{"storage_gb":2,"payments":false}'::jsonb),
    ('wix', 'core-annual', 'Core', 29.00, 'USD', 'month', 'annual', 'site', 'site / month', 1, null, 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'high', 'Annual monthly equivalent. Use Core or above when online payments are needed.', '{"storage_gb":50,"payments":true}'::jsonb),
    ('wix', 'business-annual', 'Business', 39.00, 'USD', 'month', 'annual', 'site', 'site / month', 1, null, 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'high', 'Annual monthly equivalent for growing ecommerce.', '{"storage_gb":100,"payments":true}'::jsonb),
    ('wix', 'business-elite-annual', 'Business Elite', 159.00, 'USD', 'month', 'annual', 'site', 'site / month', 1, null, 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'high', 'Annual monthly equivalent for advanced scale.', '{"storage_gb":null,"storage_label":"Unlimited","payments":true}'::jsonb),
    ('wix', 'enterprise-custom', 'Enterprise', null, 'USD', 'custom', 'custom', 'site', 'custom', null, null, 'https://www.wix.com/blog/wix-premium-plans', '2026-05-14', 'medium', 'Custom enterprise quote.', '{}'::jsonb),

    ('google-workspace', 'business-starter-flex', 'Business Starter Flexible', 8.40, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://support.google.com/a/answer/13062337', '2026-05-14', 'high', 'Flexible plan price per user per month.', '{"storage_per_user":"30 GB pooled"}'::jsonb),
    ('google-workspace', 'business-starter-annual', 'Business Starter Annual', 7.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://support.google.com/a/answer/13062337', '2026-05-14', 'high', 'Annual/fixed-term price per user per month.', '{"storage_per_user":"30 GB pooled"}'::jsonb),
    ('google-workspace', 'business-standard-flex', 'Business Standard Flexible', 16.80, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://support.google.com/a/answer/13062337', '2026-05-14', 'high', 'Flexible plan price per user per month.', '{"storage_per_user":"2 TB pooled","meet_participants":150}'::jsonb),
    ('google-workspace', 'business-standard-annual', 'Business Standard Annual', 14.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://support.google.com/a/answer/13062337', '2026-05-14', 'high', 'Annual/fixed-term price per user per month.', '{"storage_per_user":"2 TB pooled","meet_participants":150}'::jsonb),
    ('google-workspace', 'business-plus-flex', 'Business Plus Flexible', 26.40, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://support.google.com/a/answer/13062337', '2026-05-14', 'high', 'Flexible plan price per user per month.', '{"storage_per_user":"5 TB pooled","meet_participants":500}'::jsonb),
    ('google-workspace', 'business-plus-annual', 'Business Plus Annual', 22.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://support.google.com/a/answer/13062337', '2026-05-14', 'high', 'Annual/fixed-term price per user per month.', '{"storage_per_user":"5 TB pooled","meet_participants":500}'::jsonb),

    ('microsoft-365', 'business-basic-annual', 'Business Basic', 6.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing', '2026-05-14', 'medium', 'Annual subscription estimate; verify regional Microsoft checkout before final quote.', '{"desktop_apps":false}'::jsonb),
    ('microsoft-365', 'apps-for-business-annual', 'Apps for Business', 8.25, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing', '2026-05-14', 'medium', 'Annual subscription estimate; verify regional Microsoft checkout before final quote.', '{"desktop_apps":true,"email":false}'::jsonb),
    ('microsoft-365', 'business-standard-annual', 'Business Standard', 12.50, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing', '2026-05-14', 'medium', 'Annual subscription estimate; verify regional Microsoft checkout before final quote.', '{"desktop_apps":true,"email":true}'::jsonb),
    ('microsoft-365', 'business-premium-annual', 'Business Premium', 22.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing', '2026-05-14', 'medium', 'Annual subscription estimate; verify regional Microsoft checkout before final quote.', '{"desktop_apps":true,"security":"advanced"}'::jsonb),

    ('vercel', 'hobby', 'Hobby', 0.00, 'USD', 'month', 'none', 'team', 'team / month', 1, null, 'https://vercel.com/pricing', '2026-05-14', 'high', 'Personal/non-commercial starting plan.', '{"bandwidth_included_gb":100,"edge_requests_included":1000000}'::jsonb),
    ('vercel', 'pro-seat', 'Pro Developer Seat', 20.00, 'USD', 'month', 'monthly', 'user', 'developer seat / month', 1, null, 'https://vercel.com/pricing', '2026-05-14', 'high', 'Pro is $20/mo plus additional usage with $20 included usage credit.', '{"included_usage_credit":20,"bandwidth_included_gb":1000,"edge_requests_included":10000000}'::jsonb),
    ('vercel', 'edge-requests-overage', 'Edge Requests Overage', 2.00, 'USD', 'usage', 'monthly', 'usage', '1M requests', 1000000, 'edge_requests', 'https://vercel.com/pricing', '2026-05-14', 'high', 'Starting overage price per 1M edge requests.', '{}'::jsonb),
    ('vercel', 'fast-data-transfer-overage', 'Fast Data Transfer Overage', 0.15, 'USD', 'usage', 'monthly', 'usage', 'GB', 1, 'bandwidth_gb', 'https://vercel.com/pricing', '2026-05-14', 'high', 'Starting overage price per GB.', '{}'::jsonb),
    ('vercel', 'functions-active-cpu', 'Functions Active CPU', 0.128, 'USD', 'usage', 'monthly', 'usage', 'active CPU hour', 1, 'active_cpu_hour', 'https://vercel.com/pricing', '2026-05-14', 'high', 'Starting price per active CPU hour.', '{}'::jsonb),
    ('vercel', 'functions-invocations', 'Functions Invocations', 0.60, 'USD', 'usage', 'monthly', 'usage', '1M invocations', 1000000, 'function_invocations', 'https://vercel.com/pricing', '2026-05-14', 'high', 'Starting price per 1M function invocations.', '{}'::jsonb),
    ('vercel', 'blob-storage', 'Blob Storage', 0.023, 'USD', 'usage', 'monthly', 'usage', 'GB-month', 1, 'blob_gb_month', 'https://vercel.com/pricing', '2026-05-14', 'high', 'Blob storage size over included usage.', '{}'::jsonb),
    ('vercel', 'web-analytics-plus', 'Web Analytics Plus', 10.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://vercel.com/pricing', '2026-05-14', 'high', 'Web Analytics Plus add-on.', '{}'::jsonb),
    ('vercel', 'speed-insights', 'Speed Insights', 10.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://vercel.com/pricing', '2026-05-14', 'high', 'Speed Insights add-on per project per month.', '{}'::jsonb),

    ('supabase', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'org', 'org / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Free plan.', '{"database_size":"500 MB","bandwidth_gb":5}'::jsonb),
    ('supabase', 'pro', 'Pro', 25.00, 'USD', 'month', 'monthly', 'org', 'org / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Pro plan includes $10/mo compute credits, enough to cover one Micro instance.', '{"included_compute_credit":10,"database_size":"8 GB","bandwidth_gb":250}'::jsonb),
    ('supabase', 'team', 'Team', 599.00, 'USD', 'month', 'monthly', 'org', 'org / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Team plan.', '{"included_compute_credit":10}'::jsonb),
    ('supabase', 'compute-micro', 'Compute Micro', 10.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Micro compute. First paid-plan instance is offset by included compute credit.', '{"memory":"1 GB","cpu":"2-core ARM"}'::jsonb),
    ('supabase', 'compute-small', 'Compute Small', 15.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Small compute.', '{"memory":"2 GB","cpu":"2-core ARM"}'::jsonb),
    ('supabase', 'compute-medium', 'Compute Medium', 60.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Medium compute.', '{"memory":"4 GB","cpu":"2-core ARM"}'::jsonb),
    ('supabase', 'compute-large', 'Compute Large', 110.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'Large compute.', '{"memory":"8 GB","cpu":"2-core ARM"}'::jsonb),
    ('supabase', 'compute-xl', 'Compute XL', 210.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'XL compute.', '{"memory":"16 GB","cpu":"4-core ARM"}'::jsonb),
    ('supabase', 'database-overage-gb', 'Database Size Overage', 0.125, 'USD', 'usage', 'monthly', 'usage', 'GB', 1, 'database_gb', 'https://supabase.com/pricing', '2026-05-14', 'high', 'Database storage above included amount.', '{}'::jsonb),
    ('supabase', 'pitr-7-days', 'Point in Time Recovery 7 Days', 100.00, 'USD', 'month', 'monthly', 'project', 'project / month', 1, null, 'https://supabase.com/pricing', '2026-05-14', 'high', 'PITR per 7 days retention.', '{}'::jsonb),

    ('zoom', 'basic', 'Workplace Basic', 0.00, 'USD', 'month', 'none', 'user', 'user / month', 1, null, 'https://www.zoom.com/en/products/collaboration-tools/', '2026-05-14', 'high', 'Free plan: 40-minute meetings and 100 participants.', '{"meeting_minutes":40,"participants":100}'::jsonb),
    ('zoom', 'pro-annual', 'Workplace Pro Annual', 13.33, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://zoom.us/pricing', '2026-05-14', 'medium', 'US public checkout estimate. Recheck Zoom checkout before final quote because pricing is region-sensitive and crawler did not expose numeric values.', '{"meeting_hours":30,"participants":100,"cloud_storage_gb":10}'::jsonb),
    ('zoom', 'pro-monthly', 'Workplace Pro Monthly', 15.99, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://zoom.us/pricing', '2026-05-14', 'medium', 'US public checkout estimate. Recheck Zoom checkout before final quote.', '{"meeting_hours":30,"participants":100,"cloud_storage_gb":10}'::jsonb),
    ('zoom', 'business-annual', 'Workplace Business Annual', 18.32, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://zoom.us/pricing', '2026-05-14', 'medium', 'US public checkout estimate. Recheck Zoom checkout before final quote.', '{"participants":300}'::jsonb),
    ('zoom', 'business-monthly', 'Workplace Business Monthly', 21.99, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://zoom.us/pricing', '2026-05-14', 'medium', 'US public checkout estimate. Recheck Zoom checkout before final quote.', '{"participants":300}'::jsonb),

    ('zoho-mail', 'mail-lite-annual', 'Mail Lite', 1.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com.cn/sites/default/files/workplace/zoho-workplace-plan-comparison-usd.pdf', '2026-05-14', 'medium', 'Annual price from official USD comparison PDF.', '{"storage_per_user":"5 GB"}'::jsonb),
    ('zoho-mail', 'workplace-standard-annual', 'Workplace Standard', 3.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com.cn/sites/default/files/workplace/zoho-workplace-plan-comparison-usd.pdf', '2026-05-14', 'medium', 'Annual price from official USD comparison PDF.', '{"mail_storage_per_user":"30 GB","workdrive_storage_per_user":"10 GB"}'::jsonb),
    ('zoho-mail', 'workplace-professional-annual', 'Workplace Professional', 6.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com.cn/sites/default/files/workplace/zoho-workplace-plan-comparison-usd.pdf', '2026-05-14', 'medium', 'Annual price from official USD comparison PDF.', '{"mail_storage_per_user":"100 GB","workdrive_storage_per_user":"100 GB"}'::jsonb),

    ('zoho-crm', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'org', 'org / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Free edition supports up to 3 users.', '{"users_included":3}'::jsonb),
    ('zoho-crm', 'standard-annual', 'Standard Annual', 14.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Annual price per user per month.', '{}'::jsonb),
    ('zoho-crm', 'standard-monthly', 'Standard Monthly', 20.00, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Monthly price per user.', '{}'::jsonb),
    ('zoho-crm', 'professional-annual', 'Professional Annual', 23.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Annual price per user per month.', '{}'::jsonb),
    ('zoho-crm', 'professional-monthly', 'Professional Monthly', 35.00, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Monthly price per user.', '{}'::jsonb),
    ('zoho-crm', 'enterprise-annual', 'Enterprise Annual', 40.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Annual price per user per month.', '{}'::jsonb),
    ('zoho-crm', 'enterprise-monthly', 'Enterprise Monthly', 50.00, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Monthly price per user.', '{}'::jsonb),
    ('zoho-crm', 'ultimate-annual', 'Ultimate Annual', 52.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Annual price per user per month.', '{}'::jsonb),
    ('zoho-crm', 'ultimate-monthly', 'Ultimate Monthly', 65.00, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf', '2026-05-14', 'high', 'Monthly price per user.', '{}'::jsonb),

    ('zoho-books', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Free plan for qualifying micro businesses.', '{"users_included":1,"accountants_included":1}'::jsonb),
    ('zoho-books', 'standard-monthly', 'Standard Monthly', 12.00, 'USD', 'month', 'monthly', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Monthly org price.', '{"users_included":3}'::jsonb),
    ('zoho-books', 'standard-annual', 'Standard Annual', 10.00, 'USD', 'month', 'annual', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Annual monthly equivalent org price.', '{"users_included":3}'::jsonb),
    ('zoho-books', 'professional-monthly', 'Professional Monthly', 24.00, 'USD', 'month', 'monthly', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Monthly org price.', '{"users_included":5}'::jsonb),
    ('zoho-books', 'professional-annual', 'Professional Annual', 20.00, 'USD', 'month', 'annual', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Annual monthly equivalent org price.', '{"users_included":5}'::jsonb),
    ('zoho-books', 'premium-annual', 'Premium Annual', 30.00, 'USD', 'month', 'annual', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Annual monthly equivalent org price.', '{"users_included":10}'::jsonb),
    ('zoho-books', 'elite-annual', 'Elite Annual', 100.00, 'USD', 'month', 'annual', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Annual monthly equivalent org price.', '{"users_included":10}'::jsonb),
    ('zoho-books', 'ultimate-annual', 'Ultimate Annual', 200.00, 'USD', 'month', 'annual', 'org', 'org / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Annual monthly equivalent org price.', '{"users_included":15}'::jsonb),
    ('zoho-books', 'additional-user-annual', 'Additional User Annual', 2.50, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://www.zoho.com/books/pricing/', '2026-05-14', 'high', 'Additional user add-on billed annually.', '{}'::jsonb),

    ('openai', 'gpt-5-5', 'GPT-5.5 Input', 5.00, 'USD', 'usage', 'monthly', 'usage', '1M input tokens', 1000000, 'input_tokens', 'https://openai.com/api/pricing/', '2026-05-14', 'high', 'Input token price. Output is separate line.', '{"output_per_1m":30,"cached_input_per_1m":0.50}'::jsonb),
    ('openai', 'gpt-5-4', 'GPT-5.4 Input', 2.50, 'USD', 'usage', 'monthly', 'usage', '1M input tokens', 1000000, 'input_tokens', 'https://openai.com/api/pricing/', '2026-05-14', 'high', 'Input token price. Output is separate in metadata.', '{"output_per_1m":15,"cached_input_per_1m":0.25}'::jsonb),
    ('openai', 'gpt-5-4-mini', 'GPT-5.4 mini Input', 0.75, 'USD', 'usage', 'monthly', 'usage', '1M input tokens', 1000000, 'input_tokens', 'https://openai.com/api/pricing/', '2026-05-14', 'high', 'Input token price. Output is separate in metadata.', '{"output_per_1m":4.50,"cached_input_per_1m":0.075}'::jsonb),
    ('openai', 'web-search', 'Web Search', 10.00, 'USD', 'usage', 'monthly', 'usage', '1K calls', 1000, 'search_calls', 'https://openai.com/api/pricing/', '2026-05-14', 'high', 'Web search tool calls.', '{}'::jsonb),
    ('openai', 'containers-1gb', 'Containers 1 GB', 0.03, 'USD', 'usage', 'monthly', 'usage', 'container/session', 1, 'container_session', 'https://openai.com/api/pricing/', '2026-05-14', 'high', '1 GB container price; pricing note changes to per 20-minute session starting March 31, 2026.', '{}'::jsonb),

    ('stripe', 'domestic-card', 'Domestic Card Transaction', 0.029, 'USD', 'usage', 'monthly', 'usage', 'percent', 1, 'transaction_percent', 'https://stripe.com/us/pricing', '2026-05-14', 'high', '2.9% + $0.30 per successful domestic card transaction.', '{"fixed_fee":0.30,"fixed_fee_currency":"USD"}'::jsonb),
    ('paypal', 'paypal-venmo', 'PayPal and Venmo Transaction', 0.0349, 'USD', 'usage', 'monthly', 'usage', 'percent', 1, 'transaction_percent', 'https://www.paypal.com/us/business/pricing', '2026-05-14', 'high', '3.49% + $0.49 per transaction.', '{"fixed_fee":0.49,"fixed_fee_currency":"USD"}'::jsonb),
    ('paypal', 'card-processing-starting', 'Card Processing Starting Rate', 0.0289, 'USD', 'usage', 'monthly', 'usage', 'percent', 1, 'transaction_percent', 'https://www.paypal.com/us/business/pricing', '2026-05-14', 'high', 'Starting at 2.89% + $0.29 per transaction.', '{"fixed_fee":0.29,"fixed_fee_currency":"USD"}'::jsonb),

    ('calendly', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'user', 'user / month', 1, null, 'https://calendly.com/pricing/', '2026-05-14', 'high', 'Free personal scheduling plan.', '{}'::jsonb),
    ('calendly', 'standard-annual', 'Standard Annual', 10.00, 'USD', 'month', 'annual', 'seat', 'seat / month', 1, null, 'https://calendly.com/pricing/', '2026-05-14', 'high', 'Yearly price per seat per month.', '{}'::jsonb),
    ('calendly', 'teams-annual', 'Teams Annual', 16.00, 'USD', 'month', 'annual', 'seat', 'seat / month', 1, null, 'https://calendly.com/pricing/', '2026-05-14', 'high', 'Yearly price per seat per month.', '{}'::jsonb),

    ('notion', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'member', 'member / month', 1, null, 'https://www.notion.com/pricing', '2026-05-14', 'high', 'Free plan.', '{}'::jsonb),
    ('notion', 'plus-monthly', 'Plus Monthly', 10.00, 'USD', 'month', 'monthly', 'member', 'member / month', 1, null, 'https://www.notion.com/pricing', '2026-05-14', 'high', 'Monthly price per member.', '{}'::jsonb),
    ('notion', 'business-monthly', 'Business Monthly', 20.00, 'USD', 'month', 'monthly', 'member', 'member / month', 1, null, 'https://www.notion.com/pricing', '2026-05-14', 'high', 'Monthly price per member.', '{}'::jsonb),

    ('slack', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'user', 'user / month', 1, null, 'https://slack.com/pricing', '2026-05-14', 'high', 'Free team chat plan.', '{}'::jsonb),
    ('slack', 'pro-annual', 'Pro Annual', 8.75, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://slack.com/pricing', '2026-05-14', 'medium', 'Public US annual estimate; verify Slack checkout for region.', '{}'::jsonb),
    ('slack', 'business-plus-annual', 'Business+ Annual', 15.00, 'USD', 'month', 'annual', 'user', 'user / month', 1, null, 'https://slack.com/pricing', '2026-05-14', 'medium', 'Public US annual estimate; verify Slack checkout for region.', '{}'::jsonb),

    ('namecheap', 'com-registration-sale', '.com Registration', 10.98, 'USD', 'year', 'annual', 'domain', 'domain / year', 1, null, 'https://www.namecheap.com/domains/', '2026-05-14', 'medium', 'Search result showed .com sale registration price; domain prices change frequently.', '{"tld":".com"}'::jsonb),
    ('namecheap', 'com-renewal', '.com Renewal', 18.48, 'USD', 'year', 'annual', 'domain', 'domain / year', 1, null, 'https://www.namecheap.com/domains/', '2026-05-14', 'medium', 'Search result showed .com renewal price; domain prices change frequently.', '{"tld":".com"}'::jsonb),

    ('sendgrid', 'essentials-50k', 'Essentials 50K', 19.95, 'USD', 'month', 'monthly', 'account', 'account / month', 50000, 'emails', 'https://www.twilio.com/content/dam/sendgrid/global/en/other/sendgrid-pricing/twi121--sendgrid-pricing-pdf-st1.pdf', '2026-05-14', 'high', '50,000 emails/month.', '{}'::jsonb),
    ('sendgrid', 'essentials-100k', 'Essentials 100K', 34.95, 'USD', 'month', 'monthly', 'account', 'account / month', 100000, 'emails', 'https://www.twilio.com/content/dam/sendgrid/global/en/other/sendgrid-pricing/twi121--sendgrid-pricing-pdf-st1.pdf', '2026-05-14', 'high', '100,000 emails/month.', '{}'::jsonb),
    ('sendgrid', 'pro-100k', 'Pro 100K', 89.95, 'USD', 'month', 'monthly', 'account', 'account / month', 100000, 'emails', 'https://www.twilio.com/content/dam/sendgrid/global/en/other/sendgrid-pricing/twi121--sendgrid-pricing-pdf-st1.pdf', '2026-05-14', 'high', '100,000 emails/month.', '{}'::jsonb),

    ('cloudflare', 'free', 'Free', 0.00, 'USD', 'month', 'none', 'domain', 'domain / month', 1, null, 'https://www.cloudflare.com/plans/', '2026-05-14', 'high', 'Free DNS/CDN/security plan.', '{}'::jsonb),
    ('cloudflare', 'pro', 'Pro', 20.00, 'USD', 'month', 'monthly', 'domain', 'domain / month', 1, null, 'https://www.cloudflare.com/plans/', '2026-05-14', 'medium', 'Common public Pro plan price; verify current checkout.', '{}'::jsonb),
    ('cloudflare', 'business', 'Business', 200.00, 'USD', 'month', 'monthly', 'domain', 'domain / month', 1, null, 'https://www.cloudflare.com/plans/', '2026-05-14', 'medium', 'Common public Business plan price; verify current checkout.', '{}'::jsonb),

    ('adobe', 'observed-single-license-low', 'Observed Adobe Single License Low', 30.00, 'USD', 'month', 'monthly', 'license', 'license / month', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed existing expense: Adobe subscription one license at $30/month.', '{"observed":true}'::jsonb),
    ('adobe', 'observed-single-license-high', 'Observed Adobe Single License High', 36.83, 'USD', 'month', 'monthly', 'license', 'license / month', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed existing expense: Adobe subscription one license at $36.83/month.', '{"observed":true}'::jsonb),
    ('anthropic', 'claude-pro-observed', 'Claude Pro Observed', 20.00, 'USD', 'month', 'monthly', 'user', 'user / month', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed existing expense: Claude Pro subscription at $20/month.', '{"observed":true}'::jsonb),
    ('godaddy', 'domain-renewal-observed-com', 'Observed .com Domain Renewal', 22.17, 'USD', 'year', 'annual', 'domain', 'domain / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed common GoDaddy domain renewal in expenses. Verify current registrar checkout before quoting.', '{"observed":true,"tld":".com"}'::jsonb),
    ('godaddy', 'domain-renewal-observed-org', 'Observed .org Domain Renewal', 23.19, 'USD', 'year', 'annual', 'domain', 'domain / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed GoDaddy .org renewal-like cost in expenses. Verify current registrar checkout before quoting.', '{"observed":true,"tld":".org"}'::jsonb),
    ('hostgator', 'email-license-observed', 'Observed Email License', 179.88, 'USD', 'year', 'annual', 'mailbox', 'mailbox / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed HostGator email license expense.', '{"observed":true}'::jsonb),
    ('foxrig', 'domain-basic-observed', 'Observed Domain Basic', 24.98, 'USD', 'year', 'annual', 'domain', 'domain / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed Foxrig domain expense.', '{"observed":true}'::jsonb),
    ('foxrig', 'domain-premium-observed', 'Observed Domain Premium', 42.98, 'USD', 'year', 'annual', 'domain', 'domain / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed Foxrig higher domain expense.', '{"observed":true}'::jsonb),
    ('wix', 'observed-email-license-yearly', 'Observed Wix Email License', 72.00, 'USD', 'year', 'annual', 'mailbox', 'mailbox / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed Wix email license baseline from existing expenses. Google Workspace may still be the underlying mailbox vendor.', '{"observed":true}'::jsonb),
    ('wix', 'observed-hosting-basic-yearly', 'Observed Wix Hosting Basic', 150.00, 'USD', 'year', 'annual', 'site', 'site / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed common Wix hosting baseline from existing expenses.', '{"observed":true}'::jsonb),
    ('wix', 'observed-hosting-high-yearly', 'Observed Wix Hosting High', 336.00, 'USD', 'year', 'annual', 'site', 'site / year', 1, null, 'supabase://public.expenses', '2026-05-14', 'medium', 'Observed higher Wix hosting baseline from existing expenses.', '{"observed":true}'::jsonb),

    ('manual', 'paid-apps', 'Paid Apps / Marketplace Add-ons', null, 'USD', 'custom', 'custom', 'manual', 'manual amount', null, null, null, '2026-05-14', 'needs_verification', 'Use for Wix apps, plugins, marketplace add-ons, maps APIs, SMS, WhatsApp, stock assets, or client-specific subscriptions.', '{}'::jsonb),
    ('manual', 'stock-assets', 'Stock Assets / Fonts / Licenses', null, 'USD', 'custom', 'custom', 'manual', 'manual amount', null, null, null, '2026-05-14', 'needs_verification', 'Manual budget bucket for paid assets.', '{}'::jsonb),
    ('manual', 'third-party-api', 'Third-party API Usage', null, 'USD', 'custom', 'custom', 'manual', 'manual amount', null, null, null, '2026-05-14', 'needs_verification', 'Manual budget bucket for any API not in the catalog.', '{}'::jsonb)
) as p(
  vendor_slug, slug, plan_name, price_amount, currency, billing_interval, commitment,
  unit_type, unit_label, included_quantity, usage_metric, source_url, source_checked_at,
  confidence, notes, metadata
)
join public.pricing_vendors v on v.slug = p.vendor_slug
on conflict (vendor_id, slug) do update set
  plan_name = excluded.plan_name,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  commitment = excluded.commitment,
  unit_type = excluded.unit_type,
  unit_label = excluded.unit_label,
  included_quantity = excluded.included_quantity,
  usage_metric = excluded.usage_metric,
  source_url = excluded.source_url,
  source_checked_at = excluded.source_checked_at,
  confidence = excluded.confidence,
  notes = excluded.notes,
  metadata = excluded.metadata,
  active = true,
  updated_at = now();

insert into public.pricing_service_categories (slug, name, description, sort_order)
values
  ('discovery', 'Discovery and Strategy', 'Scoping, project planning, UX thinking, and estimate shaping.', 10),
  ('website', 'Websites', 'Marketing websites, landing pages, Wix builds, and CMS work.', 20),
  ('ecommerce', 'Ecommerce and Bookings', 'Stores, products, checkout, bookings, memberships, and payments.', 30),
  ('web_app', 'Web Apps and Portals', 'Custom portals, dashboards, authentication, admin tools, and Supabase backends.', 40),
  ('crm_automation', 'CRM and Automations', 'Zoho, workflows, data migration, integrations, and business operations.', 50),
  ('ai_data', 'AI and Data', 'Iris-style assistants, knowledge bases, AI workflows, and usage budgets.', 60),
  ('social_media', 'Social Media and Ads', 'Social strategy, account setup, content calendars, posts, reels, community management, reporting, and paid ads.', 65),
  ('content_marketing', 'Content and Marketing', 'Copywriting, SEO setup, analytics, tracking, and launch support.', 70),
  ('maintenance', 'Maintenance and Retainers', 'Ongoing support, hosting management, backups, monitoring, and small improvements.', 80),
  ('infrastructure', 'Infrastructure Pass-throughs', 'Third-party subscriptions, domains, email, hosting, and API usage.', 90)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.pricing_service_items (
  category_id, slug, name, description, pricing_model, min_price, base_price, max_price,
  internal_cost_basis, default_quantity, unit_label, billing_interval, complexity_weight,
  ai_prompt_hint, sort_order
)
select
  c.id, i.slug, i.name, i.description, i.pricing_model, i.min_price, i.base_price, i.max_price,
  i.internal_cost_basis, i.default_quantity, i.unit_label, i.billing_interval, i.complexity_weight,
  i.ai_prompt_hint, i.sort_order
from (
  values
    ('discovery', 'discovery-strategy', 'Discovery and estimate strategy', 'Requirements workshop, goals, sitemap, feature list, and initial project plan.', 'range', 250, 450, 900, 180, 1, 'project', 'one_time', 1.00, 'Ask about business goals, deadline, competitors, content readiness, and decision makers.', 10),
    ('website', 'landing-page-design-build', 'Landing page design and build', 'One polished landing page with responsive design and launch setup.', 'range', 800, 1200, 2200, 520, 1, 'page', 'one_time', 1.00, 'Good for campaigns, products, or single-service websites.', 20),
    ('website', 'corporate-website-base', 'Corporate website base build', 'Core website setup: homepage, about, services, contact, responsive QA, and launch.', 'range', 1800, 2800, 5200, 1250, 1, 'site', 'one_time', 1.20, 'Use when client needs a complete business website.', 30),
    ('website', 'additional-page', 'Additional website page', 'Additional designed and implemented page after the core set.', 'per_unit', 120, 180, 300, 75, 1, 'page', 'one_time', 1.00, 'Multiply by page_count beyond the included base pages.', 40),
    ('website', 'blog-cms-setup', 'Blog or CMS setup', 'CMS collection, templates, categories, and sample entries.', 'range', 400, 750, 1600, 320, 1, 'module', 'one_time', 1.05, 'Use for blogs, resources, news, portfolios, or dynamic pages.', 50),
    ('website', 'wix-velo-custom-feature', 'Wix Velo custom feature', 'Custom Wix/Velo functionality, database collections, permissions, and JS behavior.', 'range', 350, 900, 2500, 420, 1, 'feature', 'one_time', 1.25, 'Use for member areas, custom forms, dashboards, filters, and automations inside Wix.', 60),
    ('website', 'responsive-qa-launch', 'Responsive QA and launch', 'Mobile checks, browser QA, domain/DNS support, basic performance and SEO sanity pass.', 'range', 250, 450, 900, 190, 1, 'launch', 'one_time', 1.00, 'Should be included on almost every project.', 70),

    ('ecommerce', 'ecommerce-setup', 'Ecommerce setup', 'Store setup, product types, cart, checkout, taxes, shipping basics, and order flow.', 'range', 1200, 2200, 4200, 900, 1, 'store', 'one_time', 1.25, 'Ask product count, variants, payment provider, shipping zones, and inventory complexity.', 10),
    ('ecommerce', 'product-catalog-import', 'Product catalog import', 'Product entry/import, categories, variants, images, and cleanup.', 'per_unit', 2, 4, 8, 1.5, 1, 'product', 'one_time', 1.00, 'Multiply by product_count, with a minimum project fee.', 20),
    ('ecommerce', 'payment-shipping-config', 'Payment and shipping configuration', 'Payment gateway, shipping rules, tax settings, invoices/notifications, and test orders.', 'range', 400, 750, 1500, 330, 1, 'setup', 'one_time', 1.15, 'Use for ecommerce and booking projects that collect payments.', 30),
    ('ecommerce', 'booking-membership-setup', 'Booking or membership setup', 'Bookings, packages, subscriptions, member pages, notifications, and staff calendars.', 'range', 500, 1200, 2800, 520, 1, 'module', 'one_time', 1.20, 'Use for salons, clinics, coaches, classes, events, or members-only content.', 40),

    ('web_app', 'custom-web-app-mvp', 'Custom web app MVP', 'Custom application build with core screens, flows, database, authentication, and deployment.', 'range', 4000, 8500, 18000, 3900, 1, 'app', 'one_time', 1.50, 'Ask about roles, entities, dashboards, workflows, data volume, integrations, and acceptance criteria.', 10),
    ('web_app', 'dashboard-portal', 'Dashboard or client portal', 'Operational portal, dashboards, tables, modals, filters, and data actions.', 'range', 2500, 5500, 12000, 2400, 1, 'portal', 'one_time', 1.35, 'Good match for internal tools, client portals, invoice dashboards, or project trackers.', 20),
    ('web_app', 'supabase-backend', 'Supabase backend setup', 'Schema, RLS, storage, edge functions, auth wiring, and seed data.', 'range', 800, 1800, 4500, 850, 1, 'backend', 'one_time', 1.25, 'Use whenever the build needs persistent data beyond Wix CMS.', 30),
    ('web_app', 'auth-permissions', 'Authentication and permissions', 'Login, roles, access rules, protected pages, and session behavior.', 'range', 600, 1300, 3000, 620, 1, 'module', 'one_time', 1.20, 'Ask whether users are staff, clients, vendors, or public visitors.', 40),
    ('web_app', 'admin-panel', 'Admin panel', 'CRUD screens, management tools, audit fields, exports, and status controls.', 'range', 1000, 2400, 5500, 1100, 1, 'panel', 'one_time', 1.25, 'Use when the client needs to manage site/app content without touching code.', 50),
    ('web_app', 'api-integration', 'API integration', 'Connection to a third-party API, auth, webhooks, mapping, retries, and logs.', 'range', 450, 1200, 3500, 560, 1, 'integration', 'one_time', 1.30, 'Multiply by integrations_count and raise complexity for poor API docs or payment/CRM systems.', 60),

    ('crm_automation', 'zoho-crm-setup', 'Zoho CRM setup', 'CRM pipeline, fields, modules, users, permissions, and basic onboarding.', 'range', 900, 1800, 4200, 760, 1, 'setup', 'one_time', 1.20, 'Ask sales process, users, modules, existing data, and automation needs.', 10),
    ('crm_automation', 'crm-customization', 'CRM customization', 'Custom modules, layouts, blueprints, reports, dashboards, and business rules.', 'range', 500, 1400, 3500, 650, 1, 'scope', 'one_time', 1.30, 'Use for more advanced CRM builds after base setup.', 20),
    ('crm_automation', 'automation-workflow', 'Automation workflow', 'One business workflow automation with triggers, actions, testing, and handoff notes.', 'per_unit', 300, 650, 1600, 280, 1, 'workflow', 'one_time', 1.25, 'Multiply by workflow_count.', 30),
    ('crm_automation', 'data-migration', 'Data migration and cleanup', 'Import, cleanup, mapping, dedupe, and validation from spreadsheets or another system.', 'range', 500, 1400, 4500, 600, 1, 'migration', 'one_time', 1.35, 'Ask row count, source quality, attachments, and whether downtime is acceptable.', 40),

    ('ai_data', 'iris-style-chat-assistant', 'Iris-style AI assistant', 'AI assistant connected to business data, prompt/persona, tool calls, auth, and UI integration.', 'range', 1200, 2800, 6500, 1350, 1, 'assistant', 'one_time', 1.45, 'Ask what data Iris can read, allowed actions, tone, user roles, and expected monthly chats.', 10),
    ('ai_data', 'ai-knowledge-base', 'AI knowledge base', 'Content ingestion, retrieval structure, source citations, refresh workflow, and testing.', 'range', 500, 1500, 4200, 650, 1, 'knowledge base', 'one_time', 1.30, 'Use for docs, policies, product information, or support answers.', 20),
    ('ai_data', 'ai-usage-budget', 'AI usage budget', 'Monthly API allowance and monitoring for AI calls, search, containers, or embeddings.', 'pass_through', 25, 100, 1000, 0, 1, 'month', 'month', 1.00, 'Add as recurring pass-through with markup based on expected token/search usage.', 30),

    ('social_media', 'social-media-strategy', 'Social media strategy', 'Audience, positioning, content pillars, channel plan, goals, and monthly direction.', 'range', 300, 650, 1500, 250, 1, 'strategy', 'one_time', 1.10, 'Ask audience, brand tone, competitors, monthly goals, and whether ads are involved.', 10),
    ('social_media', 'social-media-account-setup', 'Social account setup or cleanup', 'Profile setup, bio, branding, highlights, links, permissions, Meta Business access, and basic optimization.', 'per_unit', 120, 250, 500, 85, 1, 'platform', 'one_time', 1.00, 'Multiply by platform_count for Instagram, Facebook, LinkedIn, TikTok, YouTube, X, Snapchat, or Google Business Profile.', 20),
    ('social_media', 'social-content-calendar', 'Monthly content calendar', 'Monthly plan with themes, post ideas, captions, campaign dates, and approval structure.', 'monthly', 250, 450, 900, 160, 1, 'month', 'month', 1.00, 'Use whenever social content is recurring.', 30),
    ('social_media', 'social-post-design', 'Social post design', 'Static feed post, carousel cover, or simple branded graphic with caption support.', 'per_unit', 25, 45, 90, 18, 1, 'post', 'one_time', 1.00, 'Multiply by posts_per_month for custom content pricing.', 40),
    ('social_media', 'social-carousel-design', 'Carousel design', 'Multi-slide educational or promotional carousel with copy structure and design.', 'per_unit', 70, 120, 250, 45, 1, 'carousel', 'one_time', 1.10, 'Use when content needs multi-slide storytelling.', 50),
    ('social_media', 'social-reel-short-video', 'Reel or short video edit', 'Short-form video edit with cuts, captions, hooks, basic motion, and export.', 'per_unit', 60, 120, 280, 45, 1, 'reel', 'one_time', 1.20, 'Multiply by reels_per_month and raise complexity if filming is included.', 60),
    ('social_media', 'social-story-set', 'Story set', 'Small story sequence for announcements, engagement, offers, or event coverage.', 'per_unit', 20, 40, 90, 14, 1, 'story set', 'one_time', 1.00, 'Multiply by story_sets_per_month.', 70),
    ('social_media', 'social-media-management-basic', 'Social media management basic', 'Monthly management for light posting, scheduling, basic captions, and simple monthly reporting.', 'monthly', 450, 750, 1200, 260, 1, 'month', 'month', 1.00, 'Starter package. Good for one or two channels and low content volume.', 80),
    ('social_media', 'social-media-management-growth', 'Social media management growth', 'Monthly management with higher posting volume, reels, content calendar, scheduling, engagement checks, and reports.', 'monthly', 850, 1400, 2500, 560, 1, 'month', 'month', 1.15, 'Growth package. Good for active brands that need consistent momentum.', 90),
    ('social_media', 'social-media-management-premium', 'Social media management premium', 'High-touch monthly management with multi-channel planning, campaigns, reels, reporting, and coordination.', 'monthly', 1600, 2500, 4500, 980, 1, 'month', 'month', 1.30, 'Premium package. Use for demanding clients, multiple brands, events, or heavy approvals.', 100),
    ('social_media', 'community-management-basic', 'Community management', 'Reply monitoring, comment/DM triage, escalation notes, and engagement checks.', 'monthly', 200, 450, 1200, 160, 1, 'month', 'month', 1.15, 'Ask expected daily comment/DM volume and response SLA.', 110),
    ('social_media', 'paid-ads-setup', 'Paid ads setup', 'Campaign setup, pixels/conversion events, audiences, creatives mapping, and launch QA.', 'range', 300, 650, 1500, 240, 1, 'setup', 'one_time', 1.15, 'Use for Meta, Google, TikTok, LinkedIn, or Snapchat campaigns.', 120),
    ('social_media', 'paid-ads-management', 'Paid ads management', 'Monthly campaign management, optimization, reporting, budget pacing, and recommendations.', 'monthly', 250, 600, 1800, 220, 1, 'month', 'month', 1.20, 'Price can be fixed or calculated as a percentage of ad spend with a minimum fee.', 130),
    ('social_media', 'paid-ad-budget-pass-through', 'Paid ad budget pass-through', 'Client ad spend budget passed through or tracked separately from ZAtech management fee.', 'pass_through', 0, 0, 0, 0, 1, 'month', 'month', 1.00, 'Use the client ad budget as a recurring cost line. Usually no markup unless ZAtech pays the platform directly.', 140),
    ('social_media', 'social-reporting', 'Social reporting', 'Monthly performance report with highlights, content learnings, next actions, and KPI summary.', 'monthly', 100, 250, 700, 80, 1, 'month', 'month', 1.05, 'Use for clients who need structured reporting beyond basic package reporting.', 150),
    ('social_media', 'photoshoot-creative-direction', 'Photoshoot or content day direction', 'Shot list, creative direction, content capture planning, and on-site coordination.', 'range', 300, 800, 2200, 300, 1, 'content day', 'one_time', 1.25, 'Use when ZAtech plans or coordinates filming/photography. Photographer/videographer cost can be manual vendor pass-through.', 160),

    ('content_marketing', 'copywriting-page', 'Copywriting per page', 'Business copy draft, editing, CTA structure, and SEO-aware headings.', 'per_unit', 80, 140, 250, 60, 1, 'page', 'one_time', 1.00, 'Use when content is not ready or needs rewriting.', 10),
    ('content_marketing', 'seo-basic-setup', 'Basic SEO setup', 'Metadata, headings, indexability, sitemap, search console, and launch SEO checklist.', 'range', 300, 650, 1500, 260, 1, 'site', 'one_time', 1.10, 'Should be included for client-facing websites.', 20),
    ('content_marketing', 'analytics-tracking', 'Analytics and tracking setup', 'GA4, pixels, conversion events, consent basics, and reporting sanity check.', 'range', 150, 400, 1000, 170, 1, 'setup', 'one_time', 1.10, 'Ask which ad platforms and conversion events matter.', 30),

    ('maintenance', 'website-care-basic', 'Website care basic', 'Small monthly support, updates, backups, uptime checks, and minor edits.', 'monthly', 150, 150, 250, 55, 1, 'month', 'month', 1.00, 'Basic retainer for small websites.', 10),
    ('maintenance', 'website-care-growth', 'Website care growth', 'Priority support, monthly improvements, content updates, reports, and technical checks.', 'monthly', 350, 450, 900, 160, 1, 'month', 'month', 1.00, 'Growth retainer for active businesses.', 20),
    ('maintenance', 'app-care', 'App care retainer', 'Monitoring, bug fixes, dependency checks, small features, database review, and support.', 'monthly', 700, 1200, 2500, 430, 1, 'month', 'month', 1.10, 'Use for custom apps and client portals.', 30),
    ('maintenance', 'hosting-management', 'Hosting and vendor management', 'Manage hosting, DNS, domains, email, renewals, support tickets, and vendor coordination.', 'monthly', 75, 150, 400, 45, 1, 'month', 'month', 1.00, 'Recurring management fee separate from vendor pass-through costs.', 40),

    ('infrastructure', 'vendor-subscription-pass-through', 'Vendor subscription pass-through', 'Third-party subscription passed through with markup or management fee.', 'pass_through', 0, 0, 0, 0, 1, 'subscription', 'month', 1.00, 'Use selected pricing_vendor_plans and apply default vendor markup.', 10),
    ('infrastructure', 'manual-vendor-cost', 'Manual vendor cost', 'Manual cost for plugins, paid apps, SMS, WhatsApp, maps, stock media, or unknown vendor usage.', 'custom', 0, 0, 0, 0, 1, 'cost', 'custom', 1.00, 'Ask the estimator user for amount and billing interval.', 20)
) as i(
  category_slug, slug, name, description, pricing_model, min_price, base_price, max_price,
  internal_cost_basis, default_quantity, unit_label, billing_interval, complexity_weight,
  ai_prompt_hint, sort_order
)
join public.pricing_service_categories c on c.slug = i.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  pricing_model = excluded.pricing_model,
  min_price = excluded.min_price,
  base_price = excluded.base_price,
  max_price = excluded.max_price,
  internal_cost_basis = excluded.internal_cost_basis,
  default_quantity = excluded.default_quantity,
  unit_label = excluded.unit_label,
  billing_interval = excluded.billing_interval,
  complexity_weight = excluded.complexity_weight,
  ai_prompt_hint = excluded.ai_prompt_hint,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

insert into public.pricing_calculation_profiles (
  slug, name, currency, target_gross_margin_pct, default_vendor_markup_pct,
  contingency_pct, rush_markup_pct, tax_pct, minimum_project_fee, is_default, notes
)
values
  ('zatech-standard', 'ZAtech Standard Estimate', 'USD', 45, 15, 10, 20, 0, 500, true, 'Default margin model for normal client estimates.'),
  ('zatech-lean', 'ZAtech Lean / Friendly', 'USD', 35, 10, 7.5, 15, 0, 350, false, 'Use for small trusted clients, MVPs, or strategic deals.'),
  ('zatech-premium', 'ZAtech Premium / High Risk', 'USD', 55, 20, 15, 30, 0, 1000, false, 'Use for urgent, vague, enterprise, or high-risk projects.')
on conflict (slug) do update set
  name = excluded.name,
  currency = excluded.currency,
  target_gross_margin_pct = excluded.target_gross_margin_pct,
  default_vendor_markup_pct = excluded.default_vendor_markup_pct,
  contingency_pct = excluded.contingency_pct,
  rush_markup_pct = excluded.rush_markup_pct,
  tax_pct = excluded.tax_pct,
  minimum_project_fee = excluded.minimum_project_fee,
  is_default = excluded.is_default,
  notes = excluded.notes,
  updated_at = now();

insert into public.pricing_questions (
  slug, section, question_text, input_type, answer_key, required, help_text,
  default_value, display_rule, sort_order
)
values
  ('project-type', 'general', 'What are we pricing?', 'single_choice', 'project_type', true, 'Primary estimate path.', null, '{}'::jsonb, 10),
  ('budget-range', 'general', 'Does the client already have a budget range?', 'single_choice', 'budget_range', false, 'Used to detect fit and avoid under-scoping.', null, '{}'::jsonb, 20),
  ('deadline', 'general', 'How urgent is the deadline?', 'single_choice', 'deadline', true, 'Rush work can apply a multiplier.', '"normal"'::jsonb, '{}'::jsonb, 30),
  ('content-ready', 'general', 'Is the content ready?', 'single_choice', 'content_ready', true, 'Missing content adds copywriting/planning effort.', '"partial"'::jsonb, '{}'::jsonb, 40),
  ('platform-preference', 'platform', 'Preferred platform?', 'single_choice', 'platform', true, 'Chooses Wix, custom app stack, or undecided recommendation.', '"recommend"'::jsonb, '{}'::jsonb, 50),
  ('page-count', 'website', 'How many public pages?', 'number', 'page_count', false, 'Used for website page pricing.', '5'::jsonb, '{"project_type":["website","ecommerce"]}'::jsonb, 60),
  ('languages-count', 'website', 'How many languages?', 'number', 'languages_count', false, 'Multilingual builds multiply page/content work.', '1'::jsonb, '{"project_type":["website","ecommerce"]}'::jsonb, 70),
  ('needs-ecommerce', 'ecommerce', 'Will the client sell or accept payments online?', 'boolean', 'needs_ecommerce', false, 'Triggers ecommerce and payment setup.', 'false'::jsonb, '{}'::jsonb, 80),
  ('products-count', 'ecommerce', 'How many products or services need setup?', 'number', 'products_count', false, 'Used for product catalog import.', '0'::jsonb, '{"needs_ecommerce":true}'::jsonb, 90),
  ('needs-booking', 'ecommerce', 'Do they need booking, memberships, or subscriptions?', 'boolean', 'needs_booking', false, 'Adds booking/membership setup.', 'false'::jsonb, '{}'::jsonb, 100),
  ('users-count', 'app', 'How many staff/client users need accounts?', 'number', 'users_count', false, 'Used for SaaS seats, auth, and subscriptions.', '1'::jsonb, '{}'::jsonb, 110),
  ('needs-crm', 'crm', 'Do they need CRM setup or automation?', 'boolean', 'needs_crm', false, 'Triggers CRM/service workflow lines.', 'false'::jsonb, '{}'::jsonb, 120),
  ('workflows-count', 'crm', 'How many automation workflows?', 'number', 'workflows_count', false, 'Used for automation workflow line quantity.', '0'::jsonb, '{"needs_crm":true}'::jsonb, 130),
  ('integrations-count', 'app', 'How many third-party integrations?', 'number', 'integrations_count', false, 'Used for API integration quantity.', '0'::jsonb, '{}'::jsonb, 140),
  ('email-inboxes', 'infrastructure', 'How many business email inboxes?', 'number', 'email_inboxes', false, 'Used for Google Workspace, Microsoft 365, or Zoho Mail.', '0'::jsonb, '{}'::jsonb, 150),
  ('hosting-preference', 'infrastructure', 'Hosting/backend preference?', 'single_choice', 'hosting_preference', false, 'Chooses Wix hosting, Vercel/Supabase, client-owned, or undecided.', '"recommend"'::jsonb, '{}'::jsonb, 160),
  ('needs-ai-iris', 'ai', 'Should Iris/AI help inside the solution?', 'boolean', 'needs_ai_iris', false, 'Triggers AI assistant setup and monthly AI usage budget.', 'false'::jsonb, '{}'::jsonb, 170),
  ('expected-ai-chats', 'ai', 'Expected AI chats per month?', 'number', 'expected_ai_chats', false, 'Used for token/search cost estimate.', '500'::jsonb, '{"needs_ai_iris":true}'::jsonb, 180),
  ('social-platforms', 'social_media', 'Which social platforms are included?', 'multi_choice', 'social_platforms', false, 'Used to price account setup and management complexity.', '["instagram","facebook"]'::jsonb, '{"project_type":["social_media"]}'::jsonb, 190),
  ('social-package', 'social_media', 'What social media package level?', 'single_choice', 'social_package', false, 'Chooses a monthly package baseline.', '"basic"'::jsonb, '{"project_type":["social_media"]}'::jsonb, 200),
  ('posts-per-month', 'social_media', 'How many feed posts per month?', 'number', 'posts_per_month', false, 'Used for custom content or package sanity checks.', '8'::jsonb, '{"project_type":["social_media"]}'::jsonb, 210),
  ('reels-per-month', 'social_media', 'How many reels or short videos per month?', 'number', 'reels_per_month', false, 'Short videos are priced separately from static posts.', '2'::jsonb, '{"project_type":["social_media"]}'::jsonb, 220),
  ('story-sets-per-month', 'social_media', 'How many story sets per month?', 'number', 'story_sets_per_month', false, 'Used for story design/support volume.', '4'::jsonb, '{"project_type":["social_media"]}'::jsonb, 230),
  ('needs-community-management', 'social_media', 'Do they need comment/DM community management?', 'boolean', 'needs_community_management', false, 'Adds monthly community management.', 'false'::jsonb, '{"project_type":["social_media"]}'::jsonb, 240),
  ('needs-paid-ads', 'social_media', 'Do they need paid ads management?', 'boolean', 'needs_paid_ads', false, 'Adds ad setup, management, and ad budget lines.', 'false'::jsonb, '{"project_type":["social_media"]}'::jsonb, 250),
  ('monthly-ad-budget', 'social_media', 'What is the monthly ad spend budget?', 'number', 'monthly_ad_budget', false, 'Passed through or tracked separately from management fees.', '0'::jsonb, '{"needs_paid_ads":true}'::jsonb, 260),
  ('creative-readiness', 'social_media', 'Are photos/videos already available?', 'single_choice', 'creative_readiness', false, 'Missing creative can add content-day or production cost.', '"partial"'::jsonb, '{"project_type":["social_media"]}'::jsonb, 270),
  ('maintenance-level', 'maintenance', 'Ongoing support level?', 'single_choice', 'maintenance_level', false, 'Adds recurring care retainer.', '"basic"'::jsonb, '{}'::jsonb, 280)
on conflict (slug) do update set
  section = excluded.section,
  question_text = excluded.question_text,
  input_type = excluded.input_type,
  answer_key = excluded.answer_key,
  required = excluded.required,
  help_text = excluded.help_text,
  default_value = excluded.default_value,
  display_rule = excluded.display_rule,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

insert into public.pricing_question_options (
  question_id, label, value, price_delta, multiplier_delta, metadata, sort_order
)
select q.id, o.label, o.value, o.price_delta, o.multiplier_delta, o.metadata, o.sort_order
from (
  values
    ('project-type', 'Website', 'website', 0, 0, '{"recommended_services":["corporate-website-base","responsive-qa-launch"]}'::jsonb, 10),
    ('project-type', 'Ecommerce', 'ecommerce', 0, 0, '{"recommended_services":["corporate-website-base","ecommerce-setup","payment-shipping-config"]}'::jsonb, 20),
    ('project-type', 'Custom app / portal', 'web_app', 0, 0.15, '{"recommended_services":["custom-web-app-mvp","supabase-backend","auth-permissions"]}'::jsonb, 30),
    ('project-type', 'CRM / automation', 'crm_automation', 0, 0.05, '{"recommended_services":["zoho-crm-setup","automation-workflow"]}'::jsonb, 40),
    ('project-type', 'AI assistant', 'ai_data', 0, 0.10, '{"recommended_services":["iris-style-chat-assistant","ai-usage-budget"]}'::jsonb, 50),
    ('project-type', 'Social media / ads', 'social_media', 0, 0.05, '{"recommended_services":["social-media-strategy","social-content-calendar","social-media-management-basic"]}'::jsonb, 60),
    ('budget-range', 'Under $1,000', 'under_1000', 0, -0.10, '{}'::jsonb, 10),
    ('budget-range', '$1,000 - $3,000', '1000_3000', 0, 0, '{}'::jsonb, 20),
    ('budget-range', '$3,000 - $8,000', '3000_8000', 0, 0.05, '{}'::jsonb, 30),
    ('budget-range', '$8,000+', '8000_plus', 0, 0.10, '{}'::jsonb, 40),
    ('deadline', 'Normal', 'normal', 0, 0, '{}'::jsonb, 10),
    ('deadline', 'Soon', 'soon', 0, 0.10, '{}'::jsonb, 20),
    ('deadline', 'Urgent', 'urgent', 0, 0.20, '{}'::jsonb, 30),
    ('content-ready', 'Ready', 'ready', 0, 0, '{}'::jsonb, 10),
    ('content-ready', 'Partial', 'partial', 250, 0.05, '{}'::jsonb, 20),
    ('content-ready', 'Needs writing', 'needs_writing', 600, 0.10, '{"suggest_service":"copywriting-page"}'::jsonb, 30),
    ('platform-preference', 'Recommend best fit', 'recommend', 0, 0, '{}'::jsonb, 10),
    ('platform-preference', 'Wix / Velo', 'wix', 0, 0, '{"vendor":"wix"}'::jsonb, 20),
    ('platform-preference', 'Custom app stack', 'custom_stack', 0, 0.10, '{"vendors":["vercel","supabase"]}'::jsonb, 30),
    ('platform-preference', 'Client already has platform', 'client_owned', 0, 0, '{}'::jsonb, 40),
    ('hosting-preference', 'Recommend', 'recommend', 0, 0, '{}'::jsonb, 10),
    ('hosting-preference', 'Wix hosted', 'wix', 0, 0, '{"vendor":"wix"}'::jsonb, 20),
    ('hosting-preference', 'Vercel + Supabase', 'vercel_supabase', 0, 0, '{"vendors":["vercel","supabase"]}'::jsonb, 30),
    ('hosting-preference', 'Client-owned hosting', 'client_owned', 0, 0, '{}'::jsonb, 40),
    ('social-platforms', 'Instagram', 'instagram', 0, 0, '{"platform":"instagram"}'::jsonb, 10),
    ('social-platforms', 'Facebook', 'facebook', 0, 0, '{"platform":"facebook"}'::jsonb, 20),
    ('social-platforms', 'LinkedIn', 'linkedin', 0, 0.05, '{"platform":"linkedin"}'::jsonb, 30),
    ('social-platforms', 'TikTok', 'tiktok', 0, 0.10, '{"platform":"tiktok","video_heavy":true}'::jsonb, 40),
    ('social-platforms', 'YouTube Shorts', 'youtube_shorts', 0, 0.10, '{"platform":"youtube","video_heavy":true}'::jsonb, 50),
    ('social-platforms', 'Google Business Profile', 'google_business_profile', 0, 0, '{"platform":"google_business_profile"}'::jsonb, 60),
    ('social-platforms', 'X / Twitter', 'x_twitter', 0, 0.05, '{"platform":"x_twitter"}'::jsonb, 70),
    ('social-package', 'Basic management', 'basic', 0, 0, '{"service":"social-media-management-basic","typical_posts":8,"typical_reels":2}'::jsonb, 10),
    ('social-package', 'Growth management', 'growth', 0, 0.10, '{"service":"social-media-management-growth","typical_posts":12,"typical_reels":4}'::jsonb, 20),
    ('social-package', 'Premium management', 'premium', 0, 0.20, '{"service":"social-media-management-premium","typical_posts":20,"typical_reels":8}'::jsonb, 30),
    ('social-package', 'Custom content only', 'custom_content', 0, 0, '{"use_quantity_rules":true}'::jsonb, 40),
    ('creative-readiness', 'Ready', 'ready', 0, 0, '{}'::jsonb, 10),
    ('creative-readiness', 'Partial', 'partial', 150, 0.05, '{}'::jsonb, 20),
    ('creative-readiness', 'Needs production', 'needs_production', 500, 0.10, '{"suggest_service":"photoshoot-creative-direction"}'::jsonb, 30),
    ('maintenance-level', 'None', 'none', 0, 0, '{}'::jsonb, 10),
    ('maintenance-level', 'Basic care', 'basic', 0, 0, '{"service":"website-care-basic"}'::jsonb, 20),
    ('maintenance-level', 'Growth care', 'growth', 0, 0, '{"service":"website-care-growth"}'::jsonb, 30),
    ('maintenance-level', 'App care', 'app', 0, 0, '{"service":"app-care"}'::jsonb, 40)
) as o(question_slug, label, value, price_delta, multiplier_delta, metadata, sort_order)
join public.pricing_questions q on q.slug = o.question_slug
on conflict (question_id, value) do update set
  label = excluded.label,
  price_delta = excluded.price_delta,
  multiplier_delta = excluded.multiplier_delta,
  metadata = excluded.metadata,
  sort_order = excluded.sort_order,
  active = true;

insert into public.pricing_formula_rules (slug, name, rule_type, applies_to, rule, sort_order)
values
  ('page-count-additional-pages', 'Additional page pricing after five included pages', 'line_generator', 'website', '{"answer_key":"page_count","included":5,"service_slug":"additional-page","quantity_formula":"max(page_count - 5, 0)"}'::jsonb, 10),
  ('multilingual-page-multiplier', 'Extra language page/content multiplier', 'modifier', 'website', '{"answer_key":"languages_count","formula":"languages_count > 1 ? 1 + ((languages_count - 1) * 0.45) : 1"}'::jsonb, 20),
  ('rush-deadline-multiplier', 'Rush deadline multiplier', 'modifier', 'estimate', '{"answer_key":"deadline","values":{"normal":0,"soon":0.10,"urgent":0.20}}'::jsonb, 30),
  ('product-import-quantity', 'Product catalog import quantity', 'line_generator', 'ecommerce', '{"answer_key":"products_count","service_slug":"product-catalog-import","quantity_formula":"products_count"}'::jsonb, 40),
  ('automation-workflow-quantity', 'Automation workflow quantity', 'line_generator', 'crm_automation', '{"answer_key":"workflows_count","service_slug":"automation-workflow","quantity_formula":"workflows_count"}'::jsonb, 50),
  ('api-integration-quantity', 'API integration quantity', 'line_generator', 'web_app', '{"answer_key":"integrations_count","service_slug":"api-integration","quantity_formula":"integrations_count"}'::jsonb, 60),
  ('email-seat-vendor-lines', 'Business email vendor seat lines', 'line_generator', 'infrastructure', '{"answer_key":"email_inboxes","recommended_vendor_plans":["google-workspace:business-starter-annual","google-workspace:business-standard-annual","zoho-mail:mail-lite-annual","microsoft-365:business-basic-annual"]}'::jsonb, 70),
  ('ai-usage-budget-small', 'AI usage budget recommendation', 'recommendation', 'ai_data', '{"answer_key":"expected_ai_chats","tiers":[{"max":500,"monthly_budget":25},{"max":2500,"monthly_budget":75},{"max":10000,"monthly_budget":200},{"max":999999,"monthly_budget":500}]}'::jsonb, 80),
  ('social-platform-setup-quantity', 'Social platform setup quantity', 'line_generator', 'social_media', '{"answer_key":"social_platforms","service_slug":"social-media-account-setup","quantity_formula":"array_length(social_platforms)"}'::jsonb, 90),
  ('social-package-service', 'Social package service selector', 'line_generator', 'social_media', '{"answer_key":"social_package","values":{"basic":"social-media-management-basic","growth":"social-media-management-growth","premium":"social-media-management-premium","custom_content":null}}'::jsonb, 100),
  ('social-posts-quantity', 'Social feed post quantity', 'line_generator', 'social_media', '{"answer_key":"posts_per_month","service_slug":"social-post-design","quantity_formula":"posts_per_month","only_when":{"social_package":"custom_content"}}'::jsonb, 110),
  ('social-reels-quantity', 'Social reels quantity', 'line_generator', 'social_media', '{"answer_key":"reels_per_month","service_slug":"social-reel-short-video","quantity_formula":"reels_per_month","only_when":{"social_package":"custom_content"}}'::jsonb, 120),
  ('social-story-sets-quantity', 'Social story set quantity', 'line_generator', 'social_media', '{"answer_key":"story_sets_per_month","service_slug":"social-story-set","quantity_formula":"story_sets_per_month","only_when":{"social_package":"custom_content"}}'::jsonb, 130),
  ('social-community-management', 'Social community management add-on', 'line_generator', 'social_media', '{"answer_key":"needs_community_management","service_slug":"community-management-basic","quantity_formula":"needs_community_management ? 1 : 0"}'::jsonb, 140),
  ('social-paid-ads-setup', 'Paid ads setup add-on', 'line_generator', 'social_media', '{"answer_key":"needs_paid_ads","service_slug":"paid-ads-setup","quantity_formula":"needs_paid_ads ? 1 : 0"}'::jsonb, 150),
  ('social-paid-ads-management', 'Paid ads management add-on', 'line_generator', 'social_media', '{"answer_key":"needs_paid_ads","service_slug":"paid-ads-management","quantity_formula":"needs_paid_ads ? 1 : 0"}'::jsonb, 160),
  ('social-paid-ad-budget', 'Paid ad budget pass-through', 'line_generator', 'social_media', '{"answer_key":"monthly_ad_budget","service_slug":"paid-ad-budget-pass-through","quantity_formula":"monthly_ad_budget","unit_price_from_answer":true,"billing_interval":"month"}'::jsonb, 170),
  ('social-creative-production', 'Social creative production add-on', 'line_generator', 'social_media', '{"answer_key":"creative_readiness","values":{"ready":null,"partial":null,"needs_production":"photoshoot-creative-direction"}}'::jsonb, 180),
  ('minimum-project-fee', 'Minimum project fee guardrail', 'validation', 'estimate', '{"use_profile_minimum_project_fee":true}'::jsonb, 190)
on conflict (slug) do update set
  name = excluded.name,
  rule_type = excluded.rule_type,
  applies_to = excluded.applies_to,
  rule = excluded.rule,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

insert into public.pricing_service_components (
  parent_service_item_id, component_kind, vendor_plan_id, service_item_id, label,
  quantity_default, quantity_unit, unit_cost_override, markup_pct, pass_through,
  required_by_default, condition, notes
)
select
  parent.id,
  c.component_kind,
  plan.id,
  child.id,
  c.label,
  c.quantity_default::numeric,
  c.quantity_unit,
  c.unit_cost_override::numeric,
  c.markup_pct::numeric,
  c.pass_through,
  c.required_by_default,
  c.condition,
  c.notes
from (
  values
    ('corporate-website-base', 'service_item', null, 'responsive-qa-launch', 'Launch QA included in website builds', 1, 'launch', null, 0, false, true, '{}'::jsonb, 'Most website estimates should include QA/launch.'),
    ('ecommerce-setup', 'service_item', null, 'payment-shipping-config', 'Payment/shipping configuration', 1, 'setup', null, 0, false, true, '{}'::jsonb, 'Common ecommerce dependency.'),
    ('custom-web-app-mvp', 'service_item', null, 'supabase-backend', 'Supabase backend foundation', 1, 'backend', null, 0, false, true, '{}'::jsonb, 'Most custom apps need a backend.'),
    ('custom-web-app-mvp', 'service_item', null, 'auth-permissions', 'Authentication and permissions', 1, 'module', null, 0, false, true, '{}'::jsonb, 'Most custom apps need auth.'),
    ('custom-web-app-mvp', 'vendor_plan', 'supabase:pro', null, 'Supabase Pro subscription', 1, 'org', null, 15, true, false, '{"hosting_preference":"vercel_supabase"}'::jsonb, 'Recurring vendor pass-through candidate.'),
    ('custom-web-app-mvp', 'vendor_plan', 'vercel:pro-seat', null, 'Vercel Pro developer seat', 1, 'seat', null, 15, true, false, '{"hosting_preference":"vercel_supabase"}'::jsonb, 'Recurring vendor pass-through candidate.'),
    ('iris-style-chat-assistant', 'vendor_plan', 'openai:gpt-5-4-mini', null, 'OpenAI GPT-5.4 mini usage', 1, 'usage bucket', null, 20, true, false, '{}'::jsonb, 'Use expected usage to estimate monthly cost.'),
    ('zoho-crm-setup', 'vendor_plan', 'zoho-crm:standard-annual', null, 'Zoho CRM seats', 1, 'user', null, 15, true, false, '{"needs_crm":true}'::jsonb, 'Default CRM plan recommendation; upgrade to Professional when inventory, CPQ, or blueprints are needed.')
) as c(
  parent_slug, component_kind, vendor_plan_ref, child_service_slug, label,
  quantity_default, quantity_unit, unit_cost_override, markup_pct, pass_through,
  required_by_default, condition, notes
)
join public.pricing_service_items parent on parent.slug = c.parent_slug
left join public.pricing_service_items child on child.slug = c.child_service_slug
left join public.pricing_vendor_plans plan on
  c.vendor_plan_ref is not null
  and plan.slug = split_part(c.vendor_plan_ref, ':', 2)
  and plan.vendor_id = (
    select id from public.pricing_vendors where slug = split_part(c.vendor_plan_ref, ':', 1)
  )
where not exists (
  select 1
  from public.pricing_service_components existing
  where existing.parent_service_item_id = parent.id
    and existing.label = c.label
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'pricing_sources',
    'pricing_vendors',
    'pricing_vendor_plans',
    'pricing_service_categories',
    'pricing_service_items',
    'pricing_service_components',
    'pricing_calculation_profiles',
    'pricing_questions',
    'pricing_question_options',
    'pricing_formula_rules',
    'pricing_estimates',
    'pricing_estimate_answers',
    'pricing_estimate_lines',
    'pricing_estimate_snapshots'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Portal users can read %s" on public.%I', t, t);
    execute format('create policy "Portal users can read %s" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('drop policy if exists "Portal users can insert %s" on public.%I', t, t);
    execute format('create policy "Portal users can insert %s" on public.%I for insert to anon, authenticated with check (true)', t, t);
    execute format('drop policy if exists "Portal users can update %s" on public.%I', t, t);
    execute format('create policy "Portal users can update %s" on public.%I for update to anon, authenticated using (true) with check (true)', t, t);
    execute format('drop policy if exists "Portal users can delete %s" on public.%I', t, t);
    execute format('create policy "Portal users can delete %s" on public.%I for delete to anon, authenticated using (true)', t, t);
  end loop;
end $$;
