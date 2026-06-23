-- Remove the unused Inbox archive field.
-- Inbox cards are deleted when removed or converted to Workspace nodes.

drop index if exists public.inbox_cards_user_sort_idx;
drop index if exists public.inbox_cards_user_status_idx;

delete from public.inbox_cards
where converted_node_id is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inbox_cards'
      and column_name = 'archived_at'
  ) then
    delete from public.inbox_cards
    where archived_at is not null;

    alter table public.inbox_cards
      drop column archived_at;
  end if;
end $$;

create index if not exists inbox_cards_user_sort_idx
  on public.inbox_cards (user_id, sort_order);

create index if not exists inbox_cards_user_status_idx
  on public.inbox_cards (user_id, status);
