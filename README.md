# Budget It - Personal Finance Tracker

**Live App (Web):** [https://budgetit.xyz](https://budgetit.xyz)

A cross-platform personal finance tracker built with Expo, React Native, and Supabase. Track daily and monthly spending targets, log expenses, and get instant feedback on your budget status.

## Features

- **User Authentication**: Email/password signup and login via Supabase
- **Budget Management**: Set daily and monthly spending targets, choose currency, customize month start day, and log starting bank balance.
- **Transaction Logging**: Add expenses and income with category, date, and optional notes.
- **Real-time Dashboard**: View account balance, today's spending, month-to-date totals, and projected end-of-month spend with interactive progress bars.
- **Streak Tracking**: Maintain consecutive days under budget with motivational feedback.
- **Cross-platform**: Web (Vercel SPA), iOS, and Android (via Expo/EAS Build).

## Tech Stack

- **Frontend**: Expo, React Native, React (Web), Zustand
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Language**: TypeScript
- **Deployment**: Vercel (Web), EAS Build (Mobile APK)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)
- Expo CLI: `npm install -g expo-cli`

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/kadioko/budget-it.git
cd budget-it
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the schema setup (see `ARCHITECTURE.md` or the SQL files in root)
3. Copy your **Project URL** and **Anon Key** from Settings → API

### 3. Environment Configuration

Create `.env.local` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

**Web (Local Dev Server)**:
```bash
npx expo start --web
```

**Mobile (Expo Go)**:
```bash
npm start
```
Then press `i` for iOS or `a` for Android in the terminal.

## Project Structure

```text
budget-it/
├── App.tsx                       # Main entry point (auth check, routing)
├── src/
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client config
│   │   └── budget-logic.ts       # Pure budget calculation functions
│   ├── store/
│   │   ├── auth.ts               # Zustand auth state
│   │   └── budget.ts             # Zustand budget/transaction state
├── web/                          # Web-specific UI components
│   ├── dashboard-web.tsx         # Main dashboard view
│   ├── settings-web.tsx          # Settings page
│   ├── transactions-web.tsx      # Transaction history
│   ├── add-transaction-web.tsx   # Add income/expense form
│   ├── edit-transaction-web.tsx  # Edit transaction form
│   ├── analytics-web.tsx         # Analytics and charts
│   └── index.html                # Custom HTML template for Vercel web build
├── build-web.js                  # Custom build script for Vercel
├── vercel.json                   # Vercel deployment config
├── eas.json                      # Expo Application Services config
├── app.json                      # Expo project config
└── package.json
```

## Deployment

### Web (Vercel)

The web app is configured as a Single Page Application (SPA) on Vercel.
It auto-deploys on push to the `main` branch.

**Manual Web Build:**
```bash
node build-web.js
npx expo export --platform web
```

### Mobile (Android APK via EAS Build)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## License

MIT
