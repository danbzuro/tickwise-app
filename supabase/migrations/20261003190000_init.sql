-- =============================================================================
-- Tickwise · esquema inicial
-- Modelo multi-tenant: todo cuelga de una organización (org_id).
-- Pensado para Supabase (Postgres + auth.users + RLS).
-- =============================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------

-- Nivel de materialidad de una noticia
create type public.materiality as enum ('material', 'potentially', 'noteworthy');

-- Rol de un miembro dentro de la organización
create type public.member_role as enum ('owner', 'admin', 'member');

-- Estado de un miembro (activo o invitación pendiente)
create type public.member_status as enum ('active', 'pending');

-- Categoría de la noticia
create type public.feed_category as enum (
  'Earnings', 'Product', 'M&A', 'Regulation', 'Market'
);

-- Estado de una corrida del cron
create type public.cron_run_status as enum ('running', 'success', 'error');

-- -----------------------------------------------------------------------------
-- Helper: actualiza updated_at en cada UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- org_members: vincula auth.users con una organización (+ invites pendientes)
-- user_id es null mientras la invitación no fue aceptada.
-- -----------------------------------------------------------------------------
create table public.org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  email      text not null,
  name       text,
  role       public.member_role not null default 'member',
  status     public.member_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);

create index idx_org_members_org on public.org_members(org_id);
create index idx_org_members_user on public.org_members(user_id);

create trigger trg_org_members_updated_at
  before update on public.org_members
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- sources: fuentes que scrapea el cron
-- -----------------------------------------------------------------------------
create table public.sources (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null,
  tick       text not null,
  url        text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, url)
);

create index idx_sources_org on public.sources(org_id);
create index idx_sources_tick on public.sources(org_id, tick);

create trigger trg_sources_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- recipients: lista global de emails que reciben el feed en cada corrida
-- -----------------------------------------------------------------------------
create table public.recipients (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index idx_recipients_org on public.recipients(org_id);

-- -----------------------------------------------------------------------------
-- cron_schedules: slots horarios en los que corre el cron
-- -----------------------------------------------------------------------------
create table public.cron_schedules (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  run_time   time not null,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, run_time)
);

create index idx_cron_schedules_org on public.cron_schedules(org_id);

create trigger trg_cron_schedules_updated_at
  before update on public.cron_schedules
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- noise_rules: reglas globales de ruido (1:1 con la organización)
-- max_lookback_hours null = "Since last run" (la ventana la definen los slots)
-- -----------------------------------------------------------------------------
create table public.noise_rules (
  org_id             uuid primary key references public.organizations(id) on delete cascade,
  exclude_terms      text[] not null default '{}',
  exclude_domains    text[] not null default '{}',
  max_lookback_hours integer,
  min_materiality    public.materiality not null default 'potentially',
  updated_at         timestamptz not null default now(),
  constraint chk_lookback_positive
    check (max_lookback_hours is null or max_lookback_hours > 0)
);

create trigger trg_noise_rules_updated_at
  before update on public.noise_rules
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- materiality_guidelines: rúbrica (markdown) por nivel, contexto para el agente
-- -----------------------------------------------------------------------------
create table public.materiality_guidelines (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  level      public.materiality not null,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  primary key (org_id, level)
);

create trigger trg_materiality_guidelines_updated_at
  before update on public.materiality_guidelines
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- cron_runs: historial de corridas (alimenta el "last scrape" del topbar)
-- -----------------------------------------------------------------------------
create table public.cron_runs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  schedule_id uuid references public.cron_schedules(id) on delete set null,
  status      public.cron_run_status not null default 'running',
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  items_found integer not null default 0,
  items_kept  integer not null default 0
);

create index idx_cron_runs_org on public.cron_runs(org_id, started_at desc);

-- -----------------------------------------------------------------------------
-- feed_items: noticias recopiladas. "screened" marca el ruido filtrado.
-- -----------------------------------------------------------------------------
create table public.feed_items (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  source_id       uuid references public.sources(id) on delete set null,
  run_id          uuid references public.cron_runs(id) on delete set null,
  tick            text not null,
  title           text not null,
  summary         text,
  content         text,
  why_it_matters  text,
  url             text not null,
  published_at    timestamptz not null,
  category        public.feed_category not null,
  materiality     public.materiality not null,
  screened        boolean not null default false,
  screened_reason text,
  created_at      timestamptz not null default now(),
  unique (org_id, url)
);

create index idx_feed_items_org_published on public.feed_items(org_id, published_at desc);
create index idx_feed_items_tick on public.feed_items(org_id, tick);
create index idx_feed_items_screened on public.feed_items(org_id, screened);

-- -----------------------------------------------------------------------------
-- Seed automático al crear una organización:
-- crea las noise_rules y la rúbrica de materialidad por defecto.
-- -----------------------------------------------------------------------------
create or replace function public.seed_org_defaults()
returns trigger
language plpgsql
as $$
begin
  insert into public.noise_rules (org_id) values (new.id);

  insert into public.materiality_guidelines (org_id, level, content) values
    (new.id, 'material',
      '# Material' || chr(10) ||
      'Events that can move valuation or estimates (earnings, M&A, guidance, major legal/regulatory actions, C-suite changes).'),
    (new.id, 'potentially',
      '# Potentially material' || chr(10) ||
      'Could matter but needs confirmation or has unclear magnitude (rumors, early partnerships, capex, product launches).'),
    (new.id, 'noteworthy',
      '# Noteworthy' || chr(10) ||
      'Minor but relevant color. Keep for context, not action (routine PR, small operational notes, re-packaged announcements).');

  return new;
end;
$$;

create trigger trg_organizations_seed_defaults
  after insert on public.organizations
  for each row execute function public.seed_org_defaults();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Helper: ¿el usuario actual es miembro activo de la organización?
-- SECURITY DEFINER evita recursión de RLS al consultar org_members.
create or replace function public.is_org_member(_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = _org
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- Helper: ¿el usuario actual es owner/admin de la organización?
create or replace function public.is_org_admin(_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = _org
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

-- Activar RLS en todas las tablas
alter table public.organizations          enable row level security;
alter table public.org_members            enable row level security;
alter table public.sources                enable row level security;
alter table public.recipients             enable row level security;
alter table public.cron_schedules         enable row level security;
alter table public.noise_rules            enable row level security;
alter table public.materiality_guidelines enable row level security;
alter table public.cron_runs              enable row level security;
alter table public.feed_items             enable row level security;

-- organizations: los miembros ven su org; sólo admins la editan
create policy "org members can read org"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "org admins can update org"
  on public.organizations for update
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- org_members: miembros leen el roster; admins lo gestionan
create policy "members can read roster"
  on public.org_members for select
  using (public.is_org_member(org_id));

create policy "admins can manage roster"
  on public.org_members for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- Resto de tablas scopeadas por org_id:
-- lectura para miembros, escritura para admins.
-- (sources)
create policy "members read sources" on public.sources
  for select using (public.is_org_member(org_id));
create policy "admins write sources" on public.sources
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- (recipients)
create policy "members read recipients" on public.recipients
  for select using (public.is_org_member(org_id));
create policy "admins write recipients" on public.recipients
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- (cron_schedules)
create policy "members read schedules" on public.cron_schedules
  for select using (public.is_org_member(org_id));
create policy "admins write schedules" on public.cron_schedules
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- (noise_rules)
create policy "members read noise_rules" on public.noise_rules
  for select using (public.is_org_member(org_id));
create policy "admins write noise_rules" on public.noise_rules
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- (materiality_guidelines)
create policy "members read guidelines" on public.materiality_guidelines
  for select using (public.is_org_member(org_id));
create policy "admins write guidelines" on public.materiality_guidelines
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

-- (cron_runs) — escritas por el backend (service role bypassa RLS)
create policy "members read runs" on public.cron_runs
  for select using (public.is_org_member(org_id));

-- (feed_items) — escritas por el backend (service role bypassa RLS)
create policy "members read feed" on public.feed_items
  for select using (public.is_org_member(org_id));
