create table if not exists public.item_icons (
  item_id uuid primary key references public.items(id) on delete cascade,
  home_id uuid not null references public.homes(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  icon text not null check (char_length(trim(icon)) between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists item_icons_home_idx on public.item_icons (home_id);
create index if not exists item_icons_created_by_idx on public.item_icons (created_by);

alter table public.item_icons enable row level security;

drop policy if exists item_icons_select_visible on public.item_icons;
create policy item_icons_select_visible
on public.item_icons for select
to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_icons.item_id
      and i.home_id = item_icons.home_id
      and private.is_home_member(i.home_id)
      and (i.visibility = 'shared' or i.owner_id = (select auth.uid()))
  )
);

drop policy if exists item_icons_insert_editor on public.item_icons;
create policy item_icons_insert_editor
on public.item_icons for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.can_edit_item(item_id)
  and exists (
    select 1 from public.items i
    where i.id = item_icons.item_id and i.home_id = item_icons.home_id
  )
);

drop policy if exists item_icons_update_editor on public.item_icons;
create policy item_icons_update_editor
on public.item_icons for update
to authenticated
using (private.can_edit_item(item_id))
with check (
  private.can_edit_item(item_id)
  and exists (
    select 1 from public.items i
    where i.id = item_icons.item_id and i.home_id = item_icons.home_id
  )
);

drop policy if exists item_icons_delete_editor on public.item_icons;
create policy item_icons_delete_editor
on public.item_icons for delete
to authenticated
using (private.can_edit_item(item_id));

grant select, insert, update, delete on public.item_icons to authenticated;
