create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  storage_key text not null unique,
  file_id text not null,
  file_name text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  content_type text not null default 'application/octet-stream',
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists project_files_project_id_idx
  on public.project_files(project_id);

create index if not exists project_files_uploaded_at_idx
  on public.project_files(uploaded_at desc);

alter table public.project_files enable row level security;

drop policy if exists "Portal users can read project files" on public.project_files;
create policy "Portal users can read project files"
  on public.project_files
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Portal users can insert project files" on public.project_files;
create policy "Portal users can insert project files"
  on public.project_files
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Portal users can delete project files" on public.project_files;
create policy "Portal users can delete project files"
  on public.project_files
  for delete
  to anon, authenticated
  using (true);
