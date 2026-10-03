-- =============================================================================
-- Tickwise · capa de plataforma (white-label multi-tenant)
-- Introduce el "super admin" de plataforma: el operador que crea y administra
-- TODAS las organizaciones, por encima de la membresía de cada org.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- platform_admins: operadores de Tickwise (super admins globales).
-- No cuelga de ninguna org: son dueños de la plataforma.
-- El primer admin se crea por service role / SQL (bootstrap).
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- Helper: ¿el usuario actual es super admin de plataforma?
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- White-label: branding/tenant por organización.
-- slug sirve para ruteo por subdominio (p.ej. acme.tickwise.io).
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column slug          text unique,
  add column primary_color text,          -- color de acento del tenant
  add column support_email text;

-- -----------------------------------------------------------------------------
-- RLS para platform_admins: sólo los super admins se ven entre sí.
-- (altas/bajas vía service role).
-- -----------------------------------------------------------------------------
alter table public.platform_admins enable row level security;

create policy "platform admins read admins"
  on public.platform_admins for select
  using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Políticas de super admin sobre todas las tablas de negocio.
-- En Postgres las policies PERMISSIVE se combinan con OR, así que esto SUMA
-- acceso total al super admin sin tocar las policies por-organización.
-- -----------------------------------------------------------------------------
create policy "platform full access orgs" on public.organizations
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access members" on public.org_members
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access sources" on public.sources
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access recipients" on public.recipients
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access schedules" on public.cron_schedules
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access noise_rules" on public.noise_rules
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access guidelines" on public.materiality_guidelines
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access runs" on public.cron_runs
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform full access feed" on public.feed_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- RPC: create_organization
-- El super admin crea una organización y define su owner inicial (como invite
-- pendiente). El trigger seed_org_defaults ya carga noise_rules + rúbrica.
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  _name        text,
  _slug        text,
  _owner_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'only platform admins can create organizations';
  end if;

  insert into public.organizations (name, slug)
  values (_name, _slug)
  returning id into v_org;

  -- Owner inicial como invitación pendiente (se activa al registrarse)
  insert into public.org_members (org_id, email, role, status, invited_by)
  values (v_org, _owner_email, 'owner', 'pending', auth.uid());

  return v_org;
end;
$$;

-- Sólo usuarios autenticados pueden invocar (adentro valida super admin)
revoke all on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;
