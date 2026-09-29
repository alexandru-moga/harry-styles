create table public.feedings (
  id uuid primary key default gen_random_uuid(),
  feeder_name text not null,
  fed_date date not null unique,
  fed_at timestamptz not null default now()
);

grant select, insert on public.feedings to anon;
grant all on public.feedings to service_role;

alter table public.feedings enable row level security;

create policy "Anyone can view feeding history"
  on public.feedings for select
  to anon
  using (true);

create policy "Anyone can record a feeding"
  on public.feedings for insert
  to anon
  with check (true);