-- Make Inbox cards store Workspace-ready fields.

alter table public.inbox_cards
  add column if not exists planned_start_date date,
  add column if not exists planned_end_date date,
  add column if not exists actual_start_date date,
  add column if not exists actual_end_date date;

alter table public.inbox_cards
  drop constraint if exists inbox_cards_status_check;

update public.inbox_cards
set status = case status
  when 'new' then 'not_started'
  when 'reviewing' then 'in_progress'
  when 'converted' then 'done'
  else status
end
where status in ('new', 'reviewing', 'converted');

alter table public.inbox_cards
  alter column status set default 'not_started';

alter table public.inbox_cards
  add constraint inbox_cards_status_check check (
    status in ('not_started', 'in_progress', 'blocked', 'done', 'paused')
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_cards_planned_date_order_check'
  ) then
    alter table public.inbox_cards
      add constraint inbox_cards_planned_date_order_check check (
        planned_start_date is null
        or planned_end_date is null
        or planned_start_date <= planned_end_date
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'inbox_cards_actual_date_order_check'
  ) then
    alter table public.inbox_cards
      add constraint inbox_cards_actual_date_order_check check (
        actual_start_date is null
        or actual_end_date is null
        or actual_start_date <= actual_end_date
      );
  end if;
end;
$$;
