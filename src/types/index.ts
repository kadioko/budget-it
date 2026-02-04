export type Profile = {
  id: string;
  created_at: string;
  display_name: string | null;
};

export type Budget = {
  id: string;
  user_id: string;
  daily_target: number;
  monthly_target: number;
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
