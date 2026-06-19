-- Add Inbox cards for unstructured ideas before they become Workspace nodes.

create table if not exists public.inbox_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  title text not null,
  memo text,
  status text not null default 'not_started',
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  sort_order integer not null default 0,
  converted_node_id uuid references public.nodes(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint inbox_cards_title_not_empty check (char_length(btrim(title)) > 0),
  constraint inbox_cards_status_check check (
    status in ('not_started', 'in_progress', 'blocked', 'done', 'paused')
  ),
  constraint inbox_cards_planned_date_order_check check (
    planned_start_date is null
    or planned_end_date is null
    or planned_start_date <= planned_end_date
  ),
  constraint inbox_cards_actual_date_order_check check (
    actual_start_date is null
    or actual_end_date is null
    or actual_start_date <= actual_end_date
  )
);

create index if not exists inbox_cards_user_sort_idx
  on public.inbox_cards (user_id, sort_order)
  where archived_at is null;

create index if not exists inbox_cards_user_status_idx
  on public.inbox_cards (user_id, status)
  where archived_at is null;

drop trigger if exists set_inbox_cards_updated_at on public.inbox_cards;
create trigger set_inbox_cards_updated_at
  before update on public.inbox_cards
  for each row
  execute function public.set_updated_at();

alter table public.inbox_cards enable row level security;

drop policy if exists "Users can read own inbox cards" on public.inbox_cards;
create policy "Users can read own inbox cards"
  on public.inbox_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own inbox cards" on public.inbox_cards;
create policy "Users can insert own inbox cards"
  on public.inbox_cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own inbox cards" on public.inbox_cards;
create policy "Users can update own inbox cards"
  on public.inbox_cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own inbox cards" on public.inbox_cards;
create policy "Users can delete own inbox cards"
  on public.inbox_cards
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.inbox_cards
  to authenticated;
