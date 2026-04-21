import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { Budget, Transaction, BudgetStats, RecurringTransaction, Envelope, CategoryBudgetMap } from '@/types/index';
import { calculateBudgetStats } from '@/lib/budget-logic';

interface PendingAction {
  id: string;
  type: 'ADD_TRANSACTION' | 'DELETE_TRANSACTION' | 'UPDATE_BUDGET';
  payload: any;
  timestamp: string;
}

interface TransactionDetailsInput {
  merchant?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringSourceId?: string | null;
  kind?: 'standard' | 'transfer';
  transferGroupId?: string | null;
  transferPeerEnvelopeId?: string | null;
  transferDirection?: 'incoming' | 'outgoing' | null;
}

interface BudgetState {
  budget: Budget | null;
  categoryBudgets: CategoryBudgetMap;
  envelopes: Envelope[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  stats: BudgetStats | null;
  loading: boolean;
  error: string | null;
  lastSync: string | null;
  pendingActions: PendingAction[];
  isOffline: boolean;
  setOfflineStatus: (status: boolean) => void;
  syncOfflineActions: () => Promise<void>;
  fetchBudget: (userId: string) => Promise<void>;
  fetchEnvelopes: (userId: string) => Promise<void>;
  createEnvelope: (userId: string, name: string, icon: string, balance: number, currency: string, is_default?: boolean) => Promise<void>;
  updateEnvelope: (envelopeId: string, name: string, icon: string, balance: number, currency: string) => Promise<void>;
  deleteEnvelope: (envelopeId: string) => Promise<void>;
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
  updateBankBalance: (budgetId: string, bankBalance: number) => Promise<void>;
  saveCategoryBudgets: (budgetId: string, categoryBudgets: CategoryBudgetMap) => Promise<void>;
  addTransaction: (
    userId: string,
    amount: number,
    category: string,
    date: string,
    note?: string,
    envelopeId?: string | null,
    details?: TransactionDetailsInput
  ) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    amount: number,
    category: string,
    date: string,
    note?: string,
    envelopeId?: string | null,
    details?: TransactionDetailsInput
  ) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  createTransfer: (
    userId: string,
    amount: number,
    fromAccountId: 'bank' | string,
    toAccountId: 'bank' | string,
    date: string,
    note?: string
  ) => Promise<void>;
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
  clearData: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budget: null,
      categoryBudgets: {},
      envelopes: [],
      transactions: [],
      recurringTransactions: [],
      stats: null,
      loading: false,
      error: null,
      lastSync: null,
      pendingActions: [],
      isOffline: false,

      setOfflineStatus: (status: boolean) => set({ isOffline: status }),

      syncOfflineActions: async () => {
        const { pendingActions, isOffline } = get();
        if (isOffline || pendingActions.length === 0) return;

        set({ loading: true });
        try {
          const sortedActions = [...pendingActions].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          for (const action of sortedActions) {
            if (action.type === 'ADD_TRANSACTION') {
              const { userId, amount, category, date, note, envelopeId, details } = action.payload;
              await supabase.from('transactions').insert([{
                user_id: userId,
                amount,
                category,
                date,
                note,
                envelope_id: envelopeId || null,
                merchant: details?.merchant || null,
                tags: details?.tags || [],
                is_recurring: Boolean(details?.isRecurring),
                recurring_source_id: details?.recurringSourceId || null,
                kind: details?.kind || 'standard',
                transfer_group_id: details?.transferGroupId || null,
                transfer_peer_envelope_id: details?.transferPeerEnvelopeId || null,
                transfer_direction: details?.transferDirection || null,
              }]);
            } else if (action.type === 'DELETE_TRANSACTION') {
              await supabase.from('transactions').delete().eq('id', action.payload.transactionId);
            }
          }
          
          set({ pendingActions: [], lastSync: new Date().toISOString() });
          
          // Refresh data after sync
          const userId = get().budget?.user_id;
          if (userId) {
            await get().fetchTransactions(userId);
            await get().fetchBudget(userId);
          }
        } catch (error) {
          console.error('Sync failed:', error);
        } finally {
          set({ loading: false });
        }
      },

      clearData: () => {
        set({ budget: null, categoryBudgets: {}, transactions: [], recurringTransactions: [], stats: null, lastSync: null, pendingActions: [] });
      },

  fetchBudget: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      const nextBudget = data || null;
      set({
        budget: nextBudget,
        categoryBudgets: nextBudget?.category_budgets && typeof nextBudget.category_budgets === 'object'
          ? nextBudget.category_budgets
          : {},
      });
      get().calculateStats();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchEnvelopes: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('envelopes')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ envelopes: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createEnvelope: async (
    userId: string,
    name: string,
    icon: string,
    balance: number,
    currency: string,
    is_default: boolean = false
  ) => {
    set({ loading: true, error: null });
    try {
      const existing = get().envelopes;
      const isFirst = existing.length === 0;
      
      const { data, error } = await supabase
        .from('envelopes')
        .insert([{
          user_id: userId,
          name,
          icon,
          balance,
          currency,
          is_default: isFirst || is_default,
        }])
        .select()
        .single();

      if (error) throw error;
      set({ envelopes: [...existing, data] });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateEnvelope: async (
    envelopeId: string,
    name: string,
    icon: string,
    balance: number,
    currency: string
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('envelopes')
        .update({ name, icon, balance, currency })
        .eq('id', envelopeId)
        .select()
        .single();

      if (error) throw error;
      const updated = get().envelopes.map(e => e.id === envelopeId ? data : e);
      set({ envelopes: updated });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteEnvelope: async (envelopeId: string) => {
    set({ loading: true, error: null });
    try {
      const envelopeToDelete = get().envelopes.find(e => e.id === envelopeId);
      if (envelopeToDelete?.is_default) {
        throw new Error("Cannot delete default envelope");
      }

      const { error } = await supabase
        .from('envelopes')
        .delete()
        .eq('id', envelopeId);

      if (error) throw error;
      const filtered = get().envelopes.filter(e => e.id !== envelopeId);
      set({ envelopes: filtered });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
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
            category_budgets: {},
            currency,
            month_start_day: monthStartDay,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      set({
        budget: data,
        categoryBudgets: data?.category_budgets && typeof data.category_budgets === 'object'
          ? data.category_budgets
          : {},
      });
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
      set({
        budget: data,
        categoryBudgets: data?.category_budgets && typeof data.category_budgets === 'object'
          ? data.category_budgets
          : {},
      });
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
    note?: string,
    envelopeId?: string | null,
    details?: TransactionDetailsInput
  ) => {
    set({ loading: true, error: null });
    try {
      if (get().isOffline) {
        const newTx = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          amount,
          category,
          date,
          note: note || null,
          merchant: details?.merchant || null,
          tags: details?.tags || [],
          is_recurring: Boolean(details?.isRecurring),
          recurring_source_id: details?.recurringSourceId || null,
          kind: details?.kind || 'standard',
          transfer_group_id: details?.transferGroupId || null,
          transfer_peer_envelope_id: details?.transferPeerEnvelopeId || null,
          transfer_direction: details?.transferDirection || null,
          envelope_id: envelopeId || null,
          created_at: new Date().toISOString()
        };
        set(state => ({
          transactions: [newTx, ...state.transactions],
          pendingActions: [...state.pendingActions, {
            id: `act-${Date.now()}`,
            type: 'ADD_TRANSACTION',
            payload: { userId, amount, category, date, note, envelopeId, details },
            timestamp: new Date().toISOString()
          }]
        }));
        get().calculateStats();
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          amount,
          category,
          date,
          note: note || null,
          merchant: details?.merchant || null,
          tags: details?.tags || [],
          is_recurring: Boolean(details?.isRecurring),
          recurring_source_id: details?.recurringSourceId || null,
          kind: details?.kind || 'standard',
          transfer_group_id: details?.transferGroupId || null,
          transfer_peer_envelope_id: details?.transferPeerEnvelopeId || null,
          transfer_direction: details?.transferDirection || null,
          envelope_id: envelopeId || null,
        }])
        .select()
        .single();

      if (error) throw error;
      const newTransactions = [data, ...get().transactions];
      
      // Update envelope balance if applicable
      // Convention: expense = +amount (positive), income = -amount (negative)
      // So balance -= amount  means: expense reduces balance, income increases it
      if (envelopeId) {
        const envelope = get().envelopes.find(e => e.id === envelopeId);
        if (envelope) {
          const newBalance = envelope.balance - amount;
          await get().updateEnvelope(envelope.id, envelope.name, envelope.icon, newBalance, envelope.currency);
        }
      } else {
        // Fallback to bank_balance
        const budget = get().budget;
        if (budget) {
          await get().updateBankBalance(budget.id, budget.bank_balance - amount);
        }
      }

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
    note?: string,
    envelopeId?: string | null,
    details?: TransactionDetailsInput
  ) => {
    set({ loading: true, error: null });
    try {
      const existingTx = get().transactions.find(t => t.id === transactionId);
      if (!existingTx) throw new Error("Transaction not found");

      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount,
          category,
          date,
          note: note || null,
          merchant: details?.merchant || null,
          tags: details?.tags || [],
          is_recurring: Boolean(details?.isRecurring),
          recurring_source_id: details?.recurringSourceId || null,
          kind: details?.kind || existingTx.kind || 'standard',
          transfer_group_id: details?.transferGroupId || existingTx.transfer_group_id || null,
          transfer_peer_envelope_id: details?.transferPeerEnvelopeId || null,
          transfer_direction: details?.transferDirection || null,
          envelope_id: envelopeId || null,
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      // Handle balance updates
      // Convention: expense = +amount, income = -amount → balance -= amount
      // diff = newAmount - oldAmount; applying diff: balance -= diff (reverses old, applies new)
      const diff = amount - existingTx.amount;
      
      if (existingTx.envelope_id === envelopeId) {
        if (envelopeId) {
          const env = get().envelopes.find(e => e.id === envelopeId);
          if (env) await get().updateEnvelope(env.id, env.name, env.icon, env.balance - diff, env.currency);
        } else {
          const budget = get().budget;
          if (budget) await get().updateBankBalance(budget.id, budget.bank_balance - diff);
        }
      } else {
        // Changed destination! Refund old, apply to new.
        if (existingTx.envelope_id) {
           const oldEnv = get().envelopes.find(e => e.id === existingTx.envelope_id);
           if (oldEnv) await get().updateEnvelope(oldEnv.id, oldEnv.name, oldEnv.icon, oldEnv.balance + existingTx.amount, oldEnv.currency);
        } else {
           const budget = get().budget;
           if (budget) await get().updateBankBalance(budget.id, budget.bank_balance + existingTx.amount);
        }

        if (envelopeId) {
           const newEnv = get().envelopes.find(e => e.id === envelopeId);
           if (newEnv) await get().updateEnvelope(newEnv.id, newEnv.name, newEnv.icon, newEnv.balance - amount, newEnv.currency);
        } else {
           const budget = get().budget;
           if (budget) await get().updateBankBalance(budget.id, budget.bank_balance - amount);
        }
      }

      const updated = get().transactions.map((t) =>
        t.id === transactionId ? data : t
      );
      set({ transactions: updated });
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
      set({
        budget: data,
        categoryBudgets: data?.category_budgets && typeof data.category_budgets === 'object'
          ? data.category_budgets
          : {},
      });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  saveCategoryBudgets: async (budgetId: string, categoryBudgets: CategoryBudgetMap) => {
    set({ loading: true, error: null });
    const sanitizedBudgets = Object.fromEntries(
      Object.entries(categoryBudgets).filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    );

    try {
      const { data, error } = await supabase
        .from('budgets')
        .update({
          category_budgets: sanitizedBudgets,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      set({ budget: data, categoryBudgets: sanitizedBudgets });
    } catch (err: any) {
      const message = err?.message || '';
      if (
        message.includes('category_budgets') ||
        message.includes('Could not find') ||
        message.includes('schema cache')
      ) {
        set({ error: 'Category budget syncing is not enabled in Supabase yet. Run add_category_budgets_column.sql, then try again.' });
      } else {
        set({ error: message });
      }
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  createTransfer: async (
    userId: string,
    amount: number,
    fromAccountId: 'bank' | string,
    toAccountId: 'bank' | string,
    date: string,
    note?: string
  ) => {
    set({ loading: true, error: null });
    try {
      if (amount <= 0) throw new Error('Transfer amount must be greater than zero.');
      if (fromAccountId === toAccountId) throw new Error('Choose different source and destination accounts.');
      if (get().isOffline) throw new Error('Transfers require an online connection right now.');

      const transferGroupId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `transfer-${Date.now()}`;

      const fromEnvelopeId = fromAccountId === 'bank' ? null : fromAccountId;
      const toEnvelopeId = toAccountId === 'bank' ? null : toAccountId;

      const payload = [
        {
          user_id: userId,
          amount,
          category: 'Transfer',
          date,
          note: note || 'Transfer out',
          kind: 'transfer',
          transfer_group_id: transferGroupId,
          transfer_peer_envelope_id: toEnvelopeId,
          transfer_direction: 'outgoing',
          envelope_id: fromEnvelopeId,
          tags: ['transfer'],
          is_recurring: false,
        },
        {
          user_id: userId,
          amount: -amount,
          category: 'Transfer',
          date,
          note: note || 'Transfer in',
          kind: 'transfer',
          transfer_group_id: transferGroupId,
          transfer_peer_envelope_id: fromEnvelopeId,
          transfer_direction: 'incoming',
          envelope_id: toEnvelopeId,
          tags: ['transfer'],
          is_recurring: false,
        },
      ];

      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select();

      if (error) throw error;

      if (fromEnvelopeId) {
        const sourceEnvelope = get().envelopes.find((envelope) => envelope.id === fromEnvelopeId);
        if (sourceEnvelope) {
          await get().updateEnvelope(
            sourceEnvelope.id,
            sourceEnvelope.name,
            sourceEnvelope.icon,
            sourceEnvelope.balance - amount,
            sourceEnvelope.currency
          );
        }
      } else {
        const currentBudget = get().budget;
        if (currentBudget) await get().updateBankBalance(currentBudget.id, currentBudget.bank_balance - amount);
      }

      if (toEnvelopeId) {
        const targetEnvelope = get().envelopes.find((envelope) => envelope.id === toEnvelopeId);
        if (targetEnvelope) {
          await get().updateEnvelope(
            targetEnvelope.id,
            targetEnvelope.name,
            targetEnvelope.icon,
            targetEnvelope.balance + amount,
            targetEnvelope.currency
          );
        }
      } else {
        const currentBudget = get().budget;
        if (currentBudget) await get().updateBankBalance(currentBudget.id, currentBudget.bank_balance + amount);
      }

      set({ transactions: [...(data || []), ...get().transactions] });
      get().calculateStats();
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
      if (get().isOffline) {
        // If it's a temporary offline transaction, just remove it
        if (transactionId.startsWith('temp-')) {
          set(state => ({
            transactions: state.transactions.filter(t => t.id !== transactionId),
            // Optionally remove the pending action that created it if we want to be clean, 
            // but just filtering is fine for now
          }));
        } else {
          // If it's a real transaction from DB, add a delete pending action
          set(state => ({
            transactions: state.transactions.filter(t => t.id !== transactionId),
            pendingActions: [...state.pendingActions, {
              id: `act-${Date.now()}`,
              type: 'DELETE_TRANSACTION',
              payload: { transactionId },
              timestamp: new Date().toISOString()
            }]
          }));
        }
        get().calculateStats();
        return;
      }

      const txToDelete = get().transactions.find(t => t.id === transactionId);

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Reverse the balance effect of the deleted transaction
      if (txToDelete) {
        if (txToDelete.envelope_id) {
          const env = get().envelopes.find(e => e.id === txToDelete.envelope_id);
          if (env) await get().updateEnvelope(env.id, env.name, env.icon, env.balance + txToDelete.amount, env.currency);
        } else {
          const budget = get().budget;
          if (budget) await get().updateBankBalance(budget.id, budget.bank_balance + txToDelete.amount);
        }
      }

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
            rt.note ? `${rt.note} (Auto-added)` : '(Auto-added)',
            undefined,
            {
              isRecurring: true,
              recurringSourceId: rt.id,
            }
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
}),
{
  name: 'budget-storage',
  storage: createJSONStorage(() => AsyncStorage),
}
)
);
