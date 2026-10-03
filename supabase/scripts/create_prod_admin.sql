-- =============================================================================
-- Tickwise · bootstrap del super admin en PROD
-- Crea (de forma idempotente) el usuario admin@tickwise.io en auth y lo marca
-- como super admin de plataforma (platform_admins).
--
-- Cómo correrlo:
--   * Dashboard de prod → SQL Editor → pegar y ejecutar, o
--   * psql "$PROD_DB_URL" -f supabase/scripts/create_prod_admin.sql
--
-- Requisito: las migraciones ya aplicadas en prod (`supabase db push`), que
-- crean la tabla platform_admins y la extensión pgcrypto.
-- =============================================================================

do $$
declare
  v_email    text := 'admin@tickwise.io';
  v_password text := 'admin@tickwise.io'; -- << CAMBIALO por un password seguro
  v_name     text := 'Tickwise Admin';
  v_id       uuid;
begin
  -- ¿Ya existe el usuario en auth?
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name),
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );

    raise notice 'Usuario % creado (id=%)', v_email, v_id;
  else
    raise notice 'Usuario % ya existía (id=%)', v_email, v_id;
  end if;

  -- Marcarlo como super admin de plataforma (idempotente)
  insert into public.platform_admins (user_id, note)
  values (v_id, 'bootstrap prod admin')
  on conflict (user_id) do nothing;
end $$;
