import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Budget, Transaction, BudgetStats } from '@/types/index';
import { calculateBudgetStats } from '@/lib/budget-logic';

interface BudgetState {
  budget: Budget | null;
  transactions: Transaction[];
  stats: BudgetStats | null;
  loading: boolean;
  error: string | null;
  fetchBudget: (userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
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
  calculateStats: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  transactions: [],
  stats: null,
  loading: false,
  error: null,

  fetchBudget: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      console.log('Fetching budget for user:', userId);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      console.log('Budget fetched:', data);
      set({ budget: data || null });
      get().calculateStats();
    } catch (err: any) {
      console.error('Error fetching budget:', err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTransactions: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      console.log('Fetching transactions for user:', userId);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      console.log('Transactions fetched:', data?.length || 0);
      set({ transactions: data || [] });
      get().calculateStats();
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
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
      const transactionData = {
        user_id: userId,
        amount,
        category,
        date,
        note: note || null,
      };
      
      console.log('Sending to Supabase:', transactionData);
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
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

  calculateStats: () => {
    try {
      const { budget, transactions } = get();
      console.log('calculateStats called with budget:', budget, 'transactions:', transactions.length);
      
      if (!budget) {
        console.log('No budget, setting stats to null');
        set({ stats: null });
        return;
      }
      
      console.log('Calculating stats...');
      const stats = calculateBudgetStats(transactions, budget, new Date());
      console.log('Stats calculated:', stats);
      set({ stats });
    } catch (error) {
      console.error('Error calculating stats:', error);
      set({ stats: null, error: 'Failed to calculate stats' });
    }
  },
}));
