-- =============================================================================
-- Tickwise · CRUD de organizaciones para el super admin de plataforma
-- Mejora el RPC create_organization para el panel de super admin:
--   * slug y owner opcionales (el slug se autogenera a partir del nombre)
--   * garantiza unicidad del slug
-- El borrado en cascada ya está cubierto a nivel de FK: todas las tablas de
-- negocio referencian organizations(id) ON DELETE CASCADE, por lo que un
-- simple DELETE sobre organizations elimina members, sources, recipients,
-- schedules, noise_rules, guidelines, cron_runs y feed_items del tenant.
-- El super admin puede borrar/editar vía las policies "platform full access".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: genera un slug url-safe a partir de un texto libre.
-- -----------------------------------------------------------------------------
create or replace function public.slugify(_text text)
returns text
language sql
immutable
as $$
  -- minúsculas, reemplaza todo lo no alfanumérico por "-" y recorta guiones
  select trim(both '-' from regexp_replace(lower(coalesce(_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- -----------------------------------------------------------------------------
-- RPC: create_organization (reemplaza la versión anterior)
-- _slug / _owner_email ahora son opcionales. Si no hay slug, se deriva del
-- nombre y se asegura su unicidad. Si hay owner_email, se crea el invite owner.
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  _name        text,
  _slug        text default null,
  _owner_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  uuid;
  v_base text;
  v_slug text;
begin
  if not public.is_platform_admin() then
    raise exception 'only platform admins can create organizations';
  end if;

  if coalesce(trim(_name), '') = '' then
    raise exception 'organization name is required';
  end if;

  -- Base del slug: el provisto o el derivado del nombre; fallback 'org'
  v_base := public.slugify(coalesce(nullif(trim(_slug), ''), _name));
  if v_base = '' then
    v_base := 'org';
  end if;

  -- Asegura unicidad del slug agregando un sufijo corto ante colisiones
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_slug := v_base || '-' || substr(gen_random_uuid()::text, 1, 4);
  end loop;

  insert into public.organizations (name, slug)
  values (trim(_name), v_slug)
  returning id into v_org;

  -- Owner inicial como invitación pendiente (opcional)
  if coalesce(trim(_owner_email), '') <> '' then
    insert into public.org_members (org_id, email, role, status, invited_by)
    values (v_org, lower(trim(_owner_email)), 'owner', 'pending', auth.uid());
  end if;

  return v_org;
end;
$$;

revoke all on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;
