-- Add user-controlled ordering to plan categories.

alter table public.plan_categories
  add column if not exists sort_order integer not null default 0;

with ranked_categories as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at asc, id asc
    ) as next_sort_order
  from public.plan_categories
)
update public.plan_categories
set sort_order = ranked_categories.next_sort_order
from ranked_categories
where public.plan_categories.id = ranked_categories.id
  and public.plan_categories.sort_order = 0;

create index if not exists plan_categories_user_sort_order_idx
  on public.plan_categories (user_id, sort_order);
