create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists invoice_payments_invoice_id_idx
  on public.invoice_payments(invoice_id);

create index if not exists invoice_payments_payment_date_idx
  on public.invoice_payments(payment_date);

alter table public.invoice_payments enable row level security;

drop policy if exists "Authenticated users can read invoice payments" on public.invoice_payments;
create policy "Authenticated users can read invoice payments"
  on public.invoice_payments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert invoice payments" on public.invoice_payments;
create policy "Authenticated users can insert invoice payments"
  on public.invoice_payments
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can update invoice payments" on public.invoice_payments;
create policy "Authenticated users can update invoice payments"
  on public.invoice_payments
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete invoice payments" on public.invoice_payments;
create policy "Authenticated users can delete invoice payments"
  on public.invoice_payments
  for delete
  to anon, authenticated
  using (true);
