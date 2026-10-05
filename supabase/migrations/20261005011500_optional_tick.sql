-- El tick es contexto opcional. La URL de la fuente identifica a la empresa.
alter table public.sources alter column tick drop not null;
alter table public.feed_items alter column tick drop not null;

-- Home del medio (news.google.com no sirve para bloquear dominios).
alter table public.feed_items add column outlet_url text;
