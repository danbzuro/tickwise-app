-- =============================================================================
-- Tickwise · seeder local
-- Crea data lista para desarrollar: usuarios reales de auth (logueables),
-- un super admin de plataforma y DOS organizaciones (tenants) para probar
-- el aislamiento multi-tenant.
--
-- Credenciales: todos los usuarios tienen password "password".
--   Super admin    : admin@tickwise.io  (opera la plataforma, ve todas las orgs)
--   Organization 1 : dan@tickwise.io (owner) · maria@tickwise.io (admin) · james@tickwise.io
--   Organization 2 : sam@tickwise.io (owner) · alex@tickwise.io
--
-- Se ejecuta solo con `supabase db reset`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper temporal: crea un usuario en auth (users + identities) y devuelve su id.
-- -----------------------------------------------------------------------------
create or replace function public.seed_user(
  _email    text,
  _password text,
  _name     text
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    _email, crypt(_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', _name),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_id::text, v_id,
    jsonb_build_object('sub', v_id::text, 'email', _email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return v_id;
end;
$$;

do $$
declare
  -- Usuarios
  u_admin uuid;
  u_dan   uuid;
  u_maria uuid;
  u_james uuid;
  u_sam   uuid;
  u_alex  uuid;
  -- Organizaciones (tenants)
  org1 uuid;
  org2 uuid;
begin
  -- ---------------------------------------------------------------------------
  -- Usuarios de auth
  -- ---------------------------------------------------------------------------
  u_admin := public.seed_user('admin@tickwise.io', 'password', 'Tickwise Admin');
  u_dan   := public.seed_user('dan@tickwise.io',   'password', 'Dan Bzurovski');
  u_maria := public.seed_user('maria@tickwise.io', 'password', 'María López');
  u_james := public.seed_user('james@tickwise.io', 'password', 'James Carter');
  u_sam   := public.seed_user('sam@tickwise.io',   'password', 'Sam Rivera');
  u_alex  := public.seed_user('alex@tickwise.io',  'password', 'Alex Kim');

  -- Super admin de plataforma (operador white-label; no es miembro de ninguna org)
  insert into public.platform_admins (user_id, note)
  values (u_admin, 'founder');

  -- ===========================================================================
  -- TENANT 1 · Organization 1  (dan@tickwise.io es owner)
  -- ===========================================================================
  insert into public.organizations (name, slug, primary_color)
  values ('Organization 1', 'org-1', '#4f46e5')
  returning id into org1;

  -- Reglas de ruido (el trigger ya creó la fila + rúbrica por defecto)
  update public.noise_rules
     set exclude_terms      = array['webinar', 'sponsored', 'job fair'],
         exclude_domains    = array['prnewswire.com', 'businesswire.com'],
         max_lookback_hours = null,
         min_materiality    = 'potentially'
   where org_id = org1;

  -- Miembros: activos (vinculados a auth) + invites pendientes
  insert into public.org_members (org_id, user_id, email, name, role, status) values
    (org1, u_dan,   'dan@tickwise.io',   'Dan Bzurovski', 'owner',  'active'),
    (org1, u_maria, 'maria@tickwise.io', 'María López',   'admin',  'active'),
    (org1, u_james, 'james@tickwise.io', 'James Carter',  'member', 'active');
  insert into public.org_members (org_id, email, role, status) values
    (org1, 'investor@fund.com', 'member', 'pending'),
    (org1, 'analyst@fund.com',  'admin',  'pending');

  -- Fuentes
  insert into public.sources (org_id, name, tick, url) values
    (org1, 'Apple Newsroom',   'AAPL', 'https://www.apple.com/newsroom/'),
    (org1, 'NVIDIA Blog',      'NVDA', 'https://blogs.nvidia.com/'),
    (org1, 'Tesla Press',      'TSLA', 'https://www.tesla.com/blog'),
    (org1, 'Microsoft Source', 'MSFT', 'https://news.microsoft.com/'),
    (org1, 'Amazon News',      'AMZN', 'https://www.aboutamazon.com/news'),
    (org1, 'Meta Newsroom',    'META', 'https://about.fb.com/news/');

  -- Slots del cron
  insert into public.cron_schedules (org_id, run_time, enabled) values
    (org1, '08:00', true),
    (org1, '14:00', true),
    (org1, '20:00', false);

  -- Destinatarios globales
  insert into public.recipients (org_id, email) values
    (org1, 'dan@tickwise.io'),
    (org1, 'team@tickwise.io'),
    (org1, 'investors@tickwise.io');

  -- Feed (varios días)
  insert into public.feed_items
    (org_id, tick, title, summary, why_it_matters, url, published_at, category, materiality, screened, screened_reason)
  values
    (org1, 'AAPL',
      'Apple unveils new M-series chips focused on on-device AI',
      'A new generation of silicon with dedicated accelerators for local inference.',
      'On-device inference lowers cloud costs and strengthens Apple''s hardware moat.',
      'https://www.apple.com/newsroom/', now() - interval '11 hours',
      'Product', 'potentially', false, null),
    (org1, 'NVDA',
      'NVIDIA expands its data center platform for cloud customers',
      'New deals with hyperscale providers drive GPU demand.',
      'Locked-in hyperscale demand underpins data-center revenue durability.',
      'https://blogs.nvidia.com/', now() - interval '12 hours',
      'Market', 'material', false, null),
    (org1, 'TSLA',
      'Tesla reports record delivery figures for the quarter',
      'The automaker beat analyst estimates across its main markets.',
      'A delivery beat pressures bears and could drive upward estimate revisions.',
      'https://www.tesla.com/blog', now() - interval '35 hours',
      'Earnings', 'material', false, null),
    (org1, 'MSFT',
      'Microsoft hosts sponsored Copilot webinar for enterprise admins',
      'A marketing session on features announced earlier this year.',
      'Largely promotional; no new product, pricing or customer data disclosed.',
      'https://news.microsoft.com/', now() - interval '36 hours',
      'Product', 'noteworthy', true, 'Matched blocked term "webinar"'),
    (org1, 'AMZN',
      'Amazon announces logistics network expansion in Latin America',
      'The investment aims to reduce delivery times across the region.',
      'Capex into regional fulfillment can expand the addressable market.',
      'https://www.aboutamazon.com/news', now() - interval '50 hours',
      'Market', 'potentially', false, null),
    (org1, 'META',
      'Meta under regulatory review over new privacy policies',
      'Regulators assess the impact of changes to user data handling.',
      'Regulatory action is a tail risk to ad targeting and could carry fines.',
      'https://about.fb.com/news/', now() - interval '60 hours',
      'Regulation', 'material', false, null);

  -- ===========================================================================
  -- TENANT 2 · Organization 2  (sam@tickwise.io es owner)
  -- ===========================================================================
  insert into public.organizations (name, slug, primary_color)
  values ('Organization 2', 'org-2', '#0ea5e9')
  returning id into org2;

  update public.noise_rules
     set exclude_terms      = array['giveaway', 'podcast'],
         exclude_domains    = array['seekingalpha.com'],
         max_lookback_hours = 48,                 -- este tenant capea a 48h
         min_materiality    = 'material'          -- y sólo quiere lo material
   where org_id = org2;

  insert into public.org_members (org_id, user_id, email, name, role, status) values
    (org2, u_sam,  'sam@tickwise.io',  'Sam Rivera', 'owner',  'active'),
    (org2, u_alex, 'alex@tickwise.io', 'Alex Kim',   'member', 'active');
  insert into public.org_members (org_id, email, role, status) values
    (org2, 'research@fund.com', 'member', 'pending');

  insert into public.sources (org_id, name, tick, url) values
    (org2, 'AMD Press',       'AMD',  'https://www.amd.com/en/newsroom.html'),
    (org2, 'Google Keyword',  'GOOGL','https://blog.google/'),
    (org2, 'Netflix About',   'NFLX', 'https://about.netflix.com/en/newsroom');

  insert into public.cron_schedules (org_id, run_time, enabled) values
    (org2, '07:30', true),
    (org2, '18:00', true);

  insert into public.recipients (org_id, email) values
    (org2, 'sam@tickwise.io'),
    (org2, 'desk@tickwise.io');

  insert into public.feed_items
    (org_id, tick, title, summary, why_it_matters, url, published_at, category, materiality, screened, screened_reason)
  values
    (org2, 'AMD',
      'AMD lands multi-year accelerator deal with a major cloud provider',
      'A multi-year commitment for data-center accelerators.',
      'A large design win validates AMD''s AI roadmap and diversifies away from NVIDIA.',
      'https://www.amd.com/en/newsroom.html', now() - interval '9 hours',
      'M&A', 'material', false, null),
    (org2, 'GOOGL',
      'Google announces podcast giveaway for developer conference',
      'Promotional content around an upcoming event.',
      'Promotional; no fundamental read-through.',
      'https://blog.google/', now() - interval '10 hours',
      'Product', 'noteworthy', true, 'Matched blocked term "giveaway"'),
    (org2, 'NFLX',
      'Netflix raises prices across key markets',
      'A pricing action affecting several large subscriber bases.',
      'Pricing power test; near-term ARPU tailwind vs. churn risk.',
      'https://about.netflix.com/en/newsroom', now() - interval '30 hours',
      'Earnings', 'material', false, null);
end $$;

-- Limpieza: sacamos el helper temporal
drop function if exists public.seed_user(text, text, text);
