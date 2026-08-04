create table if not exists public.item_reminders (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  due_on date not null,
  repeat_months integer not null default 0 check (repeat_months in (0, 1, 3, 6, 12)),
  completed_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id)
);

create index if not exists item_reminders_home_due_idx
  on public.item_reminders (home_id, due_on)
  where completed_at is null;

alter table public.item_reminders enable row level security;

drop policy if exists item_reminders_select_visible on public.item_reminders;
create policy item_reminders_select_visible
on public.item_reminders for select
to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_reminders.item_id
      and i.home_id = item_reminders.home_id
      and private.is_home_member(i.home_id)
      and (i.visibility = 'shared' or i.owner_id = (select auth.uid()))
  )
);

drop policy if exists item_reminders_insert_editor on public.item_reminders;
create policy item_reminders_insert_editor
on public.item_reminders for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.can_edit_item(item_id)
  and exists (
    select 1 from public.items i
    where i.id = item_reminders.item_id
      and i.home_id = item_reminders.home_id
  )
);

drop policy if exists item_reminders_update_editor on public.item_reminders;
create policy item_reminders_update_editor
on public.item_reminders for update
to authenticated
using (private.can_edit_item(item_id))
with check (
  private.can_edit_item(item_id)
  and exists (
    select 1 from public.items i
    where i.id = item_reminders.item_id
      and i.home_id = item_reminders.home_id
  )
);

drop policy if exists item_reminders_delete_editor on public.item_reminders;
create policy item_reminders_delete_editor
on public.item_reminders for delete
to authenticated
using (private.can_edit_item(item_id));

drop trigger if exists set_item_reminders_updated_at on public.item_reminders;
create trigger set_item_reminders_updated_at
before update on public.item_reminders
for each row execute function private.set_updated_at();

grant select, insert, update, delete on public.item_reminders to authenticated;
