# Budget It - Architecture & Design Decisions

**Live App (Web):** [https://budgetit.xyz](https://budgetit.xyz)

## Overview

Budget It is a cross-platform personal finance tracker built with a single Expo codebase, Supabase backend services, and Zustand state management. The current architecture is centered around a web-first deployment while keeping the project compatible with Expo-based mobile builds.

## Technology Choices & Rationale

### Frontend: Expo + React Native
- **Why**: Single codebase for web, iOS, and Android
- **React Native Web**: Reuses React Native primitives in the browser
- **Custom web views**: The main product UX is implemented in `web/*.tsx`
- **Alternative considered**: Flutter (less mature ecosystem for web)

### Backend: Supabase
- **Why**: PostgreSQL + Auth + RLS in one platform
- **Auth**: Email/password auth with redirect-based email verification
- **Edge Functions**: Used for server-side notification scheduling
- **RLS**: Built-in row-level security (no custom auth middleware needed)
- **Alternative considered**: Firebase (less control, more expensive at scale)

### State Management: Zustand
- **Why**: Minimal boilerplate, TypeScript-first, no provider hell
- **Stores**: Auth, budget, theme, language, and notification settings are separated by responsibility
- **Alternative considered**: Redux (overkill), Context API (prop drilling)

### Testing: Jest + ts-jest
- **Why**: Zero-config with TypeScript support
- **Focus**: Pure functions (budget calculations) over UI tests
- **Alternative considered**: Vitest (newer, but Jest is more stable)

## Runtime Data Flow

```
User Action (web/*.tsx or App.tsx)
    ↓
Zustand Store
    ↓
Supabase Client (@supabase/supabase-js)
    ↓
Supabase (Auth + PostgreSQL + RLS + Edge Functions)
    ↓
Response → Update Store → Re-render UI
```

For notification scheduling, there is an additional backend path:

```
Dashboard / notification settings store
    ↓
Supabase Edge Function invoke (`schedule-budget-alerts`)
    ↓
Supabase Edge Function
    ↓
`budget_notifications` rows inserted/upserted
    ↓
Client inbox fetch → dashboard notification cards
```

## Security Model

### Authentication
- Supabase Auth handles email/password
- Session stored in browser/app local storage
- `useAuthStore.checkAuth()` verifies session on app load
- `detectSessionInUrl` is enabled so email verification callbacks can be completed inside the app

### Authorization (RLS)
- All tables have RLS enabled
- Policies enforce `auth.uid() = user_id`
- Users cannot read/write other users' data at database level
- No need for server-side authorization checks

### Secrets
- Supabase Anon Key is public (safe to expose in client)
- Never store sensitive data in client code
- Environment variables prefixed with `EXPO_PUBLIC_` are exposed to client
- Service role credentials are only used inside the Supabase Edge Function configuration

## Folder Structure Rationale

```
app/                    # Expo Router (file-based routing)
  (auth)/              # Auth group (login, signup)
  (app)/               # App group (main screens)
  _layout.tsx          # Root layout with auth check

web/                    # Main web UI surfaces
  dashboard-web.tsx     # Dashboard, notifications, inline edits
  settings-web.tsx      # Budget settings, envelopes, recurring items
  transactions-web.tsx  # History and filters
  analytics-web.tsx     # Charts and CSV export
  transfer-funds-web.tsx # Account-to-account transfers

src/
  lib/                 # Pure functions & utilities
    supabase.ts       # Client initialization
    budget-logic.ts   # Calculations + cycle window helpers
    web-notifications.ts # Browser notification helpers
  
  store/              # Zustand stores
    auth.ts           # Auth state
    budget.ts         # Budgets, envelopes, transfers, savings, alerts
    notifications.ts  # Notification preferences + inbox
    theme.ts          # Theme mode + tokens
    language.ts       # i18n translations and language selection
  
  types/              # TypeScript types
    index.ts          # Centralized type definitions

supabase/
  functions/
    schedule-budget-alerts/
      index.ts        # Server-generated budget alert scheduler
```

**Why this structure?**
- Expo config remains available for native builds, but most of the active product UX lives in `web/`
- `src/lib` contains reusable logic and integration helpers
- `src/store` is the single source of truth for client state
- Supabase Edge Functions are used only where server-side privileges are required

## State Management Pattern

### Auth Store
```typescript
useAuthStore.user          // Current user or null
useAuthStore.loading       // Loading state
useAuthStore.error         // Error messages
useAuthStore.signUp()      // Action
useAuthStore.signIn()      // Action
useAuthStore.signOut()     // Action
useAuthStore.checkAuth()   // Check session on app load
```

### Budget Store
```typescript
useBudgetStore.budget           // Current budget or null
useBudgetStore.categoryBudgets  // Per-category limits
useBudgetStore.envelopes        // Envelope / account list
useBudgetStore.transactions     // Array of transactions
useBudgetStore.recurringTransactions // Recurring templates
useBudgetStore.savingsGoals     // Savings goal list
useBudgetStore.rolloverState    // Monthly carryover state
useBudgetStore.stats            // Calculated stats
useBudgetStore.fetchBudget()    // Load budget
useBudgetStore.fetchEnvelopes() // Load envelopes
useBudgetStore.fetchTransactions() // Load transactions
useBudgetStore.fetchRecurringTransactions() // Load recurring items
useBudgetStore.fetchSavingsGoals() // Load savings goals
useBudgetStore.createBudget()   // Create
useBudgetStore.updateBudget()   // Update
useBudgetStore.saveCategoryBudgets() // Save category limits
useBudgetStore.addTransaction() // Add standard transaction
useBudgetStore.createTransfer() // Create transfer pair entries
useBudgetStore.addRecurringTransaction() // Add recurring item
useBudgetStore.addSavingsGoal() // Add savings goal
useBudgetStore.applyMonthlyRollover() // Carry unused category budgets forward
useBudgetStore.calculateStats() // Recalculate stats
```

### Additional Stores

```typescript
useNotificationSettingsStore.loadPreferences()
useNotificationSettingsStore.fetchInbox()
useNotificationSettingsStore.triggerScheduler()

useThemeStore.mode
useThemeStore.toggleMode()

useI18n().t()
useI18n().tr()
```

## Budget Calculation Logic

All calculations are **pure functions** in `src/lib/budget-logic.ts`:

- `calculateSpentToday()`: Sum transactions for today
- `calculateSpentMonthToDate()`: Sum transactions from month start to today
- `calculateStreak()`: Count consecutive days under budget
- `calculateProjectedMonthEnd()`: Linear pace-based projection
- `getBudgetCycleWindow()`: Calculate the active budget cycle from `month_start_day`
- `isOnTrackMonthly()`: Check if on pace for monthly budget
- `calculateBudgetStats()`: Aggregate all calculations

**Why pure functions?**
- Testable without mocking
- Reusable across platforms
- Easy to debug
- No side effects

## Database Schema

### Profiles
- Stores user metadata (display name, etc.)
- Linked to `auth.users` via UUID

### Budgets
- Stores daily/monthly targets, currency, bank balance, and `category_budgets`
- `month_start_day` supports custom billing/budget cycles
- `category_budgets` is stored as a JSON-like object for flexible per-category limits

### Envelopes
- Custom accounts/envelopes separate from the main bank balance
- `is_default` identifies the permanent primary bank account behavior

### Transactions
- Standard transactions and transfer entries share the same table
- Additional metadata includes `merchant`, `tags`, `is_recurring`, `kind`, and transfer fields
- Transfers are modeled as linked incoming/outgoing rows

### Recurring Transactions
- Stores templates for scheduled income/expense items
- Used both by the client and notification scheduler

### Savings Goals
- Tracks target amount, current amount, target date, optional note, and linked envelope

### Notification Preferences
- Stores per-user toggles for browser alerts, overspend alerts, recurring alerts, and weekly summaries

### Budget Notifications
- Server-generated inbox rows created by the edge function
- Uses `dedupe_key` to avoid duplicate alerts per user

## RLS Policies

All policies follow the same pattern:
```sql
CREATE POLICY "Users can [ACTION] own [TABLE]" ON [TABLE]
  FOR [SELECT|INSERT|UPDATE|DELETE]
  USING (auth.uid() = user_id);
```

This ensures:
- Users can only see their own data
- No cross-user data leakage
- No need for server-side auth checks

## Error Handling

### Client-side
- Try-catch blocks in async actions
- Error stored in Zustand store
- Inline feedback and toast-style UI messages in the web app
- Empty states for missing data

### Server-side (Supabase)
- RLS policies prevent unauthorized access
- Constraints prevent invalid data
- Edge Function failures return structured JSON responses

## Performance Considerations

### Current
- Dashboard batches initial fetches with `Promise.all`
- Stats are recalculated from store state instead of duplicating logic in views
- Notification scheduling is offloaded to an Edge Function
- Web build is exported statically and served via Vercel CDN

### Future optimizations
- Lazy load transactions (pagination)
- Cache calculations in store
- Use Supabase real-time subscriptions
- Add more selective refetching by view

## Testing Strategy

### Unit Tests (Jest)
- Budget calculation functions
- Date utilities
- No UI tests (Expo testing is complex)

### Manual Testing
- Test on web (Expo Web)
- Test on mobile (Expo Go)
- Test on Android APK (EAS Build)

### Integration Testing (Future)
- E2E tests with Playwright
- Test full user flows

## Deployment Architecture

```
GitHub Repo
    ↓
Vercel (Web)                EAS Build (Native)
    ↓                            ↓
`node build-web.js`         Android / iOS artifacts
    ↓
Expo static web export (`dist/`)
    ↓
Vercel CDN + SPA rewrites
    ↓
Supabase Auth / Database / Edge Functions
```

## Current Operational Notes

- Vercel requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Supabase notification scheduling requires the `schedule-budget-alerts` Edge Function plus:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- SQL migrations in the repo root are incremental and need to be run in Supabase when enabling new features

## Future Enhancements

### Product
- Social features (shared budgets)
- Advanced analytics
- Multi-currency
- Better offline sync and conflict handling

### Platform
- Real push/web-push delivery beyond the current in-app/browser model
- More complete mobile-first navigation and native packaging polish
- Optional real-time subscriptions for collaborative or multi-device refreshes
