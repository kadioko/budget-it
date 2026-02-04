# Budget It - Personal Finance Tracker

A cross-platform personal finance tracker built with Expo, React Native, and Supabase. Track daily and monthly spending targets, log expenses, and get instant feedback on your budget status.

## Features

- **User Authentication**: Email/password signup and login via Supabase
- **Budget Management**: Set daily and monthly spending targets, choose currency, customize month start day
- **Transaction Logging**: Add expenses with category, date, and optional notes
- **Real-time Dashboard**: View today's spending, month-to-date totals, and projected end-of-month spend
- **Streak Tracking**: Maintain consecutive days under budget with motivational feedback
- **Cross-platform**: Web (Vercel), iOS, and Android (via Expo/EAS Build)

## Tech Stack

- **Frontend**: Expo, React Native, Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State Management**: Zustand
- **Language**: TypeScript
- **Testing**: Jest
- **Deployment**: Vercel (web), EAS Build (mobile)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)
- Expo CLI: `npm install -g expo-cli`

## Setup Instructions

### 1. Clone and Install

```bash
cd "C:\Users\USER\Documents\Coding\Projects\Budget It"
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the schema setup (see `SUPABASE_SETUP.sql` below)
3. Copy your **Project URL** and **Anon Key** from Settings → API

### 3. Environment Configuration

Create `.env.local` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

**Web (Expo Web)**:
```bash
npm run web
```

**Mobile (Expo Go)**:
```bash
npm start
```
Then press `i` for iOS or `a` for Android in the terminal.

### 5. Run Tests

```bash
npm test
```

## Supabase Schema Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_name TEXT
);

-- Budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_target NUMERIC(10, 2) NOT NULL,
  monthly_target NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  month_start_day INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_month_start_day CHECK (month_start_day >= 1 AND month_start_day <= 31)
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_transactions_user_id_date ON transactions(user_id, date);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies: Budgets
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: Transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);
```

## Project Structure

```
budget-it/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens (login, signup)
│   ├── (app)/                    # App screens (dashboard, transactions, etc.)
│   └── _layout.tsx               # Root layout with auth check
├── src/
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   ├── budget-logic.ts       # Pure budget calculation functions
│   │   └── date-utils.ts         # Date helpers
│   ├── store/
│   │   ├── auth.ts               # Auth state (Zustand)
│   │   └── budget.ts             # Budget state (Zustand)
│   ├── components/               # Reusable components
│   └── types/
│       └── index.ts              # TypeScript types
├── __tests__/
│   └── budget-logic.test.ts      # Unit tests
├── app.json                      # Expo config
├── tsconfig.json                 # TypeScript config
├── jest.config.js                # Jest config
└── package.json
```

## Core Screens

1. **Auth** (`(auth)/login`, `(auth)/signup`)
   - Email/password authentication
   - Account creation with validation

2. **Dashboard** (`(app)/dashboard`)
   - Today's spending vs daily target
   - Month-to-date vs monthly target
   - Projected end-of-month spend
   - Streak counter with motivational messages

3. **Add Transaction** (`(app)/add-transaction`)
   - Amount, category, date, optional note
   - Categories: Food, Transport, Entertainment, Utilities, Other

4. **Transactions** (`(app)/transactions`)
   - List of all transactions
   - Delete functionality
   - Sorted by date (newest first)

5. **Settings** (`(app)/settings`)
   - Edit daily/monthly targets
   - Change currency
   - Set month start day
   - Sign out

## Budget Logic

- **Daily Overspend**: `spentToday > dailyTarget`
- **Monthly Overspend**: `spentMonthToDate > monthlyTarget`
- **On Track Monthly**: `spentMonthToDate <= monthlyTarget * (elapsedDays / totalDaysInMonth)`
- **Projection**: `(spentMonthToDate / elapsedDays) * totalDaysInMonth`
- **Streak**: Consecutive days where `dailySpend <= dailyTarget`

## Deployment

### Web (Vercel)

```bash
npm run build
# Deploy to Vercel (requires Vercel CLI)
vercel
```

### Mobile (Android APK via EAS Build)

```bash
npm install -g eas-cli
eas build --platform android
```

## Testing

Run unit tests for budget calculations:

```bash
npm test
```

Tests cover:
- Daily spending calculations
- Month-to-date calculations
- Streak counting logic
- Projection calculations
- On-track monthly pace checks

## Future Enhancements (Post-MVP)

- Bank integrations (Plaid, Open Banking)
- Multi-currency support
- Recurring transactions
- Budget envelopes
- Social features
- Data export (CSV)
- Advanced analytics

## License

MIT
