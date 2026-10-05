-- Bucket público para el logo de cada organización.
-- El archivo vive en logos/{org_id}/logo.{ext} y la URL pública se guarda en organizations.logo_url.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Primera carpeta del path, sólo si es un uuid de org. Si no, null (la policy niega).
create or replace function public.storage_org_id(object_name text)
returns uuid
language sql
stable
as $$
  select case
    when (storage.foldername(object_name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
    else null
  end
$$;

grant execute on function public.storage_org_id(text) to authenticated, service_role;

create policy "logos are readable"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "org admins insert logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (
      public.is_platform_admin()
      or public.is_org_admin(public.storage_org_id(name))
    )
  );

create policy "org admins update logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (
      public.is_platform_admin()
      or public.is_org_admin(public.storage_org_id(name))
    )
  )
  with check (
    bucket_id = 'logos'
    and (
      public.is_platform_admin()
      or public.is_org_admin(public.storage_org_id(name))
    )
  );

create policy "org admins delete logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (
      public.is_platform_admin()
      or public.is_org_admin(public.storage_org_id(name))
    )
  );
