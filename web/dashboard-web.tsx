import React, { useState, useEffect, useMemo, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { useI18n } from '../src/store/language';
import { useNotificationSettingsStore } from '../src/store/notifications';
import { themeTokens, useThemeStore } from '../src/store/theme';
import { getBudgetCycleWindow } from '../src/lib/budget-logic';
import { isWebNotificationSupported, requestWebNotificationPermission, sendWebBudgetNotification } from '../src/lib/web-notifications';
import SettingsWeb from './settings-web';
import AddTransactionWeb from './add-transaction-web';
import TransactionsWeb from './transactions-web';
import AnalyticsWeb from './analytics-web';
import TransferFundsWeb from './transfer-funds-web';
import HelpGuidesWeb from './help-guides-web';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

const formatCurrency = (amount: number, currency: string) => {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  if (currency === 'TZS') {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TZS';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
};

const getDaysUntilEndOfCycle = (monthStartDay = 1) => {
  const now = new Date();
  const { monthEnd } = getBudgetCycleWindow(now, monthStartDay);
  return Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
};

const getDateInfo = () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// Progress bar component
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;
  return (
    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        backgroundColor: isOver ? 'var(--danger)' : color,
        borderRadius: '4px',
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

// Stat card component
function StatCard({ title, value, subtitle, color, progress, progressMax, progressColor, icon }: {
  title: string; value: string; subtitle: string; color: string;
  progress?: number; progressMax?: number; progressColor?: string; icon: string;
}) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.96) 100%)', borderRadius: '22px', padding: '22px',
      boxShadow: '0 20px 40px rgba(15,23,42,0.18)', border: '1px solid rgba(148,163,184,0.16)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{title}</div>
          <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: color, boxShadow: `0 0 18px ${color}` }} />
        </div>
        <div style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.8px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.56)', marginTop: '8px', lineHeight: 1.5 }}>{subtitle}</div>
      {progress !== undefined && progressMax !== undefined && (
        <ProgressBar value={progress} max={progressMax} color={progressColor || color} />
      )}
    </div>
  );
}

// Toast notification
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: type === 'success' ? 'var(--success)' : 'var(--danger)',
      color: '#fff', padding: '12px 24px', borderRadius: '12px',
      boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: '600',
      zIndex: 9999, whiteSpace: 'nowrap', maxWidth: '90vw',
      animation: 'slideUp 0.3s ease',
    }}>
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  );
}

type DashboardEditDraft = {
  amount: string;
  category: string;
  date: string;
  note: string;
  merchant: string;
  type: 'expense' | 'income';
};

type DashboardNotification = {
  id: string;
  kind: 'overspend' | 'category' | 'recurring' | 'weekly';
  tone: 'info' | 'warning' | 'success';
  title: string;
  body: string;
};

export default function DashboardWeb() {
  const { user } = useAuthStore();
  const { budget, categoryBudgets, envelopes, stats, transactions, recurringTransactions, savingsGoals, rolloverState, isOffline, pendingActions, setOfflineStatus, syncOfflineActions, fetchBudget, fetchEnvelopes, fetchTransactions, fetchRecurringTransactions, fetchSavingsGoals, processRecurringTransactions, updateTransaction, deleteTransaction, loading } = useBudgetStore();
  const { t, tr } = useI18n();
  const {
    browserAlertsEnabled,
    overspendAlertsEnabled,
    recurringAlertsEnabled,
    weeklySummaryAlertsEnabled,
    inbox,
    loadPreferences,
    syncPreferences,
    fetchInbox,
    triggerScheduler,
  } = useNotificationSettingsStore();
  const { mode } = useThemeStore();
  const theme = themeTokens[mode];
  const isLightMode = mode === 'light';
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'add-transaction' | 'transactions' | 'analytics' | 'transfer' | 'guides'>('dashboard');
  const [quickAddPreset, setQuickAddPreset] = useState<{ type: 'expense' | 'income'; category?: string; note?: string } | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<'all' | 'bank' | string>('all');
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState<'7d' | 'cycle' | 'all'>('7d');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState<string>('all');
  const [dashboardEditingTransactionId, setDashboardEditingTransactionId] = useState<string | null>(null);
  const [dashboardEditDraft, setDashboardEditDraft] = useState<DashboardEditDraft | null>(null);
  const [dashboardEditError, setDashboardEditError] = useState('');
  const [dashboardEditBusy, setDashboardEditBusy] = useState(false);
  const [dashboardDeletingId, setDashboardDeletingId] = useState<string | null>(null);
  const [browserAlertsSupported, setBrowserAlertsSupported] = useState(false);
  const [browserAlertPermission, setBrowserAlertPermission] = useState<'default' | 'denied' | 'granted'>('default');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Network listener - use refs to avoid re-subscribing on store changes
  const syncOfflineActionsRef = useRef(syncOfflineActions);
  const tRef = useRef(t);
  syncOfflineActionsRef.current = syncOfflineActions;
  tRef.current = t;
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setOfflineStatus(offline);
      
      // If we just came back online and have pending actions, sync them
      if (!offline && pendingActions.length > 0) {
        showToast(tRef.current('dashboard.backOnlineSyncing'), 'success');
        syncOfflineActionsRef.current().then(() => {
          showToast(tRef.current('dashboard.syncComplete'), 'success');
        });
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingActions.length]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchBudget(user.id), 
        fetchEnvelopes(user.id),
        fetchTransactions(user.id),
        fetchRecurringTransactions(user.id),
        fetchSavingsGoals(user.id),
        processRecurringTransactions(user.id)
      ]).finally(() => setDataReady(true));
      const timer = setTimeout(() => setDataReady(true), 5000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => setIsMobile(window.innerWidth < 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    loadPreferences(user.id).catch(() => {});
    triggerScheduler(user.id)
      .catch(() => {})
      .finally(() => {
        fetchInbox(user.id).catch(() => {});
      });
  }, [fetchInbox, loadPreferences, triggerScheduler, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    syncPreferences(user.id).catch(() => {});
  }, [
    browserAlertsEnabled,
    overspendAlertsEnabled,
    recurringAlertsEnabled,
    syncPreferences,
    user?.id,
    weeklySummaryAlertsEnabled,
  ]);

  useEffect(() => {
    if (!isWebNotificationSupported()) return;
    setBrowserAlertsSupported(true);
    setBrowserAlertPermission(Notification.permission);
  }, []);

  const accountOptions = useMemo(() => {
    const baseOptions = [{ id: 'bank', label: t('dashboard.bankAccount'), icon: '🏦', balance: budget?.bank_balance || 0, currency: budget?.currency || 'USD' }];
    const envelopeOptions = (envelopes || []).map((env) => ({ id: env.id, label: env.name, icon: env.icon, balance: env.balance, currency: env.currency }));
    const totalBalance = baseOptions.reduce((sum, item) => sum + item.balance, 0) + envelopeOptions.reduce((sum, item) => sum + item.balance, 0);

    return [
      { id: 'all', label: t('dashboard.allAccounts'), icon: '🧾', balance: totalBalance, currency: budget?.currency || 'USD' },
      ...baseOptions,
      ...envelopeOptions,
    ];
  }, [budget?.bank_balance, budget?.currency, envelopes, t]);

  const selectedAccount = useMemo(
    () => accountOptions.find((option) => option.id === selectedAccountId) || accountOptions[0],
    [accountOptions, selectedAccountId]
  );

  useEffect(() => {
    if (!selectedAccount) {
      setSelectedAccountId('all');
      return;
    }

    if (selectedAccountId !== 'all' && !accountOptions.some((option) => option.id === selectedAccountId)) {
      setSelectedAccountId('all');
    }
  }, [accountOptions, selectedAccount, selectedAccountId]);

  const dashboardCategoryOptions = useMemo(
    () => ['all', ...Array.from(new Set((transactions || []).map((transaction) => transaction.category))).sort((a, b) => a.localeCompare(b))],
    [transactions]
  );

  const recentTransactions = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const cycleWindow = budget
      ? getBudgetCycleWindow(now, budget.month_start_day)
      : { monthStart: new Date(now.getFullYear(), now.getMonth(), 1), monthEnd: now };

    return [...transactions]
      .filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        const matchesAccount = selectedAccountId === 'all'
          ? true
          : selectedAccountId === 'bank'
            ? !transaction.envelope_id
            : transaction.envelope_id === selectedAccountId;
        const matchesCategory = dashboardCategoryFilter === 'all' || transaction.category === dashboardCategoryFilter;
        const matchesTime = dashboardTimeFilter === 'all'
          ? true
          : dashboardTimeFilter === '7d'
            ? transactionDate >= sevenDaysAgo
            : transactionDate >= cycleWindow.monthStart && transactionDate <= cycleWindow.monthEnd;
        return matchesAccount && matchesCategory && matchesTime;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [budget, dashboardCategoryFilter, dashboardTimeFilter, selectedAccountId, transactions]);

  const budgetInsights = useMemo(() => {
    if (!budget || !stats) return null;

    const today = new Date();
    const { monthStart, monthEnd } = getBudgetCycleWindow(today, budget.month_start_day);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const elapsedDays = Math.max(1, Math.ceil((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const remainingDays = Math.max(1, Math.ceil((monthEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const burnRate = stats.spentMonthToDate / elapsedDays;
    const safeDailySpend = stats.monthlyRemaining / remainingDays;
    const weeklyStart = new Date(today);
    weeklyStart.setDate(today.getDate() - 6);
    const weeklyStartStr = weeklyStart.toISOString().split('T')[0];
    const weekSpent = transactions
      .filter((transaction) => transaction.amount > 0 && transaction.date >= weeklyStartStr && transaction.date <= todayStr)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const trackedCategoryBudgets = budget.category_budgets && Object.keys(budget.category_budgets).length > 0
      ? budget.category_budgets
      : categoryBudgets;

    const categoryRows = Object.entries(trackedCategoryBudgets || {})
      .filter(([, limit]) => Number.isFinite(limit) && limit > 0)
      .map(([category, limit]) => {
        const carryover = rolloverState.categoryCarryovers?.[category] || 0;
        const effectiveLimit = limit + carryover;
        const spent = transactions
          .filter((transaction) =>
            transaction.amount > 0 &&
            transaction.category === category &&
            transaction.date >= monthStartStr &&
            transaction.date <= monthEndStr
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const remaining = Math.max(0, effectiveLimit - spent);
        const percent = effectiveLimit > 0 ? Math.min(100, Math.round((spent / effectiveLimit) * 100)) : 0;
        return {
          category,
          limit,
          effectiveLimit,
          carryover,
          spent,
          remaining,
          percent,
          status: spent > effectiveLimit ? 'over' : percent >= 85 ? 'warning' : 'ok',
        };
      })
      .sort((a, b) => b.percent - a.percent);

    return {
      burnRate,
      safeDailySpend,
      projectedGap: stats.projectedMonthEnd - budget.monthly_target,
      weekSpent,
      remainingDays,
      categoryRows,
    };
  }, [budget, categoryBudgets, rolloverState.categoryCarryovers, stats, transactions]);

  const notifications = useMemo<DashboardNotification[]>(() => {
    if (!budget || !stats) return [];

    const items: DashboardNotification[] = [];
    if (budgetInsights?.projectedGap && budgetInsights.projectedGap > 0) {
      items.push({
        id: 'monthly-over',
        kind: 'overspend',
        tone: 'warning',
        title: t('dashboard.monthlyOverspendWarning'),
        body: tr('dashboard.monthlyOverspendBody', {
          amount: formatCurrency(budgetInsights.projectedGap, budget.currency),
        }),
      });
    }

    if (budgetInsights?.categoryRows.some((row) => row.status === 'warning' || row.status === 'over')) {
      const topRisk = budgetInsights.categoryRows.find((row) => row.status === 'over') || budgetInsights.categoryRows.find((row) => row.status === 'warning');
      if (topRisk) {
        items.push({
          id: `category-${topRisk.category}`,
          kind: 'category',
          tone: topRisk.status === 'over' ? 'warning' : 'info',
          title: tr('dashboard.categoryCloseTitle', { category: topRisk.category }),
          body: topRisk.status === 'over'
            ? tr('dashboard.categoryOverBody', {
                amount: formatCurrency(topRisk.spent - topRisk.effectiveLimit, budget.currency),
                category: topRisk.category,
              })
            : tr('dashboard.categoryRemainingBody', {
                amount: formatCurrency(topRisk.remaining, budget.currency),
                category: topRisk.category,
              }),
        });
      }
    }

    const upcomingRecurring = (recurringTransactions || [])
      .map((transaction) => ({
        ...transaction,
        daysUntil: Math.ceil((new Date(transaction.next_date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)),
      }))
      .filter((transaction) => transaction.daysUntil >= 0 && transaction.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 2);

    upcomingRecurring.forEach((transaction) => {
      items.push({
        id: `recurring-${transaction.id}`,
        kind: 'recurring',
        tone: 'info',
        title: tr('dashboard.upcomingRecurringTitle', { type: transaction.type }),
        body: tr('dashboard.upcomingRecurringBody', {
          category: transaction.category,
          days: transaction.daysUntil,
          suffix: transaction.daysUntil !== 1 ? 's' : '',
          date: transaction.next_date,
        }),
      });
    });

    if (budgetInsights) {
      items.push({
        id: 'weekly-summary',
        kind: 'weekly',
        tone: 'success',
        title: t('dashboard.weeklySummaryTitle'),
        body: tr('dashboard.weeklySummaryNotificationBody', {
          spent: formatCurrency(budgetInsights.weekSpent, budget.currency),
          safe: formatCurrency(budgetInsights.safeDailySpend, budget.currency),
        }),
      });
    }

    return items
      .filter((item) => {
        if (item.kind === 'weekly') return weeklySummaryAlertsEnabled;
        if (item.kind === 'recurring') return recurringAlertsEnabled;
        return overspendAlertsEnabled;
      })
      .slice(0, 4);
  }, [budget, budgetInsights, overspendAlertsEnabled, recurringAlertsEnabled, recurringTransactions, stats, t, tr, weeklySummaryAlertsEnabled]);

  const combinedNotifications = useMemo<DashboardNotification[]>(() => {
    const serverNotifications = inbox.map((item) => ({
      id: item.id,
      kind: item.kind,
      tone: item.tone,
      title: item.title,
      body: item.body,
    }));

    const deduped = [...serverNotifications];
    notifications.forEach((item) => {
      const exists = serverNotifications.some(
        (serverItem) => serverItem.kind === item.kind && serverItem.title === item.title && serverItem.body === item.body
      );
      if (!exists) deduped.push(item);
    });
    return deduped.slice(0, 6);
  }, [inbox, notifications]);

  const enableBrowserAlerts = async () => {
    const permission = await requestWebNotificationPermission();
    setBrowserAlertPermission(permission);
    if (permission === 'granted') {
      showToast(t('dashboard.browserAlertsEnabled'), 'success');
    }
  };

  useEffect(() => {
    if (!isWebNotificationSupported()) return;
    if (!browserAlertsEnabled || browserAlertPermission !== 'granted' || !budget) return;

    const cycleKey = budget.month_start_day
      ? getBudgetCycleWindow(new Date(), budget.month_start_day).monthStart.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    notifications
      .filter((notification) => notification.tone !== 'success' || weeklySummaryAlertsEnabled)
      .forEach(async (notification) => {
        const storageKey = `budget-it-browser-alert:${cycleKey}:${notification.id}`;
        if (window.localStorage.getItem(storageKey)) return;
        await sendWebBudgetNotification({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          url: '/',
        });
        window.localStorage.setItem(storageKey, new Date().toISOString());
      });
  }, [browserAlertPermission, browserAlertsEnabled, budget, notifications, weeklySummaryAlertsEnabled]);

  const goalHighlights = useMemo(() => {
    return (savingsGoals || [])
      .map((goal) => {
        const percent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
        const remaining = Math.max(0, goal.target_amount - goal.current_amount);
        const daysLeft = Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
        return {
          ...goal,
          percent,
          remaining,
          daysLeft,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [savingsGoals]);

  const beginDashboardEdit = (transactionId: string) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (!transaction) return;
    setDashboardEditingTransactionId(transactionId);
    setDashboardEditError('');
    setDashboardEditDraft({
      amount: Math.abs(transaction.amount).toString(),
      category: transaction.category,
      date: transaction.date,
      note: transaction.note || '',
      merchant: transaction.merchant || '',
      type: transaction.amount < 0 ? 'income' : 'expense',
    });
  };

  const cancelDashboardEdit = () => {
    setDashboardEditingTransactionId(null);
    setDashboardEditDraft(null);
    setDashboardEditError('');
  };

  const saveDashboardEdit = async (transactionId: string) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (!transaction || !dashboardEditDraft) return;
    const parsedAmount = Number(dashboardEditDraft.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setDashboardEditError(t('dashboard.saveTransactionError'));
      return;
    }

    try {
      setDashboardEditBusy(true);
      setDashboardEditError('');
      const nextAmount = dashboardEditDraft.type === 'income' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      await updateTransaction(
        transactionId,
        nextAmount,
        dashboardEditDraft.category.trim() || transaction.category,
        dashboardEditDraft.date,
        dashboardEditDraft.note.trim() || undefined,
        transaction.envelope_id || null,
        {
          merchant: dashboardEditDraft.merchant.trim() || undefined,
          tags: transaction.tags || undefined,
          isRecurring: transaction.is_recurring || false,
          recurringSourceId: transaction.recurring_source_id || null,
          kind: transaction.kind || 'standard',
          transferGroupId: transaction.transfer_group_id || null,
          transferPeerEnvelopeId: transaction.transfer_peer_envelope_id || null,
          transferDirection: transaction.transfer_direction || null,
        }
      );
      showToast(t('dashboard.transactionUpdated'), 'success');
      cancelDashboardEdit();
      if (user?.id) {
        fetchTransactions(user.id);
        fetchBudget(user.id);
      }
    } catch (err: any) {
      setDashboardEditError(err?.message || t('dashboard.updateTransactionError'));
    } finally {
      setDashboardEditBusy(false);
    }
  };

  const handleDashboardDelete = async (transactionId: string) => {
    const confirmed = typeof window === 'undefined' ? true : window.confirm(t('dashboard.deleteTransactionConfirm'));
    if (!confirmed) return;

    try {
      setDashboardDeletingId(transactionId);
      await deleteTransaction(transactionId);
      showToast(t('dashboard.transactionDeleted'), 'success');
      if (dashboardEditingTransactionId === transactionId) {
        cancelDashboardEdit();
      }
      if (user?.id) {
        fetchTransactions(user.id);
        fetchBudget(user.id);
      }
    } catch (err: any) {
      showToast(err?.message || t('dashboard.deleteTransactionError'), 'error');
    } finally {
      setDashboardDeletingId(null);
    }
  };

  const dashboardInlineEditor = dashboardEditingTransactionId && dashboardEditDraft ? (
    <div style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', backgroundColor: theme.surfaceStrong, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
        {t('dashboard.editingSelectedTransaction')}
        </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '10px' }}>
        <select
          value={dashboardEditDraft.type}
          onChange={(e) => setDashboardEditDraft((current) => current ? { ...current, type: e.target.value as 'expense' | 'income' } : current)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text }}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input
          type="text"
          value={dashboardEditDraft.amount}
          onChange={(e) => setDashboardEditDraft((current) => current ? { ...current, amount: e.target.value.replace(/[^\d.]/g, '') } : current)}
          placeholder={t('dashboard.amountPlaceholder')}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text }}
        />
        <input
          type="text"
          list="dashboard-inline-category-options"
          value={dashboardEditDraft.category}
          onChange={(e) => setDashboardEditDraft((current) => current ? { ...current, category: e.target.value } : current)}
          placeholder={t('dashboard.categoryPlaceholder')}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text }}
        />
        <datalist id="dashboard-inline-category-options">
          {(dashboardEditDraft.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((categoryOption) => (
            <option key={categoryOption} value={categoryOption} />
          ))}
        </datalist>
        <input
          type="date"
          value={dashboardEditDraft.date}
          onChange={(e) => setDashboardEditDraft((current) => current ? { ...current, date: e.target.value } : current)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text }}
        />
        <input
          type="text"
          value={dashboardEditDraft.merchant}
          onChange={(e) => setDashboardEditDraft((current) => current ? { ...current, merchant: e.target.value } : current)}
          placeholder={t('dashboard.merchantPlaceholder')}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text }}
        />
        <input
          type="text"
          value={dashboardEditDraft.note}
          onChange={(e) => setDashboardEditDraft((current) => current ? { ...current, note: e.target.value } : current)}
          placeholder={t('dashboard.notePlaceholder')}
          style={{ gridColumn: isMobile ? 'auto' : '1 / -1', width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text }}
        />
      </div>
      {dashboardEditError && (
        <div style={{ marginBottom: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
          {dashboardEditError}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => saveDashboardEdit(dashboardEditingTransactionId)}
          disabled={dashboardEditBusy}
          style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: dashboardEditBusy ? 'not-allowed' : 'pointer', opacity: dashboardEditBusy ? 0.7 : 1 }}
        >
                    {dashboardEditBusy ? t('dashboard.saving') : t('dashboard.saveChanges')}
        </button>
        <button
          type="button"
          onClick={cancelDashboardEdit}
          disabled={dashboardEditBusy}
          style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.surfaceMuted, color: theme.text, fontSize: '12px', fontWeight: 700, cursor: dashboardEditBusy ? 'not-allowed' : 'pointer', opacity: dashboardEditBusy ? 0.7 : 1 }}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  if (!dataReady) {
    return (
      <>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #3498db 100%)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>💰</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Loading your budget...</div>
        </div>
      </>
    );
  }

  if (currentView === 'settings') return <SettingsWeb onBack={() => setCurrentView('dashboard')} onOpenGuides={() => setCurrentView('guides')} />;
  if (currentView === 'add-transaction') {
    return <AddTransactionWeb
      initialType={quickAddPreset?.type}
      initialCategory={quickAddPreset?.category}
      initialNote={quickAddPreset?.note}
      onBack={() => {
        setQuickAddPreset(null);
        setCurrentView('dashboard');
        if (user) { fetchTransactions(user.id); fetchBudget(user.id); }
      }}
    />;
  }
  if (currentView === 'transactions') return <TransactionsWeb onBack={() => setCurrentView('dashboard')} />;
  if (currentView === 'analytics') return <AnalyticsWeb onBack={() => setCurrentView('dashboard')} />;
  if (currentView === 'guides') return <HelpGuidesWeb onBack={() => setCurrentView('dashboard')} />;
  if (currentView === 'transfer') return <TransferFundsWeb onBack={() => {
    setCurrentView('dashboard');
    if (user) { fetchTransactions(user.id); fetchBudget(user.id); fetchEnvelopes(user.id); }
  }} />;

  if (!budget) {
    return (
      <>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: theme.background, padding: '20px' }}>
          <div style={{ backgroundColor: theme.surface, borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: theme.shadow, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎯</div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: theme.text, marginBottom: '12px' }}>{t('dashboard.welcomeTitle')}</h1>
            <p style={{ fontSize: '15px', color: theme.textSubtle, marginBottom: '32px', lineHeight: 1.6 }}>{t('dashboard.welcomeSubtitle')}</p>
            <button onClick={() => setCurrentView('settings')} style={{ width: '100%', padding: '16px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 4px 12px ${theme.shadow}` }}>
              Set Up My Budget →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; font-family: var(--app-font-body, "Manrope", sans-serif); background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
          @keyframes pulseCard { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
          .dashboard-loading-card { background: ${theme.surface}; border: 1px solid ${theme.border}; box-shadow: ${theme.shadow}; backdrop-filter: blur(16px); animation: pulseCard 1.4s ease-in-out infinite; }
        `}</style>
        <div style={{ minHeight: '100vh', background: theme.background }}>
          <div style={{ background: theme.navSurface, position: 'sticky', top: 0, zIndex: 100, boxShadow: theme.shadow, borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/icon.svg" alt="" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
                <span style={{ fontSize: '17px', fontWeight: '800', color: theme.text }}>Budget It</span>
              </div>
              <div style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: 700 }}>{t('dashboard.preparingDashboard')}</div>
            </div>
          </div>
          <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px 60px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Overview</div>
              <div style={{ fontSize: '28px', color: theme.text, fontWeight: '900', lineHeight: 1.1, letterSpacing: '-1px' }}>{t('dashboard.loadingBudgetTitle')}</div>
              <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6 }}>Your account is signed in. We’re finishing your dashboard data now.</div>
            </div>
            <div className="dashboard-loading-card" style={{ borderRadius: '28px', height: isMobile ? '220px' : '260px', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div className="dashboard-loading-card" style={{ borderRadius: '22px', height: '160px' }} />
              <div className="dashboard-loading-card" style={{ borderRadius: '22px', height: '160px' }} />
              <div className="dashboard-loading-card" style={{ borderRadius: '22px', height: '160px' }} />
            </div>
            <div className="dashboard-loading-card" style={{ borderRadius: '16px', height: '220px' }} />
          </div>
        </div>
      </>
    );
  }

  const cur = budget.currency;
  const dailyPct = budget.daily_target > 0 ? Math.min(Math.round((stats.spentToday / budget.daily_target) * 100), 100) : 0;
  const monthlyPct = budget.monthly_target > 0 ? Math.min(Math.round((stats.spentMonthToDate / budget.monthly_target) * 100), 100) : 0;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: var(--app-font-body, "Manrope", sans-serif); background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .nav-btn:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important; }
        .nav-btn { transition: all 0.15s ease !important; }
        .nav-btn-add { background: linear-gradient(135deg, #27ae60, #1e8449) !important; box-shadow: 0 2px 8px rgba(39,174,96,0.4) !important; }
        .section-card { background: ${theme.surface}; border: 1px solid ${theme.border}; box-shadow: ${theme.shadow}; backdrop-filter: blur(16px); }
        .dashboard-shell { max-width: 1180px; }
        .account-filter-btn { transition: all 0.2s ease; }
        .account-filter-btn:hover { transform: translateY(-1px); }
        .help-orb {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 252, 0.35);
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%);
          color: #fff;
          font-size: 18px;
          font-weight: 900;
          box-shadow: 0 14px 28px rgba(29, 78, 216, 0.28);
        }
        .mobile-help-fab {
          position: fixed;
          right: 18px;
          bottom: 22px;
          z-index: 120;
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 252, 0.3);
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%);
          color: #fff;
          font-size: 22px;
          font-weight: 900;
          box-shadow: 0 18px 30px rgba(29, 78, 216, 0.32);
        }
        @media (max-width: 639px) {
          .dashboard-shell {
            max-width: 760px;
          }
          .dashboard-nav-actions {
            width: 100%;
            justify-content: stretch !important;
          }
          .dashboard-top-help {
            display: none !important;
          }
          .dashboard-nav-actions .nav-btn {
            flex: 1 1 calc(50% - 6px);
            text-align: center;
            min-height: 40px;
          }
        }
        @media (min-width: 640px) {
          .mobile-help-fab {
            display: none !important;
          }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sticky top nav */}
      <div style={{ background: theme.navSurface, position: 'sticky', top: 0, zIndex: 100, boxShadow: theme.shadow, borderBottom: `1px solid ${theme.border}` }}>
        <div className="dashboard-shell" style={{ margin: '0 auto', padding: '12px 24px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <img src="/icon.svg" alt="" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
            <span style={{ fontSize: '17px', fontWeight: '800', color: theme.text, letterSpacing: '-0.3px' }}>{t('common.appName')}</span>
          </div>
          {isOffline && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f39c12', backgroundColor: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.3)', borderRadius: '6px', padding: '3px 8px' }}>⚡ Offline</div>
          )}
          <div className="dashboard-nav-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flex: '1 1 auto' }}>
            <button className="nav-btn help-orb dashboard-top-help" onClick={() => setCurrentView('guides')} title={t('dashboard.helpTitle')} aria-label={t('dashboard.helpTitle')}>
              {t('common.questionMark')}
            </button>
            {([
              { label: '+ Add', view: 'add-transaction', bg: 'linear-gradient(135deg, #27ae60, #1e8449)', shadow: 'rgba(39,174,96,0.4)' },
              { label: `📋 ${t('dashboard.history')}`, view: 'transactions', bg: 'linear-gradient(135deg, #8e44ad, #6c3483)', shadow: 'rgba(142,68,173,0.4)' },
              { label: `📈 ${t('dashboard.analytics')}`, view: 'analytics', bg: 'linear-gradient(135deg, #e67e22, #ca6f1e)', shadow: 'rgba(230,126,34,0.4)' },
              { label: `⚙️ ${t('common.settings')}`, view: 'settings', bg: 'linear-gradient(135deg, #5d6d7e, #4d5d6e)', shadow: 'rgba(93,109,126,0.4)' },
            ] as const).map(({ label, view, bg, shadow }) => (
              <button key={view} className="nav-btn" onClick={() => setCurrentView(view)}
                style={{ background: bg, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 2px 8px ${shadow}` }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isMobile && (
        <button
          className="mobile-help-fab"
          type="button"
          onClick={() => setCurrentView('guides')}
          title={t('dashboard.helpTitle')}
          aria-label={t('dashboard.helpTitle')}
        >
          {t('common.questionMark')}
        </button>
      )}

      <div className="dashboard-shell" style={{ margin: '0 auto', padding: '28px 24px 72px', animation: 'fadeIn 0.3s ease' }}>

        {/* Date + user info */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('dashboard.overview')}</div>
          <div style={{ fontSize: isMobile ? '26px' : '38px', color: theme.text, fontWeight: '900', letterSpacing: '-1.2px' }}>{t('dashboard.budgetAtGlance')}</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, marginTop: '8px', lineHeight: 1.6 }}>
            {getDateInfo()} · {getDaysUntilEndOfCycle(budget?.month_start_day)} {t('dashboard.daysLeftInCycle')} · <span style={{ color: theme.text, fontWeight: 600 }}>{user?.email}</span>
          </div>
        </div>

        {/* Hero balance card */}
        <div style={{ background: theme.heroGradient, borderRadius: '28px', padding: isMobile ? '22px 18px' : '38px 36px', marginBottom: '24px', boxShadow: theme.shadow, color: isLightMode ? theme.text : '#fff', border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.35fr) minmax(320px, 0.95fr)', gap: '18px', alignItems: 'stretch', marginBottom: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: isMobile ? 'auto' : '240px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Account Balance</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {accountOptions.map((option) => {
                    const active = option.id === selectedAccount?.id;
                    return (
                      <button
                        key={option.id}
                        className="account-filter-btn"
                        onClick={() => setSelectedAccountId(option.id as 'all' | 'bank' | string)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '999px',
                          border: active ? `1px solid ${theme.borderStrong}` : `1px solid ${isLightMode ? theme.border : 'rgba(255,255,255,0.16)'}`,
                          background: active ? theme.primary : (isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)'),
                          color: active ? '#fff' : (isLightMode ? theme.text : '#fff'),
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {option.icon} {option.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: isMobile ? '30px' : '56px', fontWeight: '900', letterSpacing: '-1.8px', marginBottom: '8px', color: (selectedAccount?.balance || 0) >= 0 ? (isLightMode ? theme.text : '#fff') : (isLightMode ? theme.danger : '#ffb4b4'), overflowWrap: 'anywhere' }}>
                  {(selectedAccount?.balance || 0) < 0 ? '-' : ''}{formatCurrency(Math.abs(selectedAccount?.balance || 0), selectedAccount?.currency || cur)}
                </div>
                <div style={{ fontSize: '14px', color: isLightMode ? theme.textMuted : 'rgba(255,255,255,0.78)', lineHeight: 1.6, maxWidth: '640px' }}>
                  {selectedAccount?.id === 'all'
                    ? `Viewing your combined balance across ${accountOptions.length - 1} account${accountOptions.length - 1 !== 1 ? 's' : ''}.`
                    : `Viewing the current balance for ${selectedAccount?.label || 'this account'}.`}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '18px' }}>
                <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Tracked Accounts</div>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>{accountOptions.length - 1}</div>
                  <div style={{ fontSize: '12px', color: isLightMode ? theme.textMuted : 'rgba(255,255,255,0.74)', marginTop: '4px' }}>Bank + envelopes available</div>
                </div>
                <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Transactions Logged</div>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>{transactions.length}</div>
                  <div style={{ fontSize: '12px', color: isLightMode ? theme.textMuted : 'rgba(255,255,255,0.74)', marginTop: '4px' }}>Across your current budget cycle</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: '12px' }}>
              <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.1)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Daily Target</div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{formatCurrency(budget.daily_target, cur)}</div>
              </div>
              <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.1)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Monthly Target</div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{formatCurrency(budget.monthly_target, cur)}</div>
              </div>
              <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.1)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Selected Account</div>
                <div style={{ fontSize: '18px', fontWeight: '800', overflowWrap: 'anywhere' }}>{selectedAccount?.icon} {selectedAccount?.label}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Today</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(stats.spentToday, cur)}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Month to date</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(stats.spentMonthToDate, cur)}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Projection</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(stats.projectedMonthEnd, cur)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
            {[
              {
                label: t('dashboard.quickAddFood'),
                onClick: () => {
                  setQuickAddPreset({ type: 'expense', category: 'Food', note: 'Quick food entry' });
                  setCurrentView('add-transaction');
                },
              },
              {
                label: t('dashboard.quickLogIncome'),
                onClick: () => {
                  setQuickAddPreset({ type: 'income', category: 'Salary', note: 'Quick income entry' });
                  setCurrentView('add-transaction');
                },
              },
              { label: t('dashboard.quickMoveMoney'), onClick: () => setCurrentView('transfer') },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                style={{
                  padding: '10px 14px',
                  borderRadius: '999px',
                  border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.08)',
                  color: isLightMode ? theme.text : '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <StatCard
            title="Today's Spending" icon={stats.isOverDailyBudget ? '⚠️' : '☀️'}
            value={formatCurrency(stats.spentToday, cur)}
            subtitle={`${dailyPct}% of ${formatCurrency(budget.daily_target, cur)} target`}
            color={stats.isOverDailyBudget ? '#e74c3c' : '#3498db'}
            progress={stats.spentToday} progressMax={budget.daily_target}
            progressColor={stats.isOverDailyBudget ? '#e74c3c' : '#3498db'}
          />
          <StatCard
            title="Month to Date" icon={stats.isOverMonthlyBudget ? '🔴' : '📅'}
            value={formatCurrency(stats.spentMonthToDate, cur)}
            subtitle={`${monthlyPct}% of ${formatCurrency(budget.monthly_target, cur)} target`}
            color={stats.isOverMonthlyBudget ? '#e74c3c' : '#27ae60'}
            progress={stats.spentMonthToDate} progressMax={budget.monthly_target}
            progressColor={stats.isOverMonthlyBudget ? '#e74c3c' : '#27ae60'}
          />
          <StatCard
            title="Projected Month End" icon="🔮"
            value={formatCurrency(stats.projectedMonthEnd, cur)}
            subtitle={stats.projectedMonthEnd > budget.monthly_target ? '⚠️ Over budget projected' : '✅ On track'}
            color={stats.projectedMonthEnd > budget.monthly_target ? '#e74c3c' : '#f39c12'}
          />
          <StatCard
            title="Streak" icon={stats.streak >= 7 ? '🔥' : '⚡'}
            value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`}
            subtitle={stats.streak >= 7 ? 'Amazing streak! Keep it up!' : stats.streak > 0 ? 'Keep going!' : 'Start your streak today'}
            color="#9b59b6"
          />
        </div>

        {/* Budget status pills */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: stats.isOverDailyBudget ? '#ef4444' : '#10b981', borderRadius: '14px', padding: '16px 18px', boxShadow: stats.isOverDailyBudget ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Daily Budget</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', lineHeight: 1.2 }}>
              {stats.isOverDailyBudget
                ? `−${formatCurrency(stats.spentToday - budget.daily_target, cur)}`
                : `+${formatCurrency(stats.dailyRemaining, cur)}`}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)', marginTop: '4px', fontWeight: '600' }}>
              {stats.isOverDailyBudget ? '⚠️ over limit' : '✅ remaining today'}
            </div>
          </div>
          <div style={{ backgroundColor: stats.isOverMonthlyBudget ? '#ef4444' : '#10b981', borderRadius: '14px', padding: '16px 18px', boxShadow: stats.isOverMonthlyBudget ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Monthly Budget</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', lineHeight: 1.2 }}>
              {stats.isOverMonthlyBudget
                ? `−${formatCurrency(stats.spentMonthToDate - budget.monthly_target, cur)}`
                : `+${formatCurrency(stats.monthlyRemaining, cur)}`}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)', marginTop: '4px', fontWeight: '600' }}>
              {stats.isOverMonthlyBudget ? '⚠️ over limit' : '✅ remaining this month'}
            </div>
          </div>
        </div>

        {budgetInsights && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr', gap: '16px', marginBottom: '20px' }}>
            <div className="section-card" style={{ borderRadius: '20px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: theme.textSubtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Insights</div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: theme.text, margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>Spending pace</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: '11px', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Average daily spend</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: theme.text }}>{formatCurrency(budgetInsights.burnRate, cur)}</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: '11px', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Safe daily spend</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: theme.text }}>{formatCurrency(budgetInsights.safeDailySpend, cur)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: budgetInsights.projectedGap > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.12)', border: `1px solid ${budgetInsights.projectedGap > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)'}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: theme.text, marginBottom: '4px' }}>
                    {budgetInsights.projectedGap > 0
                      ? `At this pace, you may exceed your monthly budget by ${formatCurrency(Math.abs(budgetInsights.projectedGap), cur)}.`
                      : `You are currently pacing ${formatCurrency(Math.abs(budgetInsights.projectedGap), cur)} under your monthly target.`}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.6 }}>
                    Keep daily spending near {formatCurrency(budgetInsights.safeDailySpend, cur)} for the remaining {budgetInsights.remainingDays} day{budgetInsights.remainingDays !== 1 ? 's' : ''} to stay on track.
                  </div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: theme.text, marginBottom: '4px' }}>Weekly summary</div>
                  <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.6 }}>
                    You have spent {formatCurrency(budgetInsights.weekSpent, cur)} over the last 7 days, averaging {formatCurrency(budgetInsights.weekSpent / 7, cur)} per day.
                  </div>
                </div>
              </div>
            </div>

            <div className="section-card" style={{ borderRadius: '20px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: theme.textSubtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Category Watch</div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: theme.text, margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>Tracked limits</h2>
              {budgetInsights.categoryRows.length === 0 ? (
                <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: 1.7 }}>
                  Add category limits in Settings to see progress bars and early warnings here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {budgetInsights.categoryRows.slice(0, 4).map((item) => (
                    <div key={item.category} style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: theme.text }}>{item.category}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: item.status === 'over' ? theme.danger : item.status === 'warning' ? '#d97706' : theme.success }}>
                          {item.status === 'over' ? 'Over limit' : item.status === 'warning' ? 'Almost there' : 'On track'}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>
                        {formatCurrency(item.spent, cur)} of {formatCurrency(item.effectiveLimit, cur)}
                        {' · '}
                        {item.status === 'over'
                          ? `${formatCurrency(item.spent - item.effectiveLimit, cur)} over`
                          : `${formatCurrency(item.remaining, cur)} remaining`}
                        {item.carryover > 0 ? ` Â· ${formatCurrency(item.carryover, cur)} rolled in` : ''}
                      </div>
                      <ProgressBar value={item.spent} max={item.effectiveLimit} color={item.status === 'over' ? theme.danger : item.status === 'warning' ? '#f59e0b' : theme.success} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="section-card" style={{ borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: theme.textSubtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Goals</div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: theme.text, margin: 0, letterSpacing: '-0.5px' }}>Savings progress</h2>
            </div>
            <button
              onClick={() => setCurrentView('settings')}
              style={{ padding: '10px 14px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.surfaceMuted, color: theme.text, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Manage
            </button>
          </div>
          {goalHighlights.length === 0 ? (
            <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: 1.7 }}>
              Add savings goals in Settings to track progress toward things like an emergency fund, travel, or school fees.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goalHighlights.map((goal) => (
                <div key={goal.id} style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: theme.text }}>{goal.name}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: goal.percent >= 100 ? '#10b981' : theme.primary }}>
                      {goal.percent}% complete
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '8px' }}>
                    {formatCurrency(goal.current_amount, cur)} of {formatCurrency(goal.target_amount, cur)}
                    {' · '}
                    {goal.remaining > 0 ? `${formatCurrency(goal.remaining, cur)} to go` : 'Goal reached'}
                    {' · '}
                    {goal.daysLeft > 0 ? `${goal.daysLeft} day${goal.daysLeft !== 1 ? 's' : ''} left` : 'Target date reached'}
                  </div>
                  <ProgressBar value={goal.current_amount} max={goal.target_amount} color={goal.percent >= 100 ? theme.success : theme.primary} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card" style={{ borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', color: theme.textSubtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>{t('dashboard.notifications')}</div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: theme.text, margin: 0, letterSpacing: '-0.5px' }}>{t('dashboard.alertsAndSummaries')}</h2>
            </div>
            <div style={{ minWidth: '40px', height: '40px', borderRadius: '999px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: theme.text }}>
              {combinedNotifications.length}
            </div>
          </div>
          {browserAlertsSupported && browserAlertsEnabled && browserAlertPermission !== 'granted' && (
            <div style={{ marginBottom: '14px', padding: '14px 16px', borderRadius: '16px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '13px', color: theme.text, fontWeight: 700, marginBottom: '6px' }}>{t('dashboard.enableBrowserAlertsTitle')}</div>
              <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '10px' }}>
                {t('dashboard.enableBrowserAlertsBody')}
              </div>
              <button
                type="button"
                onClick={enableBrowserAlerts}
                style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', backgroundColor: theme.primary, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {browserAlertPermission === 'denied' ? t('dashboard.notificationsBlocked') : t('dashboard.enableAlerts')}
              </button>
            </div>
          )}
          {combinedNotifications.length === 0 ? (
            <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: 1.7 }}>
              {t('dashboard.notificationsEmpty')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {combinedNotifications.map((notification) => (
                <div key={notification.id} style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: notification.tone === 'warning' ? 'rgba(239,68,68,0.08)' : notification.tone === 'success' ? 'rgba(16,185,129,0.08)' : theme.surfaceMuted, border: `1px solid ${notification.tone === 'warning' ? 'rgba(239,68,68,0.18)' : notification.tone === 'success' ? 'rgba(16,185,129,0.18)' : theme.border}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: theme.text, marginBottom: '4px' }}>{notification.title}</div>
                  <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: 1.6 }}>{notification.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="section-card" style={{ borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: theme.text, margin: 0 }}>{t('dashboard.recentTransactions')}</h2>
            <button onClick={() => setCurrentView('transactions')}
              style={{ fontSize: '12px', color: theme.primary, fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              {t('dashboard.viewAll')} →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {([
                { id: '7d', label: t('dashboard.timeLast7Days') },
                { id: 'cycle', label: t('dashboard.timeCurrentCycle') },
                { id: 'all', label: t('dashboard.timeAllTime') },
              ] as const).map((option) => {
                const active = dashboardTimeFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDashboardTimeFilter(option.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '999px',
                      border: `1px solid ${active ? theme.borderStrong : theme.border}`,
                      backgroundColor: active ? theme.primary : theme.surfaceMuted,
                      color: active ? '#fff' : theme.text,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <select
              value={dashboardCategoryFilter}
              onChange={(e) => setDashboardCategoryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.surfaceMuted,
                color: theme.text,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {dashboardCategoryOptions.map((option) => (
                <option key={option} value={option}>{option === 'all' ? t('dashboard.allCategories') : option}</option>
              ))}
            </select>
            <div style={{ fontSize: '11px', color: theme.textSubtle, lineHeight: 1.5 }}>
              {t('dashboard.editHint')}
            </div>
          </div>
          {dashboardInlineEditor}
          {recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: theme.textSubtle }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontSize: '14px' }}>
                {transactions.length === 0 ? t('dashboard.noTransactions') : t('dashboard.noTransactionsMatch')}
              </div>
              <button onClick={() => setCurrentView('add-transaction')}
                style={{ marginTop: '12px', padding: '8px 20px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                {t('dashboard.addFirstTransaction')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTransactions.map(tx => {
                const isIncome = tx.amount < 0;
                const isTransfer = tx.kind === 'transfer';
                const isEditing = dashboardEditingTransactionId === tx.id;
                const isDeleting = dashboardDeletingId === tx.id;
                const categoryLabel = isTransfer
                  ? (tx.transfer_direction === 'incoming' ? t('dashboard.transferIn') : t('dashboard.transferOut'))
                  : tx.category;
                const metadata = [
                  new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  tx.merchant || null,
                  tx.note || null,
                  tx.tags?.length ? `#${tx.tags.join(' #')}` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '12px', padding: '10px 12px', backgroundColor: theme.surfaceMuted, borderRadius: '10px', border: `1px solid ${theme.border}`, cursor: !isTransfer ? 'pointer' : 'default' }} onDoubleClick={() => { if (!isTransfer) beginDashboardEdit(tx.id); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isTransfer ? 'rgba(139,92,246,0.18)' : isIncome ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                        {isIncome ? '💰' : '💸'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, overflowWrap: 'anywhere' }}>{categoryLabel}</div>
                          {tx.is_recurring && (
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: '999px', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                              Recurring
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: theme.textSubtle, overflowWrap: 'anywhere' }}>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{tx.note ? ` · ${tx.note}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isMobile ? 'stretch' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
                      <div title={metadata} style={{ fontSize: '14px', fontWeight: '700', color: isIncome ? '#2ecc71' : isTransfer ? '#8b5cf6' : '#ff7675', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
                        {isIncome ? '+' : '−'}{formatCurrency(Math.abs(tx.amount), cur)}
                      </div>
                      {!isTransfer && (
                        <div style={{ display: 'flex', gap: '6px', alignSelf: isMobile ? 'stretch' : 'flex-end' }}>
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); beginDashboardEdit(tx.id); }}
                            style={{ padding: '7px 10px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.background, color: theme.text, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {isEditing ? t('dashboard.editing') : t('dashboard.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); handleDashboardDelete(tx.id); }}
                            disabled={isDeleting}
                            style={{ padding: '7px 10px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.18)', backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.7 : 1 }}
                          >
                            {isDeleting ? t('dashboard.deleting') : t('dashboard.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
