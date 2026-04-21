create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  browser_alerts_enabled boolean not null default true,
  overspend_alerts_enabled boolean not null default true,
  recurring_alerts_enabled boolean not null default true,
  weekly_summary_alerts_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.budget_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('overspend', 'category', 'recurring', 'weekly')),
  tone text not null check (tone in ('info', 'warning', 'success')),
  title text not null,
  body text not null,
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default timezone('utc', now()),
  read_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, dedupe_key)
);

create index if not exists budget_notifications_user_scheduled_idx
  on public.budget_notifications(user_id, scheduled_for desc);

alter table public.notification_preferences enable row level security;
alter table public.budget_notifications enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "budget_notifications_select_own" on public.budget_notifications;
create policy "budget_notifications_select_own"
  on public.budget_notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "budget_notifications_update_own" on public.budget_notifications;
create policy "budget_notifications_update_own"
  on public.budget_notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.notification_preferences (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

comment on table public.notification_preferences is 'Server-side alert preferences used by the Budget It notification scheduler.';
comment on table public.budget_notifications is 'Generated alert inbox for Budget It users.';

-- Optional cron example for Supabase scheduled execution:
-- select cron.schedule(
--   'budget-it-alerts-hourly',
--   '15 * * * *',
--   $$
--   select
--     net.http_post(
--       url := 'https://<PROJECT-REF>.supabase.co/functions/v1/schedule-budget-alerts',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );
