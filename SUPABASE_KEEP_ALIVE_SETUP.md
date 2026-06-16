# Supabase Keep-Alive Setup

Supabase free projects are paused after 1 week of inactivity. Budget It uses a tiny protected Edge Function plus a scheduled GitHub Action to keep the project active without writing user data.

## What Was Added

- `supabase/functions/keep-alive/index.ts`
- `.github/workflows/supabase-keep-alive.yml`

The Edge Function performs a lightweight `head` count against the `budgets` table using the server-side service role key. The workflow calls that function every Monday, Wednesday, and Friday.

## Required Supabase Function Secrets

The `keep-alive` function needs:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
KEEP_ALIVE_SECRET
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also used by the notification scheduler. `KEEP_ALIVE_SECRET` is a private shared secret used by the scheduled workflow.

## Required GitHub Repository Secrets

Add these in GitHub:

```text
SUPABASE_URL=https://gbdhastkkfbpypddwvke.supabase.co
SUPABASE_KEEP_ALIVE_SECRET=<same value used in Supabase KEEP_ALIVE_SECRET>
```

Go to:

```text
GitHub repo > Settings > Secrets and variables > Actions > New repository secret
```

## Manual Test

After the secrets are set, run:

```bash
curl --fail --show-error --silent \
  --request GET "https://gbdhastkkfbpypddwvke.supabase.co/functions/v1/keep-alive" \
  --header "x-keep-alive-secret: <KEEP_ALIVE_SECRET>"
```

Expected result:

```json
{"ok":true,"checked":"budgets","count":0,"checkedAt":"..."}
```

## Important Limits

This reduces the chance of a free Supabase project pausing, but it does not override Supabase plan limits, abuse controls, or quota rules. For production reliability, the safest long-term option is Supabase Pro.
