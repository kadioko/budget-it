# Supabase Notifications Setup

This project uses a Supabase Edge Function, `schedule-budget-alerts`, to generate server-side budget notifications and recurring reminders.

## What this setup provides

- server-generated alert inbox rows even when the app is not open
- synced notification preferences per user
- dashboard notification cards backed by the database
- optional scheduled execution through `pg_cron`

## What it does not provide yet

- external email delivery
- true web-push delivery to closed browsers

## Required database setup

Run the following SQL files in Supabase SQL Editor before using notifications:

```text
add_backend_notifications.sql
add_category_budgets_column.sql
setup_recurring.sql
```

If you are setting up the whole project from scratch, use the full order documented in `README.md`.

## Deploy the edge function

From the project root:

```bash
npx supabase login
npx supabase functions deploy schedule-budget-alerts --project-ref <your-project-ref>
```

For this project, the current production project ref is:

```text
gbdhastkkfbpypddwvke
```

## Required function secrets

Add these in **Supabase Dashboard → Edge Functions → schedule-budget-alerts → Settings**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The function already supports browser invocation and includes CORS handling for the deployed web app.

## Optional: schedule the function automatically

You can run the scheduler hourly with `pg_cron` and `pg_net`.

Example:

```sql
select cron.schedule(
  'budget-it-alerts-hourly',
  '15 * * * *',
  $$
  select
    net.http_post(
      url := 'https://gbdhastkkfbpypddwvke.supabase.co/functions/v1/schedule-budget-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

You can also use the commented example at the bottom of `add_backend_notifications.sql`.

## Related client behavior

- The notification preferences store reads and updates `notification_preferences`
- The dashboard fetches `budget_notifications` and merges them with locally-generated insights
- The client can manually trigger the scheduler via `supabase.functions.invoke('schedule-budget-alerts')`

## Troubleshooting

- **CORS error when invoking the function**: redeploy the latest `schedule-budget-alerts` function code
- **No notifications appear**: confirm `add_backend_notifications.sql` ran successfully and the function secrets are present
- **Recurring reminders do not appear**: verify `setup_recurring.sql` was run and `recurring_transactions` contains rows
- **Category overspend alerts do not appear**: verify `add_category_budgets_column.sql` was run and the budget has category limits saved

This is the right base if you want to add email or web push next.
