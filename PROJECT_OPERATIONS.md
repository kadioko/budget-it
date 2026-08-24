# Budget It Operations Guide

This guide is the practical reference for running, validating, deploying, and maintaining Budget It.

## Daily Development

From the project root:

```powershell
npm install
npm start
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run web` | Start the web app locally. |
| `npm run android` | Run a local Android build/emulator session. |
| `npm run type-check` | Validate TypeScript without changing files. |
| `npm test -- --runInBand` | Run the budget-logic tests reliably. |
| `npm run verify` | Run the full pre-release validation suite. |
| `npm run build` | Export the web build. |
| `npm run build:android:apk` | Create an installable internal-testing APK through EAS. |
| `npm run build:android:playstore` | Create the Google Play AAB through EAS. |

## Required Environment Variables

Create `.env.local` for local development:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Set the same two values in Vercel for the production web deployment. `EXPO_PUBLIC_` values are intentionally included in the client bundle; never use this prefix for private credentials.

## Supabase Setup

Run the root SQL files in this order for a new project:

```text
setup_envelopes.sql
setup_recurring.sql
add_bank_balance_column.sql
add_category_budgets_column.sql
add_transaction_details_and_transfer_fields.sql
add_savings_goals_table.sql
add_backend_notifications.sql
add_atomic_money_operations.sql
add_atomic_envelope_operations.sql
add_legacy_transaction_rpc_compatibility.sql
```

After applying them, verify each table has Row Level Security enabled and that requests only return rows owned by the authenticated user. The app expects budgets, envelopes, transactions, recurring transactions, savings goals, and notification tables to be available.

`add_atomic_money_operations.sql` is required for current transaction handling. It creates the Supabase functions that atomically write transaction history and account balances, protect against duplicate offline retries, and keep transfers balanced.

`add_legacy_transaction_rpc_compatibility.sql` keeps older Android builds working while users receive the current release. If Supabase reports that it cannot find `public.budget_it_apply_transactions` in the schema cache, run `add_atomic_money_operations.sql` first, then this compatibility SQL file in the Supabase SQL Editor. It reloads the REST schema cache automatically; no Android rebuild is needed.

`add_atomic_envelope_operations.sql` is required for envelope creation. It moves any opening allocation from the bank balance and records the matching transfer pair, so creating an envelope never creates money.

For authentication redirects, Google sign-in, and password reset setup, use [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md). For server-generated budget alerts, use [SUPABASE_NOTIFICATIONS_SETUP.md](SUPABASE_NOTIFICATIONS_SETUP.md).

## Web Deployment

The web app exports to `dist/` through `build-web.js` and is hosted on Vercel.

```powershell
npx vercel --prod
```

Before publishing, run `npm run verify` and confirm these production URLs work without a sign-in:

- `https://budgetit.xyz`
- `https://budgetit.xyz/privacy-policy`

The privacy policy must stay public and valid because Google Play checks it during review.

## Android Deployment

Use the production EAS profile only for Google Play. It creates an `.aab` bundle, which cannot be installed directly on a device. Use the preview profile if you need an installable APK for a phone or emulator.

The permanent Android package is `com.kadioko.budgetit`. Do not change it for an update.

The full build and Play Console workflow is in [ANDROID_RELEASE_BUILD.md](ANDROID_RELEASE_BUILD.md).

## Dependency Policy

This project is on Expo SDK 57. Native dependencies must follow the versions Expo supports for that SDK.

1. Check compatibility first: `npx expo install --check`.
2. Add or repair native libraries with `npx expo install <package>`, not a generic `npm install`.
3. Use `npm update` only for non-breaking, in-range updates, then run `npx expo install --check` again.
4. Do not use `npm audit fix --force` on this project. It can force a new Expo/React Native SDK and break Android builds.
5. Treat an Expo SDK upgrade as a separate, tested release project with a new Play Store build.

`npm audit` can report transitive tooling vulnerabilities from the current Expo/React Native SDK. Keep the project on the newest supported patch release, but do not force incompatible dependency changes merely to make the audit count zero.

## Release Gate

Before a web or Android production release:

```powershell
git status -sb
npm run verify
```

Then manually confirm:

- Email/password sign-in, Google sign-in, and password reset work.
- A transaction can be added, edited, and deleted.
- Envelopes, transfers, category limits, and savings goals update as expected.
- Dashboard and transactions show a useful offline message and recover after refresh.
- Notification preferences and the alerts screen load.
- The Android AAB has a new, never-before-uploaded `versionCode`.

## Support And Recovery

- If users see stale data, pull down to refresh on Dashboard or Transactions after confirming the network is available.
- If an Android build fails, first run `npx expo install --check`, then `npm run verify`.
- If Supabase returns missing table/column errors, apply the corresponding SQL migration from the repository root.
- If privacy-policy validation fails in Play Console, confirm the exact HTTPS policy URL above works in a private browser window.
- Do not add secrets, service-role keys, Expo access tokens, or keystores to Git, app configuration, screenshots, or documentation.
