import { startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';
import { Transaction, Budget } from '@/types/index';

export function getMonthBoundary(date: Date, monthStartDay: number) {
  const year = date.getFullYear();
  const month = date.getMonth();

  let monthStart: Date;
  let monthEnd: Date;

  if (monthStartDay === 1) {
    monthStart = startOfMonth(date);
    monthEnd = endOfMonth(date);
  } else {
    if (date.getDate() >= monthStartDay) {
      monthStart = new Date(year, month, monthStartDay);
      monthEnd = new Date(year, month + 1, monthStartDay - 1);
    } else {
      monthStart = new Date(year, month - 1, monthStartDay);
      monthEnd = new Date(year, month, monthStartDay - 1);
    }
  }

  return { monthStart, monthEnd };
}

export function calculateSpentToday(
  transactions: Transaction[],
  today: Date
): number {
  const todayStr = today.toISOString().split('T')[0];
  return transactions
    .filter((t) => t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateSpentMonthToDate(
  transactions: Transaction[],
  today: Date,
  monthStartDay: number
): number {
  const { monthStart } = getMonthBoundary(today, monthStartDay);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  return transactions
    .filter((t) => t.date >= monthStartStr && t.date <= todayStr)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function calculateStreak(
  transactions: Transaction[],
  dailyTarget: number,
  today: Date
): number {
  if (transactions.length === 0) return 0;

  const sortedTxns = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  let streak = 0;
  let currentDate = new Date(today);
  currentDate.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const daySpent = sortedTxns
      .filter((t) => t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    if (daySpent <= dailyTarget) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateProjectedMonthEnd(
  spentMonthToDate: number,
  elapsedDays: number,
  totalDaysInMonth: number
): number {
  if (elapsedDays === 0) return 0;
  return (spentMonthToDate / elapsedDays) * totalDaysInMonth;
}

export function calculateElapsedDaysInMonth(
  today: Date,
  monthStartDay: number
): { elapsed: number; total: number } {
  const { monthStart, monthEnd } = getMonthBoundary(today, monthStartDay);
  const elapsed = differenceInDays(today, monthStart) + 1;
  const total = differenceInDays(monthEnd, monthStart) + 1;
  return { elapsed, total };
}

export function isOnTrackMonthly(
  spentMonthToDate: number,
  monthlyTarget: number,
  elapsedDays: number,
  totalDaysInMonth: number
): boolean {
  const expectedSpend = monthlyTarget * (elapsedDays / totalDaysInMonth);
  return spentMonthToDate <= expectedSpend;
}

export function calculateBudgetStats(
  transactions: Transaction[],
  budget: Budget,
  today: Date
): {
  spentToday: number;
  spentMonthToDate: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  projectedMonthEnd: number;
  streak: number;
  isOverDailyBudget: boolean;
  isOverMonthlyBudget: boolean;
  isOnTrackMonthly: boolean;
} {
  const spentToday = calculateSpentToday(transactions, today);
  const spentMonthToDate = calculateSpentMonthToDate(
    transactions,
    today,
    budget.month_start_day
  );
  const { elapsed, total } = calculateElapsedDaysInMonth(
    today,
    budget.month_start_day
  );
  const streak = calculateStreak(transactions, budget.daily_target, today);
  const projectedMonthEnd = calculateProjectedMonthEnd(
    spentMonthToDate,
    elapsed,
    total
  );
  const onTrack = isOnTrackMonthly(
    spentMonthToDate,
    budget.monthly_target,
    elapsed,
    total
  );

  return {
    spentToday,
    spentMonthToDate,
    dailyRemaining: Math.max(0, budget.daily_target - spentToday),
    monthlyRemaining: Math.max(0, budget.monthly_target - spentMonthToDate),
    projectedMonthEnd,
    streak,
    isOverDailyBudget: spentToday > budget.daily_target,
    isOverMonthlyBudget: spentMonthToDate > budget.monthly_target,
    isOnTrackMonthly: onTrack,
  };
}
