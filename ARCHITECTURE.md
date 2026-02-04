# Budget It - Architecture & Design Decisions

## Overview

Budget It is a cross-platform personal finance tracker built with a monolithic Expo app, Supabase backend, and Zustand state management. The architecture prioritizes simplicity, type safety, and rapid iteration.

## Technology Choices & Rationale

### Frontend: Expo + React Native
- **Why**: Single codebase for web, iOS, and Android
- **Expo Router**: File-based routing (familiar to Next.js developers)
- **React Native**: Native performance with web support via Expo Web
- **Alternative considered**: Flutter (less mature ecosystem for web)

### Backend: Supabase
- **Why**: PostgreSQL + Auth + RLS in one platform
- **Free tier**: Sufficient for MVP (500MB storage, unlimited API calls)
- **RLS**: Built-in row-level security (no custom auth middleware needed)
- **Alternative considered**: Firebase (less control, more expensive at scale)

### State Management: Zustand
- **Why**: Minimal boilerplate, TypeScript-first, no provider hell
- **Stores**: Separate auth and budget stores for clean separation
- **Alternative considered**: Redux (overkill), Context API (prop drilling)

### Testing: Jest + ts-jest
- **Why**: Zero-config with TypeScript support
- **Focus**: Pure functions (budget calculations) over UI tests
- **Alternative considered**: Vitest (newer, but Jest is more stable)

## Data Flow

```
User Action (UI)
    ↓
Zustand Store (auth/budget)
    ↓
Supabase Client (@supabase/supabase-js)
    ↓
Supabase (Auth + PostgreSQL + RLS)
    ↓
Response → Update Store → Re-render UI
```

## Security Model

### Authentication
- Supabase Auth handles email/password
- Session stored in browser/app local storage
- `useAuthStore.checkAuth()` verifies session on app load

### Authorization (RLS)
- All tables have RLS enabled
- Policies enforce `auth.uid() = user_id`
- Users cannot read/write other users' data at database level
- No need for server-side authorization checks

### Secrets
- Supabase Anon Key is public (safe to expose in client)
- Never store sensitive data in client code
- Environment variables prefixed with `EXPO_PUBLIC_` are exposed to client

## Folder Structure Rationale

```
app/                    # Expo Router (file-based routing)
  (auth)/              # Auth group (login, signup)
  (app)/               # App group (main screens)
  _layout.tsx          # Root layout with auth check

src/
  lib/                 # Pure functions & utilities
    supabase.ts       # Client initialization
    budget-logic.ts   # Calculations (testable)
    date-utils.ts     # Date helpers
  
  store/              # Zustand stores
    auth.ts           # Auth state
    budget.ts         # Budget & transaction state
  
  components/         # Reusable UI components (future)
  
  types/              # TypeScript types
    index.ts          # Centralized type definitions
```

**Why this structure?**
- Expo Router handles routing (no need for separate router config)
- `src/lib` contains testable, pure functions
- `src/store` is the single source of truth for state
- Separation of concerns: UI (app/) vs logic (src/)

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
useBudgetStore.transactions     // Array of transactions
useBudgetStore.stats            // Calculated stats
useBudgetStore.fetchBudget()    // Load budget
useBudgetStore.fetchTransactions() // Load transactions
useBudgetStore.createBudget()   // Create
useBudgetStore.updateBudget()   // Update
useBudgetStore.addTransaction() // Add expense
useBudgetStore.deleteTransaction() // Delete expense
useBudgetStore.calculateStats() // Recalculate stats
```

## Budget Calculation Logic

All calculations are **pure functions** in `src/lib/budget-logic.ts`:

- `calculateSpentToday()`: Sum transactions for today
- `calculateSpentMonthToDate()`: Sum transactions from month start to today
- `calculateStreak()`: Count consecutive days under budget
- `calculateProjectedMonthEnd()`: Linear pace-based projection
- `calculateElapsedDaysInMonth()`: Days elapsed in budget month
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
- One budget per user (enforced by unique constraint in future)
- `month_start_day`: Allows custom budget month start (e.g., 15th)
- `updated_at`: Track when budget was last modified

### Transactions
- Indexed on `(user_id, date)` for efficient queries
- `amount > 0` constraint (no negative amounts)
- `date` is DATE type (not TIMESTAMP) for easier grouping

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
- Alert dialogs for user feedback
- Empty states for missing data

### Server-side (Supabase)
- RLS policies prevent unauthorized access
- Constraints prevent invalid data
- Triggers (future) for audit logs

## Performance Considerations

### Current
- Fetch budget + transactions on app load
- Recalculate stats after each transaction
- No pagination (fine for MVP with <1000 transactions)

### Future optimizations
- Lazy load transactions (pagination)
- Cache calculations in store
- Use Supabase real-time subscriptions
- Batch updates

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
Vercel (Web)          EAS Build (Mobile)
    ↓                      ↓
Expo Web Export      Android APK / AAB
    ↓                      ↓
Vercel CDN           Google Play Store
```

## Future Enhancements

### Phase 2 (Post-MVP)
- Bank integrations (Plaid)
- Recurring transactions
- Budget envelopes
- Data export (CSV)

### Phase 3
- Social features (shared budgets)
- Advanced analytics
- Multi-currency
- Offline support

### Phase 4
- iOS deployment
- Push notifications
- Machine learning (spending predictions)
