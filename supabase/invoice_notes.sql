create table if not exists public.invoice_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists invoice_notes_invoice_id_idx
  on public.invoice_notes(invoice_id);

create index if not exists invoice_notes_created_at_idx
  on public.invoice_notes(created_at);

alter table public.invoice_notes enable row level security;

drop policy if exists "Authenticated users can read invoice notes" on public.invoice_notes;
create policy "Authenticated users can read invoice notes"
  on public.invoice_notes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert invoice notes" on public.invoice_notes;
create policy "Authenticated users can insert invoice notes"
  on public.invoice_notes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can update invoice notes" on public.invoice_notes;
create policy "Authenticated users can update invoice notes"
  on public.invoice_notes
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete invoice notes" on public.invoice_notes;
create policy "Authenticated users can delete invoice notes"
  on public.invoice_notes
  for delete
  to anon, authenticated
  using (true);

insert into public.invoice_notes (invoice_id, body)
select i.id::text, i.note
from public.invoices i
where i.note is not null
  and btrim(i.note) <> ''
  and not exists (
    select 1
    from public.invoice_notes n
    where n.invoice_id = i.id::text
      and n.body = i.note
  );
