# Budget It - Personal Finance Tracker

**Live App (Web):** [https://budgetit.xyz](https://budgetit.xyz)

Budget It is a personal finance app built with Expo, React Native Web, Zustand, and Supabase. It helps you manage a core bank balance, envelope-style accounts, spending targets, recurring transactions, transfers, savings goals, analytics, and budget alerts from a single codebase.

## Features

- **User Authentication**: Email/password signup and login via Supabase
- **Budget Management**: Set daily and monthly targets, month start day, currency, bank balance, and per-category limits
- **Accounts and Envelopes**: Track a main bank account plus custom envelopes with editable balances
- **Transaction Logging**: Add income, expenses, notes, merchants, tags, and account-linked transactions
- **Transfers**: Move funds between the bank balance and envelopes
- **Recurring Transactions**: Create recurring income and expense items with upcoming reminders
- **Savings Goals**: Track goal target amounts, current progress, dates, and linked envelopes
- **Dashboard Insights**: See combined or per-account balances, spending pace, projections, category budget health, and notifications
- **Analytics and Export**: Review charts, category breakdowns, trends, and export transactions to CSV
- **Notifications**: Use in-app/browser preferences plus a Supabase Edge Function for scheduled alert generation
- **Offline-aware Web App**: Basic offline state handling with sync when connectivity returns
- **Cross-platform**: Web is actively deployed on Vercel; Expo config is present for iOS and Android builds

## Tech Stack

- **Frontend**: Expo, React Native, React 19, React Native Web
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **Language**: TypeScript
- **Charts**: Chart.js + react-chartjs-2
- **Deployment**: Vercel (Web), EAS Build (mobile)

## Prerequisites

- Node.js 18+
- npm
- Supabase account
- Vercel account for web deployment

## Local Setup

### 1. Clone and Install

```bash
git clone https://github.com/kadioko/budget-it.git
cd budget-it
npm install
```

### 2. Supabase Setup

Create a Supabase project, then run the SQL files in the SQL Editor.

Recommended order:

```text
setup_envelopes.sql
setup_recurring.sql
add_bank_balance_column.sql
add_category_budgets_column.sql
add_transaction_details_and_transfer_fields.sql
add_savings_goals_table.sql
add_backend_notifications.sql
```

These files add support for:

- envelopes and bank balance tracking
- recurring transactions
- category budgets
- richer transaction fields and transfers
- savings goals
- notification preferences and inbox items

Then copy your **Project URL** and **Anon Key** from **Supabase → Settings → API**.

### 3. Environment Configuration

Create `.env.local` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Start the App

**Web:**
```bash
npx expo start --web
```

**Expo dev server:**
```bash
npm start
```

Useful scripts:

```bash
npm run web
npm run build
npm run type-check
npm test
```

## Supabase Notifications Setup

Budget It includes a Supabase Edge Function named `schedule-budget-alerts`.

Deploy it with:

```bash
npx supabase functions deploy schedule-budget-alerts --project-ref <your-project-ref>
```

Function secrets required in Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional: schedule it with `pg_cron` so alerts are generated automatically even when the app is closed.

See `SUPABASE_NOTIFICATIONS_SETUP.md` for the full flow.

## Project Structure

```text
budget-it/
├── App.tsx                       # App entry/auth shell for web and Expo
├── supabase/
│   └── functions/
│       └── schedule-budget-alerts/
│           └── index.ts          # Supabase Edge Function for scheduled alerts
├── src/
│   ├── lib/
│   │   ├── budget-logic.ts       # Core budget calculations
│   │   ├── supabase.ts           # Supabase client config
│   │   └── web-notifications.ts  # Browser notification helpers
│   ├── store/
│   │   ├── auth.ts               # Authentication state
│   │   ├── budget.ts             # Budgets, envelopes, transfers, savings, rollover
│   │   ├── language.ts           # i18n state and translations
│   │   ├── notifications.ts      # Notification settings + inbox state
│   │   └── theme.ts              # Light/dark theme tokens
│   └── types/
│       └── index.ts              # Shared domain types
├── web/                          # Web-specific UI components
│   ├── add-transaction-web.tsx   # Add income/expense form
│   ├── analytics-web.tsx         # Analytics and CSV export
│   ├── dashboard-web.tsx         # Main dashboard, insights, notifications
│   ├── edit-transaction-web.tsx  # Inline transaction editing
│   ├── help-guides-web.tsx       # Help and onboarding guides
│   ├── settings-web.tsx          # Budget, envelopes, recurring, preferences
│   ├── transactions-web.tsx      # Transaction history and filters
│   ├── transfer-funds-web.tsx    # Move money between accounts
│   └── index.html                # Custom HTML template for web build
├── add_*.sql                     # Incremental Supabase schema changes
├── build-web.js                  # Custom build script for Vercel
├── vercel.json                   # Vercel deployment config
├── ARCHITECTURE.md               # Technical architecture and design notes
├── SUPABASE_NOTIFICATIONS_SETUP.md # Notification setup reference
├── eas.json                      # Expo Application Services config
├── app.json                      # Expo project config
└── package.json
```

## Deployment

### Web (Vercel)

The web app builds with `node build-web.js` and serves the exported `dist` folder as an SPA.

Manual production deploy:
```bash
npx vercel --prod
```

The Vercel config rewrites all routes to `index.html`, which is required for direct navigation to app routes.

Set these environment variables in Vercel:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Mobile (Expo / EAS)

```bash
npx eas build --platform android --profile preview
```

## Troubleshooting

- **Missing column/table errors**: run the missing SQL migration file in Supabase
- **Email verification redirects fail**: ensure Supabase Auth redirect URLs point to your deployed domain and the app uses `detectSessionInUrl`
- **Notifications do not appear**: confirm `add_backend_notifications.sql` was run and the Edge Function was deployed with both required secrets
- **Savings goals 404**: run `add_savings_goals_table.sql`
- **Transaction field errors** such as `is_recurring`: run `add_transaction_details_and_transfer_fields.sql`

## Additional Docs

- `ARCHITECTURE.md` — architecture, data flow, stores, and deployment notes
- `SUPABASE_NOTIFICATIONS_SETUP.md` — backend notification setup and scheduling

## License

MIT
