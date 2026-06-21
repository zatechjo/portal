# Pricing Estimate Feature Prep

Prepared on 2026-05-14 for a future client estimate/pricing page. No UI was designed in this pass.

## What Was Added

Added `supabase/pricing_estimates.sql`.

This file creates the pricing data layer for a guided estimate tool:

- `pricing_sources`: source URLs and fetch dates for vendor pricing.
- `pricing_vendors`: Wix, Google Workspace, Vercel, Supabase, Zoom, Zoho, OpenAI, Stripe, PayPal, Calendly, Notion, Microsoft 365, Slack, Adobe, Claude/Anthropic, GoDaddy, HostGator, Foxrig, Namecheap, SendGrid, Cloudflare, and a manual vendor bucket.
- `pricing_vendor_plans`: seeded subscription and usage prices.
- `pricing_service_categories`: ZAtech service groupings.
- `pricing_service_items`: internal service catalog and price ranges, including websites, custom apps, CRM, AI, social media, ads, retainers, and vendor pass-throughs.
- `pricing_service_components`: relationships between internal services and likely vendor pass-through costs.
- `pricing_questions` and `pricing_question_options`: starter question flow for the estimate wizard.
- `pricing_formula_rules`: JSON rules for page count, product count, language count, rush fees, AI usage, email seats, integrations, social platform/content/ad criteria, and minimum fee guardrails.
- `pricing_calculation_profiles`: standard, lean, and premium margin profiles.
- `pricing_estimates`, `pricing_estimate_answers`, `pricing_estimate_lines`, `pricing_estimate_snapshots`: tables for saved estimate drafts and final snapshots.
- Views:
  - `pricing_vendor_plan_monthly_costs`
  - `pricing_service_catalog`

The SQL follows the current repo convention of standalone files inside `supabase/`, similar to `invoice_notes.sql`, `invoice_payments.sql`, and `project_files.sql`.

## Important Caveat

I prepared the Supabase SQL file but did not apply it to the live Supabase project from here. The repo does not contain a Supabase migration config or service-role SQL execution setup. Run `supabase/pricing_estimates.sql` in the Supabase SQL editor, or convert it into migrations later.

RLS is intentionally permissive (`anon, authenticated`) to match the existing portal pattern. Before exposing this to public clients, tighten RLS or route writes through an authenticated/server-side function.

## Pricing Data Sources

Fetched/checked on 2026-05-14:

- Wix Premium plans: https://www.wix.com/blog/wix-premium-plans
- Google Workspace business editions: https://support.google.com/a/answer/13062337
- Vercel pricing: https://vercel.com/pricing
- Supabase pricing: https://supabase.com/pricing
- Zoom Workplace plans: https://www.zoom.com/en/products/collaboration-tools/ and https://zoom.us/pricing
- Zoho Mail/Workplace: https://www.zoho.com/mail/zohomail-pricing.html
- Zoho CRM USD comparison PDF: https://www.zoho.com/sites/default/files/crm/zohocrm-edition-comparison-usd.pdf
- Zoho Books pricing: https://www.zoho.com/books/pricing/
- OpenAI API pricing: https://openai.com/api/pricing/
- Stripe US pricing: https://stripe.com/us/pricing
- PayPal US business pricing: https://www.paypal.com/us/business/pricing
- Calendly pricing: https://calendly.com/pricing/
- Notion pricing: https://www.notion.com/pricing
- Microsoft 365 business plans: https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing
- Slack pricing: https://slack.com/pricing
- Namecheap domains: https://www.namecheap.com/domains/
- Twilio SendGrid pricing PDF: https://www.twilio.com/content/dam/sendgrid/global/en/other/sendgrid-pricing/twi121--sendgrid-pricing-pdf-st1.pdf
- Cloudflare plans: https://www.cloudflare.com/plans/
- Existing ZAtech portal expenses: `supabase://public.expenses` read-only snapshot on 2026-05-14

Some vendors have region-sensitive or checkout-hidden numbers. Rows that need final quote verification are marked with `confidence = 'medium'` or `needs_verification`, especially Zoom, Slack, Cloudflare, Namecheap/domain renewals, manual vendor costs, and any custom enterprise plan.

The read-only portal expense snapshot confirmed actual historical costs for Adobe, Claude, GoDaddy domains, HostGator email, Foxrig domains, Wix domains/email/hosting, Google email, Supabase hosting, Vercel hosting, Zoho email, Zoom subscriptions, and OpenAI API top-ups. These were added as observed baseline rows where useful. Treat observed rows as internal reference points, not guaranteed vendor list prices.

## Suggested Estimate Flow

1. Ask questions from `pricing_questions` ordered by `sort_order`.
2. Use `project_type`, `platform`, and feature answers to select default `pricing_service_items`.
3. Apply `pricing_formula_rules`:
   - extra pages after 5 pages
   - multilingual multiplier
   - products count
   - automation workflow count
   - API integration count
   - rush multiplier
   - email seat vendor lines
   - AI monthly usage budget
   - social platform setup count
   - social package selection
   - monthly post/reel/story quantities
   - community management
   - paid ads setup/management
   - monthly ad budget pass-through
4. Add vendor lines from `pricing_vendor_plans` as recurring pass-throughs.
5. Apply a profile from `pricing_calculation_profiles`.
6. Save:
   - raw answers in `pricing_estimate_answers`
   - computed lines in `pricing_estimate_lines`
   - totals in `pricing_estimates`
   - final frozen quote JSON in `pricing_estimate_snapshots`

## Iris Notes

Iris currently has read-only tools for portal tables. For this feature, the clean next step is to add read tools to the Iris edge function:

- `get_pricing_catalog`
- `get_vendor_pricing`
- `explain_estimate`

I would keep estimate creation in the page JavaScript first, then let Iris explain or sanity-check estimates from saved rows. If Iris should generate draft estimates later, add a server-side write path instead of letting the chat function mutate data directly.

## Starter Internal Price Catalog

The SQL seeds price ranges for:

- Discovery and estimate strategy
- Landing pages
- Corporate websites
- Additional pages
- Blog/CMS setup
- Wix Velo custom features
- Ecommerce setup
- Product import
- Payment/shipping setup
- Booking/membership setup
- Custom web app MVPs
- Dashboard/client portals
- Supabase backend setup
- Auth and permissions
- Admin panels
- API integrations
- Zoho CRM setup/customization
- Automation workflows
- Data migration
- Iris-style AI assistants
- AI knowledge bases
- AI usage budget
- Copywriting
- Basic SEO
- Analytics/tracking
- Social media strategy
- Social account setup/cleanup
- Monthly content calendar
- Static post design
- Carousel design
- Reel/short video editing
- Story sets
- Basic/growth/premium social media management packages
- Community management
- Paid ads setup
- Paid ads monthly management
- Paid ad budget pass-through
- Social reporting
- Photoshoot/content-day creative direction
- Website care retainers
- App care retainers
- Hosting/vendor management
- Manual vendor pass-through costs

These are starter numbers, not final business policy. Opus should design the tool so Ahmad can edit catalog rows from Supabase without changing code.

## Website and Social Media Coverage

Website pricing is already modeled through:

- project type: `website` or `ecommerce`
- page count: `page_count`
- language count: `languages_count`
- platform preference: Wix/Velo, custom stack, client-owned, or recommendation
- ecommerce, booking, CMS, Velo custom features, SEO, analytics, copywriting, hosting/email/domain pass-throughs

Social media was added as its own project type: `social_media`.

The estimate tool should ask:

- platforms: Instagram, Facebook, LinkedIn, TikTok, YouTube Shorts, Google Business Profile, X/Twitter
- package: basic, growth, premium, or custom content only
- posts per month
- reels per month
- story sets per month
- whether community management is needed
- whether paid ads are needed
- monthly ad budget
- creative readiness: ready, partial, or needs production

For social estimates, use package pricing when the user chooses basic/growth/premium. Use quantity pricing when the user chooses custom content only. Paid ad spend should be shown separately as a recurring pass-through line, with ZAtech's ad management fee separate from the ad budget.
