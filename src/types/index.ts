export type CategoryBudgetMap = Record<string, number>;
export type TransactionKind = 'standard' | 'transfer';
export type TransferDirection = 'incoming' | 'outgoing';

export type Profile = {
  id: string;
  created_at: string;
  display_name: string | null;
};

export type Envelope = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  balance: number;
  currency: string;
  is_default: boolean;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  daily_target: number;
  monthly_target: number;
  category_budgets?: CategoryBudgetMap | null;
  currency: string;
  month_start_day: number;
  bank_balance: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
  merchant?: string | null;
  tags?: string[] | null;
  is_recurring?: boolean;
  recurring_source_id?: string | null;
  kind?: TransactionKind;
  transfer_group_id?: string | null;
  transfer_peer_envelope_id?: string | null;
  transfer_direction?: TransferDirection | null;
  envelope_id?: string | null;
  created_at: string;
};

export type RecurringTransaction = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  note: string | null;
  frequency: 'monthly' | 'weekly' | 'daily';
  next_date: string;
  created_at: string;
};

export type BudgetStats = {
  spentToday: number;
  spentMonthToDate: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  projectedMonthEnd: number;
  streak: number;
  isOverDailyBudget: boolean;
  isOverMonthlyBudget: boolean;
  isOnTrackMonthly: boolean;
};
