-- Leída es por usuario. Descartar oculta la nota para toda la org
-- y el upsert del scrape no pisa dismissed, así que no vuelve a aparecer.

alter table public.feed_items
  add column dismissed boolean not null default false;

create index idx_feed_items_active
  on public.feed_items(org_id, published_at desc)
  where dismissed = false;

create table public.feed_item_reads (
  feed_item_id uuid not null references public.feed_items(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  read_at      timestamptz not null default now(),
  primary key (feed_item_id, user_id)
);

create index idx_feed_item_reads_user on public.feed_item_reads(user_id);

alter table public.feed_item_reads enable row level security;

create policy "members read own reads"
  on public.feed_item_reads for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id
        and public.is_org_member(f.org_id)
    )
  );

create policy "members insert own reads"
  on public.feed_item_reads for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.feed_items f
      where f.id = feed_item_id
        and public.is_org_member(f.org_id)
    )
  );

create policy "members delete own reads"
  on public.feed_item_reads for delete
  using (user_id = auth.uid());

-- Descarta notas para toda la organización. No borra la fila.
create or replace function public.dismiss_feed_items(_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feed_items
     set dismissed = true
   where id = any(_ids)
     and public.is_org_member(org_id);
end;
$$;

grant execute on function public.dismiss_feed_items(uuid[]) to authenticated;
