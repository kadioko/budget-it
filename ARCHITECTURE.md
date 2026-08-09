# Budget It Architecture

## Overview

Budget It is a single Expo and TypeScript project that serves a web app through Vercel and a native Android app through EAS Build. Supabase provides authentication, PostgreSQL storage, Row Level Security, and scheduled backend notifications.

```text
Web (Vercel) or native app (Android)
  -> Expo Router screen
  -> Zustand store
  -> Supabase client
  -> Supabase Auth, PostgreSQL, and Edge Functions
  -> updated store state
  -> responsive user interface
```

## Interface Layers

### Native

`app/` contains Expo Router screens for Android and iOS.

- `(auth)` contains sign-in, account creation, Google sign-in, and password reset.
- `(app)` contains Dashboard, Transactions, Settings, Insights, Alerts, Money Spaces, Transfers, Routines, and Help Guides.
- `src/ui/nativeTheme.ts` provides the shared native color system, spacing, cards, controls, and money formatting.

Native screens show a loading state for first load, preserve available data when an update fails, offer pull-to-refresh for the primary data feeds, and communicate when data is offline/stale.

### Web

`web/` contains the web-first desktop and mobile-browser experience. It uses the same stores, types, business logic, and Supabase client as the native app, while providing its own responsive layouts and Chart.js analytics.

## State And Data Flow

Zustand stores are the client-side source of truth:

| Store | Responsibility |
| --- | --- |
| `auth.ts` | Supabase session, email/password auth, Google auth, password recovery. |
| `budget.ts` | Budgets, transactions, envelopes, transfers, recurring schedules, goals, offline queue, and computed stats. |
| `notifications.ts` | User alert preferences and the notification inbox. |
| `language.ts` | English/Swahili selection and translations. |
| `theme.ts` | Visual theme preference for the web app. |

`src/lib/budget-logic.ts` contains pure calculations for daily spend, custom budget cycles, month-end projections, pacing, and streaks. Pure functions are kept separate from UI and data fetching so they can be unit-tested without device or network dependencies.

## Supabase Model

The database uses these main resources:

- `budgets`: daily/monthly targets, currency, bank balance, custom cycle start day, and synced category limits.
- `envelopes`: separate account or envelope balances.
- `transactions`: income, expenses, transfers, merchant metadata, tags, and recurring metadata.
- `recurring_transactions`: schedules used for bills, regular income, and reminders.
- `savings_goals`: target amounts, progress, target dates, and optional linked envelopes.
- `notification_preferences`: user choices for budget warnings, summaries, and reminders.
- `budget_notifications`: deduplicated alert records shown in the app inbox.

All user-owned tables rely on Supabase Row Level Security. A user can only read or change records where `user_id` is their authenticated ID. The service-role key is restricted to server-side Edge Function configuration.

## Money Model

- A standard expense is a positive transaction amount and reduces its linked envelope or the bank balance.
- Income is a negative transaction amount and increases its linked envelope or the bank balance.
- Transfers are represented by linked incoming and outgoing transaction rows, so account balances and history remain auditable.
- A budget cycle is calculated from `month_start_day`; it is not assumed to begin on the first day of the calendar month.
- Category limits are stored with the budget and sync through Supabase, allowing the same limits on every signed-in device.

## Offline Behavior

The budget store persists selected data through AsyncStorage. When network status is offline, new standard transactions are queued locally and the last saved budget data remains visible. When connectivity returns, the store attempts to sync the pending actions and refetches the latest remote state.

Transfers require an online connection because they update two balances and create linked records together. The app communicates offline status on the dashboard and transaction feed so users understand when data may be stale.

## Notifications

The `schedule-budget-alerts` Supabase Edge Function generates weekly summaries, overspend warnings, and upcoming recurring-expense alerts. It uses dedupe keys to avoid duplicate alert records. Clients fetch the inbox through `notifications.ts`; users can also trigger a refresh from the Alerts screen.

See [SUPABASE_NOTIFICATIONS_SETUP.md](SUPABASE_NOTIFICATIONS_SETUP.md) for required secrets and scheduling.

## Deployment

```text
GitHub source
  -> Vercel: static web export and SPA routing
  -> EAS Build: Android APKs for testing and AABs for Google Play
  -> Supabase: auth, data, RLS, and Edge Functions
```

The web build uses `build-web.js` and Vercel SPA rewrites. Android builds use the Expo configuration in `app.json` and build profiles in `eas.json`. The package identifier is `com.kadioko.budgetit` and must stay stable for Play Store updates.

## Quality Gate

Run `npm run verify` before production work. It checks TypeScript, unit tests, Expo compatibility, and a clean Android export. The release-specific process, including version codes and Google Play submission, is documented in [ANDROID_RELEASE_BUILD.md](ANDROID_RELEASE_BUILD.md).
