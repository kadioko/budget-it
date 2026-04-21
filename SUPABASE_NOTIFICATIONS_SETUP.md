1. Run [add_backend_notifications.sql](C:\Users\USER\Documents\Coding\Projects\Budget%20It\add_backend_notifications.sql) in the Supabase SQL Editor.
2. Deploy the edge function:

```bash
supabase functions deploy schedule-budget-alerts
```

3. Set the function secret automatically available in Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Optional but recommended: schedule the function hourly with `pg_cron` using the example at the bottom of [add_backend_notifications.sql](C:\Users\USER\Documents\Coding\Projects\Budget%20It\add_backend_notifications.sql).

What this gives you:
- server-generated alert inbox rows even when the app is not open
- synced notification preferences per user
- dashboard reads those backend alerts on next open

What it does not yet do:
- external email delivery
- true web-push delivery to closed browsers

This is the right base if you want to add email or web push next.
