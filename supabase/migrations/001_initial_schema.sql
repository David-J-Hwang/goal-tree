-- Goaltree initial Supabase schema
-- Run this file in the Supabase SQL Editor for the project.

create extension if not exists pgcrypto;

create table if not exists public.plan_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plan_categories_name_not_empty check (char_length(btrim(name)) > 0)
);

create unique index if not exists plan_categories_user_name_unique
  on public.plan_categories (user_id, lower(name));

create index if not exists plan_categories_user_id_idx
  on public.plan_categories (user_id);

create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  type text not null,
  parent_id uuid references public.nodes(id) on delete cascade,

  title text not null,
  memo text,

  status text not null default 'not_started',

  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,

  importance_reason text,
  success_criteria_text text,
  category_id uuid references public.plan_categories(id) on delete set null,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trashed_at timestamptz,

  constraint nodes_type_check check (type in ('goal', 'plan', 'task')),
  constraint nodes_status_check check (
    status in ('not_started', 'in_progress', 'blocked', 'done', 'paused')
  ),
  constraint nodes_title_not_empty check (char_length(btrim(title)) > 0),
  constraint nodes_goal_parent_check check (
    (type = 'goal' and parent_id is null)
    or (type in ('plan', 'task') and parent_id is not null)
  ),
  constraint nodes_category_plan_only_check check (
    type = 'plan' or category_id is null
  ),
  constraint nodes_goal_fields_goal_only_check check (
    type = 'goal'
    or (importance_reason is null and success_criteria_text is null)
  ),
  constraint nodes_planned_date_order_check check (
    planned_start_date is null
    or planned_end_date is null
    or planned_start_date <= planned_end_date
  ),
  constraint nodes_actual_date_order_check check (
    actual_start_date is null
    or actual_end_date is null
    or actual_start_date <= actual_end_date
  )
);

create index if not exists nodes_user_type_sort_idx
  on public.nodes (user_id, type, sort_order)
  where trashed_at is null;

create index if not exists nodes_user_parent_sort_idx
  on public.nodes (user_id, parent_id, sort_order)
  where trashed_at is null;

create index if not exists nodes_user_status_idx
  on public.nodes (user_id, status);

create index if not exists nodes_user_category_idx
  on public.nodes (user_id, category_id)
  where category_id is not null;

create index if not exists nodes_user_trashed_idx
  on public.nodes (user_id, trashed_at)
  where trashed_at is not null;

create table if not exists public.today_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid not null references public.nodes(id) on delete cascade,
  date date not null default current_date,
  sort_order integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists today_todos_user_task_date_unique
  on public.today_todos (user_id, task_id, date);

create index if not exists today_todos_user_date_sort_idx
  on public.today_todos (user_id, date, sort_order);

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  auto_fill_actual_dates_on_status_change boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_node_relationships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_node record;
  category_owner uuid;
begin
  if new.type = 'goal' then
    if new.parent_id is not null then
      raise exception 'Goal nodes cannot have a parent.';
    end if;
  else
    select id, user_id, type
      into parent_node
      from public.nodes
      where id = new.parent_id;

    if parent_node.id is null then
      raise exception 'Parent node does not exist.';
    end if;

    if parent_node.user_id <> new.user_id then
      raise exception 'Parent node must belong to the same user.';
    end if;

    if new.type = 'plan' and parent_node.type <> 'goal' then
      raise exception 'Plan nodes must belong to a Goal.';
    end if;

    if new.type = 'task' and parent_node.type <> 'plan' then
      raise exception 'Task nodes must belong to a Plan.';
    end if;
  end if;

  if new.category_id is not null then
    select user_id
      into category_owner
      from public.plan_categories
      where id = new.category_id;

    if category_owner is null then
      raise exception 'Plan category does not exist.';
    end if;

    if category_owner <> new.user_id then
      raise exception 'Plan category must belong to the same user.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_today_todo_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_node record;
begin
  select id, user_id, type
    into task_node
    from public.nodes
    where id = new.task_id;

  if task_node.id is null then
    raise exception 'Task node does not exist.';
  end if;

  if task_node.user_id <> new.user_id then
    raise exception 'Today todo task must belong to the same user.';
  end if;

  if task_node.type <> 'task' then
    raise exception 'Today todo can only reference Task nodes.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_plan_categories_updated_at on public.plan_categories;
create trigger set_plan_categories_updated_at
  before update on public.plan_categories
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_nodes_updated_at on public.nodes;
create trigger set_nodes_updated_at
  before update on public.nodes
  for each row
  execute function public.set_updated_at();

drop trigger if exists validate_nodes_relationships on public.nodes;
create trigger validate_nodes_relationships
  before insert or update of user_id, type, parent_id, category_id on public.nodes
  for each row
  execute function public.validate_node_relationships();

drop trigger if exists set_today_todos_updated_at on public.today_todos;
create trigger set_today_todos_updated_at
  before update on public.today_todos
  for each row
  execute function public.set_updated_at();

drop trigger if exists validate_today_todos_task on public.today_todos;
create trigger validate_today_todos_task
  before insert or update of user_id, task_id on public.today_todos
  for each row
  execute function public.validate_today_todo_task();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

alter table public.plan_categories enable row level security;
alter table public.nodes enable row level security;
alter table public.today_todos enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Users can read own plan categories" on public.plan_categories;
create policy "Users can read own plan categories"
  on public.plan_categories
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own plan categories" on public.plan_categories;
create policy "Users can insert own plan categories"
  on public.plan_categories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own plan categories" on public.plan_categories;
create policy "Users can update own plan categories"
  on public.plan_categories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own plan categories" on public.plan_categories;
create policy "Users can delete own plan categories"
  on public.plan_categories
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own nodes" on public.nodes;
create policy "Users can read own nodes"
  on public.nodes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own nodes" on public.nodes;
create policy "Users can insert own nodes"
  on public.nodes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own nodes" on public.nodes;
create policy "Users can update own nodes"
  on public.nodes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own nodes" on public.nodes;
create policy "Users can delete own nodes"
  on public.nodes
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own today todos" on public.today_todos;
create policy "Users can read own today todos"
  on public.today_todos
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own today todos" on public.today_todos;
create policy "Users can insert own today todos"
  on public.today_todos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own today todos" on public.today_todos;
create policy "Users can update own today todos"
  on public.today_todos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own today todos" on public.today_todos;
create policy "Users can delete own today todos"
  on public.today_todos
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
  on public.user_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own settings" on public.user_settings;
create policy "Users can delete own settings"
  on public.user_settings
  for delete
  to authenticated
  using (auth.uid() = user_id);
