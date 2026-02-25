import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Budget, Transaction, BudgetStats, RecurringTransaction } from '@/types/index';
import { calculateBudgetStats } from '@/lib/budget-logic';

interface BudgetState {
  budget: Budget | null;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  stats: BudgetStats | null;
  loading: boolean;
  error: string | null;
  fetchBudget: (userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  fetchRecurringTransactions: (userId: string) => Promise<void>;
  createBudget: (
    userId: string,
    dailyTarget: number,
    monthlyTarget: number,
    currency: string,
    monthStartDay: number
  ) => Promise<void>;
  updateBudget: (
    budgetId: string,
    dailyTarget: number,
    monthlyTarget: number,
    currency: string,
    monthStartDay: number
  ) => Promise<void>;
  addTransaction: (
    userId: string,
    amount: number,
    category: string,
    date: string,
    note?: string
  ) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    amount: number,
    category: string,
    date: string,
    note?: string
  ) => Promise<void>;
  updateBankBalance: (budgetId: string, bankBalance: number) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  addRecurringTransaction: (
    userId: string,
    amount: number,
    category: string,
    type: 'income' | 'expense',
    frequency: 'monthly' | 'weekly' | 'daily',
    nextDate: string,
    note?: string
  ) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  processRecurringTransactions: (userId: string) => Promise<void>;
  calculateStats: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  transactions: [],
  recurringTransactions: [],
  stats: null,
  loading: false,
  error: null,

  fetchBudget: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      set({ budget: data || null });
      get().calculateStats();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTransactions: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      set({ transactions: data || [] });
      get().calculateStats();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchRecurringTransactions: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ recurringTransactions: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createBudget: async (
    userId: string,
    dailyTarget: number,
    monthlyTarget: number,
    currency: string,
    monthStartDay: number
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([
          {
            user_id: userId,
            daily_target: dailyTarget,
            monthly_target: monthlyTarget,
            currency,
            month_start_day: monthStartDay,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      set({ budget: data });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateBudget: async (
    budgetId: string,
    dailyTarget: number,
    monthlyTarget: number,
    currency: string,
    monthStartDay: number
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update({
          daily_target: dailyTarget,
          monthly_target: monthlyTarget,
          currency,
          month_start_day: monthStartDay,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      set({ budget: data });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  addTransaction: async (
    userId: string,
    amount: number,
    category: string,
    date: string,
    note?: string
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          amount,
          category,
          date,
          note: note || null,
        }])
        .select()
        .single();

      if (error) throw error;
      const newTransactions = [data, ...get().transactions];
      set({ transactions: newTransactions });
      get().calculateStats();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateTransaction: async (
    transactionId: string,
    amount: number,
    category: string,
    date: string,
    note?: string
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount,
          category,
          date,
          note: note || null,
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      const updatedTransactions = get().transactions.map((t) => 
        t.id === transactionId ? data : t
      );
      set({ transactions: updatedTransactions });
      get().calculateStats();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateBankBalance: async (budgetId: string, bankBalance: number) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update({
          bank_balance: bankBalance,
        })
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      set({ budget: data });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteTransaction: async (transactionId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;
      const filtered = get().transactions.filter((t) => t.id !== transactionId);
      set({ transactions: filtered });
      get().calculateStats();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  addRecurringTransaction: async (
    userId: string,
    amount: number,
    category: string,
    type: 'income' | 'expense',
    frequency: 'monthly' | 'weekly' | 'daily',
    nextDate: string,
    note?: string
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert([{
          user_id: userId,
          amount,
          category,
          type,
          frequency,
          next_date: nextDate,
          note: note || null,
        }])
        .select()
        .single();

      if (error) throw error;
      const newRecurring = [data, ...get().recurringTransactions];
      set({ recurringTransactions: newRecurring });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteRecurringTransaction: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      const filtered = get().recurringTransactions.filter((t) => t.id !== id);
      set({ recurringTransactions: filtered });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  processRecurringTransactions: async (userId: string) => {
    try {
      // 1. Fetch recurring transactions for user
      const { data: recurring, error: fetchErr } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', userId);
        
      if (fetchErr) throw fetchErr;
      if (!recurring || recurring.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Find ones that are due (next_date <= today)
      for (const rt of recurring) {
        let nextDate = new Date(rt.next_date);
        
        while (nextDate <= today) {
          // Add the transaction
          const amount = rt.type === 'income' ? -Math.abs(rt.amount) : Math.abs(rt.amount);
          await get().addTransaction(
            userId,
            amount,
            rt.category,
            nextDate.toISOString().split('T')[0],
            rt.note ? `${rt.note} (Auto-added)` : '(Auto-added)'
          );

          // Calculate next date
          if (rt.frequency === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (rt.frequency === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (rt.frequency === 'daily') {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        }

        // 3. Update the recurring transaction with new next_date
        if (nextDate.toISOString().split('T')[0] !== rt.next_date) {
          await supabase
            .from('recurring_transactions')
            .update({ next_date: nextDate.toISOString().split('T')[0] })
            .eq('id', rt.id);
        }
      }
      
      // Refresh state
      await get().fetchRecurringTransactions(userId);
    } catch (err) {
      console.error('Failed to process recurring transactions:', err);
    }
  },

  calculateStats: () => {
    try {
      const { budget, transactions } = get();
      if (!budget) {
        set({ stats: null });
        return;
      }
      const stats = calculateBudgetStats(transactions, budget, new Date());
      set({ stats });
    } catch (error) {
      console.error('Error calculating stats:', error);
      set({ stats: null });
    }
  },
}));
