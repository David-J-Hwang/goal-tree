-- Grant API permissions for tables created by 001_initial_schema.sql.
-- Run this file in Supabase SQL Editor if authenticated users see
-- "permission denied for table ..." errors.

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.plan_categories,
           public.nodes,
           public.today_todos,
           public.user_settings
  to authenticated;
