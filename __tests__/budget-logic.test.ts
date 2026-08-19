import {
  calculateSpentToday,
  calculateSpentMonthToDate,
  calculateStreak,
  calculateProjectedMonthEnd,
  calculateElapsedDaysInMonth,
  fromDateKey,
  getNextRecurringDate,
  isOnTrackMonthly,
  getMonthBoundary,
} from '@/lib/budget-logic';
import { Transaction } from '@/types/index';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    user_id: 'user1',
    amount: 25.5,
    category: 'Food',
    date: '2025-02-04',
    note: null,
    created_at: '2025-02-04T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user1',
    amount: 15.0,
    category: 'Transport',
    date: '2025-02-04',
    note: null,
    created_at: '2025-02-04T14:00:00Z',
  },
  {
    id: '3',
    user_id: 'user1',
    amount: 10.0,
    category: 'Food',
    date: '2025-02-03',
    note: null,
    created_at: '2025-02-03T12:00:00Z',
  },
  {
    id: '4',
    user_id: 'user1',
    amount: 5.0,
    category: 'Food',
    date: '2025-02-02',
    note: null,
    created_at: '2025-02-02T12:00:00Z',
  },
];

describe('Budget Logic', () => {
  describe('calculateSpentToday', () => {
    it('should sum all transactions for today', () => {
      const today = new Date('2025-02-04');
      const spent = calculateSpentToday(mockTransactions, today);
      expect(spent).toBe(40.5);
    });

    it('should return 0 if no transactions today', () => {
      const today = new Date('2025-02-05');
      const spent = calculateSpentToday(mockTransactions, today);
      expect(spent).toBe(0);
    });

    it('should not offset expenses with income or count transfers as spending', () => {
      const today = new Date('2025-02-04');
      const transactions: Transaction[] = [
        ...mockTransactions,
        { id: 'income', user_id: 'user1', amount: -500, category: 'Salary', date: '2025-02-04', note: null, created_at: '2025-02-04T08:00:00Z' },
        { id: 'transfer', user_id: 'user1', amount: 100, category: 'Transfer', kind: 'transfer', date: '2025-02-04', note: null, created_at: '2025-02-04T09:00:00Z' },
      ];

      expect(calculateSpentToday(transactions, today)).toBe(40.5);
    });
  });

  describe('calculateSpentMonthToDate', () => {
    it('should sum all transactions from month start to today', () => {
      const today = new Date('2025-02-04');
      const spent = calculateSpentMonthToDate(mockTransactions, today, 1);
      expect(spent).toBe(55.5);
    });

    it('should handle custom month start day', () => {
      const today = new Date('2025-02-15');
      const txns: Transaction[] = [
        {
          id: '1',
          user_id: 'user1',
          amount: 10,
          category: 'Food',
          date: '2025-02-10',
          note: null,
          created_at: '2025-02-10T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'user1',
          amount: 20,
          category: 'Food',
          date: '2025-02-15',
          note: null,
          created_at: '2025-02-15T10:00:00Z',
        },
      ];
      const spent = calculateSpentMonthToDate(txns, today, 10);
      expect(spent).toBe(30);
    });

    it('should only count positive non-transfer transactions toward the cycle budget', () => {
      const today = new Date('2025-02-15');
      const txns: Transaction[] = [
        { id: 'expense', user_id: 'user1', amount: 75, category: 'Food', date: '2025-02-12', note: null, created_at: '2025-02-12T10:00:00Z' },
        { id: 'income', user_id: 'user1', amount: -700, category: 'Salary', date: '2025-02-13', note: null, created_at: '2025-02-13T10:00:00Z' },
        { id: 'transfer', user_id: 'user1', amount: 200, category: 'Transfer', kind: 'transfer', date: '2025-02-14', note: null, created_at: '2025-02-14T10:00:00Z' },
      ];

      expect(calculateSpentMonthToDate(txns, today, 10)).toBe(75);
    });
  });

  describe('calculateStreak', () => {
    it('should count consecutive days under budget', () => {
      const txns: Transaction[] = [
        {
          id: '1',
          user_id: 'user1',
          amount: 20,
          category: 'Food',
          date: '2025-02-04',
          note: null,
          created_at: '2025-02-04T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'user1',
          amount: 15,
          category: 'Food',
          date: '2025-02-03',
          note: null,
          created_at: '2025-02-03T10:00:00Z',
        },
        {
          id: '3',
          user_id: 'user1',
          amount: 10,
          category: 'Food',
          date: '2025-02-02',
          note: null,
          created_at: '2025-02-02T10:00:00Z',
        },
      ];
      const today = new Date('2025-02-04');
      const streak = calculateStreak(txns, 50, today);
      expect(streak).toBe(3);
    });

    it('should break streak when over budget', () => {
      const txns: Transaction[] = [
        {
          id: '1',
          user_id: 'user1',
          amount: 20,
          category: 'Food',
          date: '2025-02-04',
          note: null,
          created_at: '2025-02-04T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'user1',
          amount: 60,
          category: 'Food',
          date: '2025-02-03',
          note: null,
          created_at: '2025-02-03T10:00:00Z',
        },
      ];
      const today = new Date('2025-02-04');
      const streak = calculateStreak(txns, 50, today);
      expect(streak).toBe(1);
    });

    it('should return 0 for empty transactions', () => {
      const today = new Date('2025-02-04');
      const streak = calculateStreak([], 50, today);
      expect(streak).toBe(0);
    });
  });

  describe('calculateProjectedMonthEnd', () => {
    it('should project month end spending', () => {
      const projected = calculateProjectedMonthEnd(100, 4, 28);
      expect(projected).toBe(700);
    });

    it('should return 0 if elapsed days is 0', () => {
      const projected = calculateProjectedMonthEnd(100, 0, 28);
      expect(projected).toBe(0);
    });
  });

  describe('calculateElapsedDaysInMonth', () => {
    it('should calculate elapsed days for standard month', () => {
      const today = new Date('2025-02-15');
      const { elapsed, total } = calculateElapsedDaysInMonth(today, 1);
      expect(elapsed).toBe(15);
      expect(total).toBe(28);
    });

    it('should calculate for custom month start day', () => {
      const today = new Date('2025-02-20');
      const { elapsed, total } = calculateElapsedDaysInMonth(today, 15);
      expect(elapsed).toBe(6);
      expect(total).toBe(28);
    });
  });

  describe('isOnTrackMonthly', () => {
    it('should return true when on pace', () => {
      const onTrack = isOnTrackMonthly(100, 500, 5, 28);
      expect(onTrack).toBe(true);
    });

    it('should return false when over pace', () => {
      const onTrack = isOnTrackMonthly(400, 500, 5, 28);
      expect(onTrack).toBe(false);
    });
  });

  describe('getMonthBoundary', () => {
    it('should return correct boundaries for standard month', () => {
      const date = new Date('2025-02-15');
      const { monthStart, monthEnd } = getMonthBoundary(date, 1);
      expect(monthStart.getDate()).toBe(1);
      expect(monthEnd.getDate()).toBe(28);
    });

    it('should return correct boundaries for custom month start', () => {
      const date = new Date('2025-02-20');
      const { monthStart, monthEnd } = getMonthBoundary(date, 15);
      expect(monthStart.getDate()).toBe(15);
      expect(monthEnd.getDate()).toBe(14);
    });

    it('should clamp unsupported cycle days to the 28th instead of rolling into another month', () => {
      const date = new Date('2025-02-15');
      const { monthStart, monthEnd } = getMonthBoundary(date, 31);
      expect(monthStart.getMonth()).toBe(0);
      expect(monthStart.getDate()).toBe(28);
      expect(monthEnd.getMonth()).toBe(1);
      expect(monthEnd.getDate()).toBe(27);
    });
  });

  describe('date-only recurring schedules', () => {
    it('preserves a date-only value on its local calendar day', () => {
      const date = fromDateKey('2025-02-04');
      expect(date).not.toBeNull();
      expect(date && toDateParts(date)).toEqual([2025, 1, 4]);
      expect(fromDateKey('2025-02-30')).toBeNull();
    });

    it('clamps monthly schedules instead of skipping short months', () => {
      const next = getNextRecurringDate(new Date(2025, 0, 31), 'monthly');
      expect(toDateParts(next)).toEqual([2025, 1, 28]);
    });
  });
});

function toDateParts(date: Date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()];
}
