# Budget It

[Budget It](https://budgetit.xyz) is a cross-platform personal finance app for tracking spending, setting practical budgets, and staying ahead of the next bill. It ships as a polished web app and a native Android app from one Expo codebase.

## What It Does

- Track income, expenses, merchants, notes, and tags.
- Use custom budget-cycle dates, daily targets, and monthly targets.
- Set synced category limits with early overspending warnings.
- Organize money in envelopes and transfer funds between accounts.
- Create savings goals and recurring income or expense routines.
- Review analytics, spending pace, category trends, and CSV exports.
- Receive in-app budget alerts, weekly summaries, and recurring reminders.
- Use the app in English or Swahili.
- Recover smoothly from weak connections with offline-aware data states and pull-to-refresh.

## Stack

- Expo SDK 57, React Native, Expo Router, and React Native Web
- TypeScript and Zustand
- Supabase Auth, PostgreSQL, Row Level Security, and Edge Functions
- Chart.js for web analytics
- Vercel for the web app and EAS Build for Android artifacts

## Quick Start

### 1. Install

```bash
git clone https://github.com/kadioko/budget-it.git
cd budget-it
npm install
```

### 2. Configure Supabase

Create `.env.local` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Apply the SQL files in the order documented in [PROJECT_OPERATIONS.md](PROJECT_OPERATIONS.md).

### 3. Run

```bash
npm start
```

For web development:

```bash
npm run web
```

## Quality Checks

Run the complete pre-release validation suite:

```bash
npm run verify
```

This runs TypeScript checks, unit tests, Expo compatibility checks, and a clean Android export. Run `npx expo install --check` after any dependency change.

## Project Map

```text
app/                         Expo Router screens for Android and iOS
  (auth)/                    Sign-in and account recovery screens
  (app)/                     Dashboard, transactions, insights, settings, and tools
web/                         Web-specific product interface
src/lib/                     Supabase client, budget logic, and browser utilities
src/store/                   Zustand stores for auth, money data, language, theme, alerts
src/types/                   Shared domain types
supabase/functions/          Edge Functions for alerts and Supabase maintenance
*.sql                        Incremental Supabase schema migrations
assets/                      Native app icons and splash assets
store-assets/                Google Play listing graphics
```

## Deployment

### Web

```bash
npx vercel --prod
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in Vercel. The public privacy policy URL is [https://budgetit.xyz/privacy-policy](https://budgetit.xyz/privacy-policy).

### Android

```bash
npm run build:android:apk
npm run build:android:playstore
```

The APK is for internal device testing. The AAB is for Google Play. Follow [ANDROID_RELEASE_BUILD.md](ANDROID_RELEASE_BUILD.md) for versioning, download, Play Console upload, release notes, and hotfixes.

## Documentation

- [PROJECT_OPERATIONS.md](PROJECT_OPERATIONS.md): environment setup, deployments, validation, dependencies, and support.
- [ARCHITECTURE.md](ARCHITECTURE.md): application data flow, Supabase model, and design decisions.
- [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md): Google sign-in, password reset, and auth redirect configuration.
- [SUPABASE_NOTIFICATIONS_SETUP.md](SUPABASE_NOTIFICATIONS_SETUP.md): scheduled alerts and notification backend.
- [PLAY_STORE_LISTING.md](PLAY_STORE_LISTING.md): Play Store text and visual asset checklist.

## Security

The Supabase anonymous key is designed to be public. Protect user data with Supabase Row Level Security and never commit service-role keys, Expo tokens, Google credentials, or keystores.

## License

MIT
