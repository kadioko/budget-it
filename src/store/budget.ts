import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Budget, Transaction, BudgetStats, RecurringTransaction, Envelope, CategoryBudgetMap, SavingsGoal } from '@/types/index';
import { calculateBudgetStats, getBudgetCycleWindow, toDateKey } from '@/lib/budget-logic';

interface PendingAction {
  id: string;
  type: 'ADD_TRANSACTION' | 'DELETE_TRANSACTION' | 'UPDATE_BUDGET';
  payload: any;
  timestamp: string;
}

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const applyCachedBalanceDelta = <T extends Pick<BudgetState, 'budget' | 'envelopes'>>(
  state: T,
  envelopeId: string | null | undefined,
  delta: number
) => ({
  budget: envelopeId || !state.budget
    ? state.budget
    : { ...state.budget, bank_balance: state.budget.bank_balance + delta },
  envelopes: envelopeId
    ? state.envelopes.map((envelope) => envelope.id === envelopeId
      ? { ...envelope, balance: envelope.balance + delta }
      : envelope)
    : state.envelopes,
});

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

interface BudgetRolloverState {
  lastAppliedCycleStart: string | null;
  categoryCarryovers: CategoryBudgetMap;
  lastSummary: {
    cycleStart: string;
    cycleEnd: string;
    categoryCarryovers: CategoryBudgetMap;
  } | null;
}

interface BudgetState {
  budget: Budget | null;
  categoryBudgets: CategoryBudgetMap;
  envelopes: Envelope[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  savingsGoals: SavingsGoal[];
  rolloverState: BudgetRolloverState;
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
  fetchSavingsGoals: (userId: string) => Promise<void>;
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
  addSavingsGoal: (
    userId: string,
    name: string,
    targetAmount: number,
    currentAmount: number,
    targetDate: string,
    note?: string,
    linkedEnvelopeId?: string | null
  ) => Promise<void>;
  updateSavingsGoal: (
    goalId: string,
    name: string,
    targetAmount: number,
    currentAmount: number,
    targetDate: string,
    note?: string,
    linkedEnvelopeId?: string | null
  ) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;
  processRecurringTransactions: (userId: string) => Promise<void>;
  applyMonthlyRollover: () => void;
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
      savingsGoals: [],
      rolloverState: {
        lastAppliedCycleStart: null,
        categoryCarryovers: {},
        lastSummary: null,
      },
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
              const { userId, amount, category, date, note, envelopeId, details, clientRequestId } = action.payload;
              const { error } = await supabase.rpc('budget_it_apply_transaction', {
                p_user_id: userId,
                p_amount: amount,
                p_category: category,
                p_date: date,
                p_note: note || null,
                p_envelope_id: envelopeId || null,
                p_merchant: details?.merchant || null,
                p_tags: details?.tags || [],
                p_is_recurring: Boolean(details?.isRecurring),
                p_recurring_source_id: details?.recurringSourceId || null,
                p_client_request_id: clientRequestId,
              });
              if (error) throw error;
            } else if (action.type === 'DELETE_TRANSACTION') {
              const { error } = await supabase.rpc('budget_it_delete_transaction', {
                p_user_id: action.payload.userId,
                p_transaction_id: action.payload.transactionId,
              });
              if (error) throw error;
            }

            set((state) => ({ pendingActions: state.pendingActions.filter((pending) => pending.id !== action.id) }));
          }

          set({ lastSync: new Date().toISOString() });

          const userId = sortedActions[0]?.payload?.userId || get().budget?.user_id;
          if (userId) {
            await get().fetchTransactions(userId);
            await get().fetchBudget(userId);
            await get().fetchEnvelopes(userId);
          }
        } catch (error: any) {
          console.error('Sync failed:', error);
          set({ error: error?.message || 'Could not sync offline changes. We will retry when your connection is stable.' });
        } finally {
          set({ loading: false });
        }
      },

      clearData: () => {
        set({
          budget: null,
          categoryBudgets: {},
          transactions: [],
          recurringTransactions: [],
          savingsGoals: [],
          rolloverState: {
            lastAppliedCycleStart: null,
            categoryCarryovers: {},
            lastSummary: null,
          },
          stats: null,
          lastSync: null,
          pendingActions: [],
        });
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
        get().applyMonthlyRollover();
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
      if ((envelopeToDelete?.balance || 0) !== 0) {
        throw new Error('Move this envelope balance before deleting it.');
      }
      if (get().transactions.some((transaction) => transaction.envelope_id === envelopeId)) {
        throw new Error('This envelope has transaction history and cannot be deleted.');
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
      get().applyMonthlyRollover();
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
      const clientRequestId = createRequestId();
      if (get().isOffline) {
        const newTx = {
          id: `temp-${clientRequestId}`,
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
          client_request_id: clientRequestId,
          created_at: new Date().toISOString()
        };
        set(state => ({
          ...applyCachedBalanceDelta(state, envelopeId, -amount),
          transactions: [newTx, ...state.transactions],
          pendingActions: [...state.pendingActions, {
            id: clientRequestId,
            type: 'ADD_TRANSACTION',
            payload: { userId, amount, category, date, note, envelopeId, details, clientRequestId },
            timestamp: new Date().toISOString()
          }]
        }));
        get().calculateStats();
        return;
      }

      const { data, error } = await supabase.rpc('budget_it_apply_transaction', {
        p_user_id: userId,
        p_amount: amount,
        p_category: category,
        p_date: date,
        p_note: note || null,
        p_envelope_id: envelopeId || null,
        p_merchant: details?.merchant || null,
        p_tags: details?.tags || [],
        p_is_recurring: Boolean(details?.isRecurring),
        p_recurring_source_id: details?.recurringSourceId || null,
        p_client_request_id: clientRequestId,
      });

      if (error) throw error;
      const newTransactions = [data, ...get().transactions];
      set({ transactions: newTransactions });
      await Promise.all([get().fetchBudget(userId), get().fetchEnvelopes(userId)]);
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

      const { data, error } = await supabase.rpc('budget_it_update_transaction', {
        p_user_id: existingTx.user_id,
        p_transaction_id: transactionId,
        p_amount: amount,
        p_category: category,
        p_date: date,
        p_note: note || null,
        p_envelope_id: envelopeId || null,
        p_merchant: details?.merchant || null,
        p_tags: details?.tags || [],
        p_is_recurring: Boolean(details?.isRecurring),
        p_recurring_source_id: details?.recurringSourceId || null,
      });

      if (error) throw error;

      const updated = get().transactions.map((t) =>
        t.id === transactionId ? data : t
      );
      set({ transactions: updated });
      await Promise.all([get().fetchBudget(existingTx.user_id), get().fetchEnvelopes(existingTx.user_id)]);
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

  fetchSavingsGoals: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('target_date', { ascending: true });

      if (error) throw error;
      set({ savingsGoals: data || [] });
    } catch (err: any) {
      set({ error: err.message });
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

      const fromEnvelopeId = fromAccountId === 'bank' ? null : fromAccountId;
      const toEnvelopeId = toAccountId === 'bank' ? null : toAccountId;

      const { data, error } = await supabase.rpc('budget_it_create_transfer', {
        p_user_id: userId,
        p_amount: amount,
        p_from_envelope_id: fromEnvelopeId,
        p_to_envelope_id: toEnvelopeId,
        p_date: date,
        p_note: note || null,
      });

      if (error) throw error;
      set({ transactions: [...(data || []), ...get().transactions] });
      await Promise.all([get().fetchBudget(userId), get().fetchEnvelopes(userId)]);
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
        const transaction = get().transactions.find((item) => item.id === transactionId);
        if (!transaction) throw new Error('Transaction not found');
        if (transaction.kind === 'transfer') throw new Error('Transfers require an online connection and must be managed as a pair.');

        // If it's a temporary offline transaction, just remove it
        if (transactionId.startsWith('temp-')) {
          set(state => ({
            ...applyCachedBalanceDelta(state, transaction.envelope_id, transaction.amount),
            transactions: state.transactions.filter(t => t.id !== transactionId),
            pendingActions: state.pendingActions.filter((action) => action.id !== transaction.client_request_id),
          }));
        } else {
          // If it's a real transaction from DB, add a delete pending action
          set(state => ({
            ...applyCachedBalanceDelta(state, transaction.envelope_id, transaction.amount),
            transactions: state.transactions.filter(t => t.id !== transactionId),
            pendingActions: [...state.pendingActions, {
              id: createRequestId(),
              type: 'DELETE_TRANSACTION',
              payload: { transactionId, userId: transaction.user_id },
              timestamp: new Date().toISOString()
            }]
          }));
        }
        get().calculateStats();
        return;
      }

      const txToDelete = get().transactions.find(t => t.id === transactionId);

      if (!txToDelete) throw new Error('Transaction not found');
      const { error } = await supabase.rpc('budget_it_delete_transaction', {
        p_user_id: txToDelete.user_id,
        p_transaction_id: transactionId,
      });

      if (error) throw error;

      const filtered = get().transactions.filter((t) => t.id !== transactionId);
      set({ transactions: filtered });
      await Promise.all([get().fetchBudget(txToDelete.user_id), get().fetchEnvelopes(txToDelete.user_id)]);
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

  addSavingsGoal: async (
    userId: string,
    name: string,
    targetAmount: number,
    currentAmount: number,
    targetDate: string,
    note?: string,
    linkedEnvelopeId?: string | null
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert([{
          user_id: userId,
          name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          target_date: targetDate,
          note: note || null,
          linked_envelope_id: linkedEnvelopeId || null,
        }])
        .select()
        .single();

      if (error) throw error;
      set({ savingsGoals: [...get().savingsGoals, data].sort((a, b) => a.target_date.localeCompare(b.target_date)) });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateSavingsGoal: async (
    goalId: string,
    name: string,
    targetAmount: number,
    currentAmount: number,
    targetDate: string,
    note?: string,
    linkedEnvelopeId?: string | null
  ) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .update({
          name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          target_date: targetDate,
          note: note || null,
          linked_envelope_id: linkedEnvelopeId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      set({
        savingsGoals: get().savingsGoals
          .map((goal) => goal.id === goalId ? data : goal)
          .sort((a, b) => a.target_date.localeCompare(b.target_date)),
      });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteSavingsGoal: async (goalId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      set({ savingsGoals: get().savingsGoals.filter((goal) => goal.id !== goalId) });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

    processRecurringTransactions: async (userId: string) => {
    try {
      if (get().isOffline) return;
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
            toDateKey(nextDate),
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
        if (toDateKey(nextDate) !== rt.next_date) {
          const { error: updateError } = await supabase
            .from('recurring_transactions')
            .update({ next_date: toDateKey(nextDate) })
            .eq('id', rt.id);
          if (updateError) throw updateError;
        }
      }
      
      // Refresh state
        await get().fetchRecurringTransactions(userId);
      } catch (err) {
        console.error('Failed to process recurring transactions:', err);
      }
    },

  applyMonthlyRollover: () => {
      try {
        const { budget, transactions, categoryBudgets, rolloverState } = get();
        if (!budget) return;

        const now = new Date();
        const currentCycle = getBudgetCycleWindow(now, budget.month_start_day);
        const currentCycleStart = toDateKey(currentCycle.monthStart);
        if (rolloverState.lastAppliedCycleStart === currentCycleStart) return;

        const previousCycle = getBudgetCycleWindow(new Date(currentCycle.monthStart.getTime() - 24 * 60 * 60 * 1000), budget.month_start_day);
        const previousCycleStart = toDateKey(previousCycle.monthStart);
        const previousCycleEnd = toDateKey(previousCycle.monthEnd);
        const sourceBudgets = budget.category_budgets && Object.keys(budget.category_budgets).length > 0
          ? budget.category_budgets
          : categoryBudgets;

        const categoryCarryovers = Object.fromEntries(
          Object.entries(sourceBudgets || {}).map(([category, limit]) => {
            const spent = transactions
              .filter((transaction) =>
                transaction.amount > 0 &&
                transaction.category === category &&
                transaction.date >= previousCycleStart &&
                transaction.date <= previousCycleEnd
              )
              .reduce((sum, transaction) => sum + transaction.amount, 0);
            return [category, Math.max(0, Number(limit) - spent)];
          }).filter(([, carryover]) => Number.isFinite(carryover))
        );

        set({
          rolloverState: {
            lastAppliedCycleStart: currentCycleStart,
            categoryCarryovers,
            lastSummary: {
              cycleStart: previousCycleStart,
              cycleEnd: previousCycleEnd,
              categoryCarryovers,
            },
          },
        });
      } catch (error) {
        console.error('Failed to apply monthly rollover:', error);
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
