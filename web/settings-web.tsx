import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { useI18n, useLanguageStore } from '../src/store/language';
import { themeTokens, useThemeStore } from '../src/store/theme';
import { CategoryBudgetMap } from '../src/types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'];
const CATEGORY_LIMIT_OPTIONS = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Rent', 'Other'];

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

const sanitizeAmountInput = (value: string) => value.replace(/[^0-9,.-]/g, '');

const parseAmountInput = (value: string) => {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumberInput = (value: string) => {
  const sanitized = sanitizeAmountInput(value);
  if (!sanitized) return '';

  const isNegative = sanitized.startsWith('-');
  const unsigned = isNegative ? sanitized.slice(1) : sanitized;
  const [integerPartRaw = '', decimalPart] = unsigned.replace(/,/g, '').split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || (integerPartRaw ? '0' : '');
  const withCommas = integerPart ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  return `${isNegative ? '-' : ''}${withCommas}${decimalPart !== undefined ? `.${decimalPart}` : ''}`;
};

export default function SettingsWeb({ onBack, onOpenGuides }: { onBack: () => void; onOpenGuides?: () => void }) {
  const { user, signOut } = useAuthStore();
  const { budget, categoryBudgets, loading, createBudget, updateBudget, updateBankBalance, saveCategoryBudgets, recurringTransactions, fetchRecurringTransactions, addRecurringTransaction, deleteRecurringTransaction, savingsGoals, fetchSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, envelopes, fetchEnvelopes, createEnvelope, updateEnvelope, deleteEnvelope } = useBudgetStore();
  const { mode, setMode, toggleMode } = useThemeStore();
  const { language, t } = useI18n();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const theme = themeTokens[mode];
  const [isMobile, setIsMobile] = useState(false);

  const [dailyTarget, setDailyTarget] = useState(
    budget?.daily_target.toString() || ''
  );
  const [monthlyTarget, setMonthlyTarget] = useState(
    budget?.monthly_target.toString() || ''
  );
  const [currency, setCurrency] = useState(budget?.currency || 'USD');
  const [monthStartDay, setMonthStartDay] = useState(
    budget?.month_start_day.toString() || '1'
  );
  const [bankBalance, setBankBalance] = useState(
    budget?.bank_balance?.toString() || '0'
  );
  const [budgetMsg, setBudgetMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [categoryBudgetMsg, setCategoryBudgetMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [balanceMsg, setBalanceMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [recurringMsg, setRecurringMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [envMsg, setEnvMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [envUpdateMsg, setEnvUpdateMsg] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({});
  const [envDeleteMsg, setEnvDeleteMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [recurringDeleteMsg, setRecurringDeleteMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [goalMsg, setGoalMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [goalDeleteMsg, setGoalDeleteMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('Salary');
  const [recType, setRecType] = useState<'income' | 'expense'>('income');
  const [recFrequency, setRecFrequency] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [recNextDate, setRecNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [recNote, setRecNote] = useState('');

  const [showEnvelopeForm, setShowEnvelopeForm] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envIcon, setEnvIcon] = useState('💰');
  const [envBalance, setEnvBalance] = useState('');
  const [editedEnvelopeBalances, setEditedEnvelopeBalances] = useState<Record<string, string>>({});
  const [editedCategoryBudgets, setEditedCategoryBudgets] = useState<Record<string, string>>({});
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalNote, setGoalNote] = useState('');
  const [goalEnvelopeId, setGoalEnvelopeId] = useState('');

  const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Rent', 'Other'];
  const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

  useEffect(() => {
    if (user?.id) {
      fetchRecurringTransactions(user.id);
      fetchSavingsGoals(user.id);
      fetchEnvelopes(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (budget) {
      setDailyTarget(budget.daily_target.toString());
      setMonthlyTarget(budget.monthly_target.toString());
      setCurrency(budget.currency);
      setMonthStartDay(budget.month_start_day.toString());
      setBankBalance(formatNumberInput(budget.bank_balance?.toString() || '0'));
    }
  }, [budget]);

  useEffect(() => {
    const sourceBudgets = budget?.category_budgets && Object.keys(budget.category_budgets).length > 0
      ? budget.category_budgets
      : categoryBudgets;

    setEditedCategoryBudgets(
      Object.fromEntries(
        CATEGORY_LIMIT_OPTIONS.map((category) => [category, formatNumberInput((sourceBudgets?.[category] ?? 0).toString())])
      )
    );
  }, [budget?.category_budgets, categoryBudgets]);

  useEffect(() => {
    setEditedEnvelopeBalances(
      Object.fromEntries(
        envelopes.map((env) => [env.id, formatNumberInput(env.balance.toString())])
      )
    );
  }, [envelopes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => setIsMobile(window.innerWidth < 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const handleSaveBudget = async () => {
    setBudgetMsg(null);
    if (!dailyTarget || !monthlyTarget) { setBudgetMsg({ text: 'Please fill in all fields', type: 'error' }); return; }
    const daily = parseFloat(dailyTarget);
    const monthly = parseFloat(monthlyTarget);
    const startDay = parseInt(monthStartDay);
    if (isNaN(daily) || isNaN(monthly) || isNaN(startDay)) { setBudgetMsg({ text: 'Please enter valid numbers', type: 'error' }); return; }
    if (daily <= 0 || monthly <= 0) { setBudgetMsg({ text: 'Targets must be greater than 0', type: 'error' }); return; }
    if (startDay < 1 || startDay > 28) { setBudgetMsg({ text: 'Month start day must be between 1 and 28', type: 'error' }); return; }
    if (!user) { setBudgetMsg({ text: 'Not authenticated — please sign in again', type: 'error' }); return; }
    try {
      if (budget) {
        await updateBudget(budget.id, daily, monthly, currency, startDay);
      } else {
        await createBudget(user.id, daily, monthly, currency, startDay);
      }
      setBudgetMsg({ text: 'Budget saved successfully!', type: 'success' });
      setTimeout(() => onBack(), 1200);
    } catch (error: any) {
      setBudgetMsg({ text: error.message || 'Failed to save budget', type: 'error' });
    }
  };

  const handleSaveBalance = async () => {
    setBalanceMsg(null);
    if (!budget) { setBalanceMsg({ text: 'Please set up your budget first', type: 'error' }); return; }
    try {
      const nextBalance = parseAmountInput(bankBalance);
      await updateBankBalance(budget.id, nextBalance);
      setBankBalance(formatNumberInput(nextBalance.toString()));
      setBalanceMsg({ text: 'Bank balance updated successfully!', type: 'success' });
    } catch (error: any) {
      setBalanceMsg({ text: error.message || 'Failed to update balance', type: 'error' });
    }
  };

  const handleSaveCategoryBudgets = async () => {
    setCategoryBudgetMsg(null);
    if (!budget) {
      setCategoryBudgetMsg({ text: 'Save your main budget first before adding category limits.', type: 'error' });
      return;
    }

    const nextCategoryBudgets: CategoryBudgetMap = Object.fromEntries(
      CATEGORY_LIMIT_OPTIONS.map((category) => [category, parseAmountInput(editedCategoryBudgets[category] || '0')])
    );

    try {
      await saveCategoryBudgets(budget.id, nextCategoryBudgets);
      setCategoryBudgetMsg({ text: 'Category budgets saved successfully.', type: 'success' });
    } catch (error: any) {
      setCategoryBudgetMsg({ text: error?.message || 'Failed to save category budgets', type: 'error' });
    }
  };

  const handleSaveEnvelopeBalance = async (envelopeId: string) => {
    setEnvUpdateMsg((current) => ({ ...current, [envelopeId]: null }));
    const envelope = envelopes.find((item) => item.id === envelopeId);
    if (!envelope) {
      setEnvUpdateMsg((current) => ({ ...current, [envelopeId]: { text: 'Envelope not found', type: 'error' } }));
      return;
    }

    try {
      const nextBalance = parseAmountInput(editedEnvelopeBalances[envelopeId] || '0');
      await updateEnvelope(envelope.id, envelope.name, envelope.icon, nextBalance, envelope.currency);
      setEditedEnvelopeBalances((current) => ({
        ...current,
        [envelopeId]: formatNumberInput(nextBalance.toString()),
      }));
      setEnvUpdateMsg((current) => ({ ...current, [envelopeId]: { text: 'Envelope balance updated!', type: 'success' } }));
    } catch (error: any) {
      setEnvUpdateMsg((current) => ({ ...current, [envelopeId]: { text: error.message || 'Failed to update balance', type: 'error' } }));
    }
  };

  const handleAddRecurring = async () => {
    setRecurringMsg(null);
    const amount = parseFloat(recAmount);
    if (!recAmount || isNaN(amount) || amount <= 0) {
      setRecurringMsg({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }
    if (!recNextDate) {
      setRecurringMsg({ text: 'Please select a start date', type: 'error' });
      return;
    }
    if (!user) return;

    try {
      await addRecurringTransaction(user.id, amount, recCategory, recType, recFrequency, recNextDate, recNote);
      setRecurringMsg({ text: 'Recurring transaction added!', type: 'success' });
      setShowRecurringForm(false);
      setRecAmount('');
      setRecNote('');
    } catch (error: any) {
      setRecurringMsg({ text: error.message || 'Failed to add recurring transaction', type: 'error' });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    setRecurringDeleteMsg(null);
    const recurringItem = recurringTransactions.find((item) => item.id === id);
    if (!recurringItem) {
      setRecurringDeleteMsg({ text: 'Recurring transaction not found', type: 'error' });
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Remove recurring transaction for ${recurringItem.category}? This will stop future automatic entries.`);
      if (!confirmed) return;
    }

    try {
      await deleteRecurringTransaction(id);
      setRecurringDeleteMsg({ text: 'Recurring transaction removed.', type: 'success' });
    } catch (error: any) {
      setRecurringDeleteMsg({ text: error?.message || 'Failed to delete recurring transaction', type: 'error' });
    }
  };

  const handleDeleteEnvelope = async (envelopeId: string, envelopeName: string) => {
    setEnvDeleteMsg(null);

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete ${envelopeName}? Existing transactions will lose this envelope reference.`);
      if (!confirmed) return;
    }

    try {
      await deleteEnvelope(envelopeId);
      setEnvDeleteMsg({ text: `${envelopeName} removed.`, type: 'success' });
    } catch (error: any) {
      setEnvDeleteMsg({ text: error?.message || 'Failed to delete envelope', type: 'error' });
    }
  };

  const handleAddEnvelope = async () => {
    setEnvMsg(null);
    if (!envName) {
      setEnvMsg({ text: 'Please enter a name for the envelope', type: 'error' });
      return;
    }
    const bal = parseAmountInput(envBalance);
    if (!user) return;

    try {
      await createEnvelope(user.id, envName, envIcon || '💰', bal, budget?.currency || 'USD');
      setEnvMsg({ text: 'Envelope added!', type: 'success' });
      setShowEnvelopeForm(false);
      setEnvName('');
      setEnvIcon('💰');
      setEnvBalance('');
    } catch (error: any) {
      setEnvMsg({ text: error.message || 'Failed to add envelope', type: 'error' });
    }
  };

  const resetGoalForm = () => {
    setEditingGoalId(null);
    setGoalName('');
    setGoalTargetAmount('');
    setGoalCurrentAmount('');
    setGoalTargetDate('');
    setGoalNote('');
    setGoalEnvelopeId('');
  };

  const handleSaveGoal = async () => {
    setGoalMsg(null);
    if (!user) return;
    if (!goalName.trim()) {
      setGoalMsg({ text: 'Please enter a savings goal name', type: 'error' });
      return;
    }

    const targetAmount = parseAmountInput(goalTargetAmount);
    const currentAmount = parseAmountInput(goalCurrentAmount);

    if (targetAmount <= 0) {
      setGoalMsg({ text: 'Target amount must be greater than 0', type: 'error' });
      return;
    }
    if (currentAmount < 0) {
      setGoalMsg({ text: 'Current saved amount cannot be negative', type: 'error' });
      return;
    }
    if (!goalTargetDate) {
      setGoalMsg({ text: 'Please choose a target date', type: 'error' });
      return;
    }

    try {
      if (editingGoalId) {
        await updateSavingsGoal(editingGoalId, goalName.trim(), targetAmount, currentAmount, goalTargetDate, goalNote || undefined, goalEnvelopeId || null);
        setGoalMsg({ text: 'Savings goal updated successfully!', type: 'success' });
      } else {
        await addSavingsGoal(user.id, goalName.trim(), targetAmount, currentAmount, goalTargetDate, goalNote || undefined, goalEnvelopeId || null);
        setGoalMsg({ text: 'Savings goal added!', type: 'success' });
      }
      setShowGoalForm(false);
      resetGoalForm();
    } catch (error: any) {
      setGoalMsg({ text: error?.message || 'Failed to save savings goal', type: 'error' });
    }
  };

  const startEditingGoal = (goalId: string) => {
    const goal = savingsGoals.find((item) => item.id === goalId);
    if (!goal) return;
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setGoalTargetAmount(formatNumberInput(goal.target_amount.toString()));
    setGoalCurrentAmount(formatNumberInput(goal.current_amount.toString()));
    setGoalTargetDate(goal.target_date);
    setGoalNote(goal.note || '');
    setGoalEnvelopeId(goal.linked_envelope_id || '');
    setShowGoalForm(true);
    setGoalMsg(null);
  };

  const handleDeleteGoal = async (goalId: string, goalNameValue: string) => {
    setGoalDeleteMsg(null);
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete savings goal "${goalNameValue}"?`);
      if (!confirmed) return;
    }

    try {
      await deleteSavingsGoal(goalId);
      setGoalDeleteMsg({ text: `${goalNameValue} removed.`, type: 'success' });
    } catch (error: any) {
      setGoalDeleteMsg({ text: error?.message || 'Failed to delete savings goal', type: 'error' });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch {}
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: `1px solid ${theme.border}`,
    borderRadius: '14px', fontSize: '15px', backgroundColor: theme.surfaceMuted,
    outline: 'none', color: theme.text, boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' };
  const card: React.CSSProperties = { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '24px', marginBottom: '16px', boxShadow: theme.shadow, backdropFilter: 'blur(16px)' };
  const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: '800', color: theme.text, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.4px' };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: var(--app-font-body, "Manrope", sans-serif); background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input:focus, select:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important; }
        .curr-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Sticky header */}
      <div style={{ background: theme.navSurface, position: 'sticky', top: 0, zIndex: 100, boxShadow: theme.shadow, borderBottom: `1px solid ${theme.border}`, backdropFilter: 'blur(14px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
          <button onClick={onBack} style={{ background: theme.surfaceStrong, border: `1px solid ${theme.borderStrong}`, borderRadius: '12px', color: theme.primary, fontSize: '16px', cursor: 'pointer', padding: '8px 14px', fontWeight: '700' }}>
            ← {t('common.back')}
          </button>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{t('settings.preferences')}</div>
            <span style={{ fontSize: '20px', fontWeight: '900', color: theme.text, letterSpacing: '-0.5px' }}>⚙️ {t('settings.settingsTitle')}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px 60px', animation: 'fadeIn 0.4s ease' }}>
        <div style={card}>
          <div style={sectionTitle}><span>🌍</span> {t('settings.languageAndHelp')}</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '16px' }}>{t('settings.languageSubtitle')}</div>
          <div style={{ marginBottom: '18px' }}>
            <label style={lbl}>{t('settings.appLanguage')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
              {([
                { code: 'en', label: t('common.english') },
                { code: 'sw', label: t('common.swahili') },
              ] as const).map((option) => (
                <button
                  key={option.code}
                  onClick={() => setLanguage(option.code)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${language === option.code ? theme.borderStrong : theme.border}`,
                    background: language === option.code ? theme.primary : theme.surfaceMuted,
                    color: language === option.code ? '#fff' : theme.text,
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '18px', background: `linear-gradient(135deg, ${theme.surfaceMuted} 0%, ${theme.surface} 100%)`, border: `1px solid ${theme.border}`, marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>?</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: theme.text }}>{t('settings.openQuickGuides')}</div>
                <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.6 }}>{t('settings.quickGuidesSubtitle')}</div>
              </div>
            </div>
          </div>
          <button onClick={() => onOpenGuides?.()} style={{ width: '100%', padding: '14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: theme.shadow }}>
            {t('settings.openQuickGuides')}
          </button>
        </div>

        <div style={card}>
          <div style={sectionTitle}><span>🎯</span> Savings Goals</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '16px' }}>
            Create personal saving targets with a due date and track how much progress you have already made.
          </div>
          {goalDeleteMsg && <div style={{ fontSize: '12px', color: goalDeleteMsg.type === 'success' ? '#10b981' : '#ef4444', marginBottom: '12px', fontWeight: '600' }}>{goalDeleteMsg.text}</div>}

          {savingsGoals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              {savingsGoals.map((goal) => {
                const progressPct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                const remaining = Math.max(0, goal.target_amount - goal.current_amount);
                const linkedEnvelope = envelopes.find((env) => env.id === goal.linked_envelope_id);
                return (
                  <div key={goal.id} style={{ padding: '16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: theme.text, marginBottom: '4px' }}>{goal.name}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: 1.6 }}>
                          {formatCurrency(goal.current_amount, budget?.currency || 'USD')} saved of {formatCurrency(goal.target_amount, budget?.currency || 'USD')}
                          {' · '}Target date: {new Date(goal.target_date).toLocaleDateString()}
                          {linkedEnvelope ? ` · Linked to ${linkedEnvelope.name}` : ''}
                        </div>
                        {goal.note && <div style={{ fontSize: '12px', color: theme.textSubtle, marginTop: '6px' }}>{goal.note}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                        <button onClick={() => startEditingGoal(goal.id)} style={{ flex: isMobile ? 1 : '0 0 auto', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.borderStrong}`, background: theme.surfaceStrong, color: theme.primary, fontWeight: '700', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteGoal(goal.id, goal.name)} style={{ flex: isMobile ? 1 : '0 0 auto', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontWeight: '700', cursor: 'pointer' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '10px', borderRadius: '999px', backgroundColor: theme.surfaceStrong, overflow: 'hidden', marginBottom: '8px' }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: '999px', background: progressPct >= 100 ? '#10b981' : theme.primary, transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>
                      {progressPct}% complete · {formatCurrency(remaining, budget?.currency || 'USD')} remaining
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 20px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}`, marginBottom: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏁</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text, marginBottom: '8px' }}>No savings goals yet</div>
              <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: 1.7 }}>
                Add a target like emergency fund, vacation, or school fees and track progress here.
              </div>
            </div>
          )}

          {!showGoalForm ? (
            <button
              onClick={() => { resetGoalForm(); setShowGoalForm(true); }}
              style={{ width: '100%', padding: '14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: theme.shadow }}
            >
              + Add Savings Goal
            </button>
          ) : (
            <div style={{ backgroundColor: theme.surfaceMuted, borderRadius: '18px', padding: '16px', border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: theme.text, margin: 0 }}>
                  {editingGoalId ? 'Edit Savings Goal' : 'New Savings Goal'}
                </h3>
                <button onClick={() => { setShowGoalForm(false); resetGoalForm(); }} style={{ background: 'none', border: 'none', color: theme.textSubtle, cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Goal name</label>
                <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g. Emergency fund, Vacation" style={fieldStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={lbl}>Target amount</label>
                  <input type="text" inputMode="decimal" value={goalTargetAmount} onChange={(e) => setGoalTargetAmount(formatNumberInput(e.target.value))} placeholder="0.00" style={fieldStyle} />
                </div>
                <div>
                  <label style={lbl}>Already saved</label>
                  <input type="text" inputMode="decimal" value={goalCurrentAmount} onChange={(e) => setGoalCurrentAmount(formatNumberInput(e.target.value))} placeholder="0.00" style={fieldStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={lbl}>Target date</label>
                  <input type="date" value={goalTargetDate} onChange={(e) => setGoalTargetDate(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={lbl}>Linked envelope (optional)</label>
                  <select value={goalEnvelopeId} onChange={(e) => setGoalEnvelopeId(e.target.value)} style={fieldStyle}>
                    <option value="">No linked envelope</option>
                    {envelopes.map((env) => (
                      <option key={env.id} value={env.id}>{env.icon} {env.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={lbl}>Note (optional)</label>
                <input type="text" value={goalNote} onChange={(e) => setGoalNote(e.target.value)} placeholder="Why this goal matters" style={fieldStyle} />
              </div>

              <button onClick={handleSaveGoal} disabled={loading} style={{ width: '100%', padding: '12px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Saving...' : editingGoalId ? 'Update Goal' : 'Save Goal'}
              </button>
              {goalMsg && <div style={{ fontSize: '12px', color: goalMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{goalMsg.text}</div>}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={sectionTitle}><span>{mode === 'dark' ? '🌙' : '☀️'}</span> {t('settings.appearance')}</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '16px' }}>{t('settings.appearanceSubtitle')}</div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', marginBottom: '12px' }}>
            <button onClick={() => setMode('light')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: `1px solid ${mode === 'light' ? theme.borderStrong : theme.border}`, background: mode === 'light' ? theme.primary : theme.surfaceMuted, color: mode === 'light' ? '#fff' : theme.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {t('settings.lightMode')}
            </button>
            <button onClick={() => setMode('dark')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: `1px solid ${mode === 'dark' ? theme.borderStrong : theme.border}`, background: mode === 'dark' ? theme.primary : theme.surfaceMuted, color: mode === 'dark' ? '#fff' : theme.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {t('settings.darkMode')}
            </button>
          </div>
          <button onClick={toggleMode} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: theme.surfaceMuted, color: theme.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            {t('settings.toggleTo')} {mode === 'light' ? t('settings.darkMode').toLowerCase() : t('settings.lightMode').toLowerCase()}
          </button>
        </div>

        {/* Budget Targets */}
        <div style={card}>
          <div style={sectionTitle}><span>🎯</span> Budget Targets</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '18px' }}>Set the limits and cycle rules that shape your daily and monthly budget experience.</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={lbl}>Daily Limit ({currency})</label>
              <input type="number" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)}
                placeholder="e.g. 50" style={fieldStyle} min="1" step="any" />
            </div>
            <div>
              <label style={lbl}>Monthly Limit ({currency})</label>
              <input type="number" value={monthlyTarget} onChange={e => setMonthlyTarget(e.target.value)}
                placeholder="e.g. 1500" style={fieldStyle} min="1" step="any" />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Currency</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'].map(c => (
                <button key={c} className="curr-btn" onClick={() => setCurrency(c)}
                  style={{ flex: '1 1 calc(20% - 8px)', minWidth: '56px', padding: '10px 0', border: currency === c ? `1px solid ${theme.borderStrong}` : `1px solid ${theme.border}`, borderRadius: '12px', background: currency === c ? theme.primary : theme.surfaceMuted, color: currency === c ? '#fff' : theme.text, fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: currency === c ? theme.shadow : 'none' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Month Start Day (1-28)</label>
            <input type="number" min="1" max="28" value={monthStartDay} onChange={e => setMonthStartDay(e.target.value)} style={fieldStyle} placeholder="1" />
            <div style={{ fontSize: '11px', color: theme.textSubtle, marginTop: '6px' }}>Day of month your budget period resets</div>
          </div>

          <button onClick={handleSaveBudget} disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : theme.primary, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : theme.shadow }}>
            {loading ? 'Saving...' : '💾 Save Budget Settings'}
          </button>
          {budgetMsg && <div style={{ fontSize: '12px', color: budgetMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{budgetMsg.text}</div>}
        </div>

        <div style={card}>
          <div style={sectionTitle}><span>ðŸ“Š</span> Category Limits</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '18px' }}>
            Set monthly spending caps for the categories you want to track more closely. These limits feed dashboard warnings and progress states.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {CATEGORY_LIMIT_OPTIONS.map((category) => (
              <div key={category}>
                <label style={lbl}>{category} Limit ({currency})</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editedCategoryBudgets[category] ?? ''}
                  onChange={e => setEditedCategoryBudgets((current) => ({
                    ...current,
                    [category]: formatNumberInput(e.target.value),
                  }))}
                  placeholder="0.00"
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: theme.textSubtle, marginBottom: '16px' }}>
            Enter 0 for any category you do not want to track yet.
          </div>
          <button onClick={handleSaveCategoryBudgets} disabled={loading || !budget}
            style={{ width: '100%', padding: '14px', background: loading || !budget ? '#94a3b8' : theme.primary, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading || !budget ? 'not-allowed' : 'pointer', boxShadow: loading || !budget ? 'none' : theme.shadow }}>
            {loading ? 'Saving...' : 'Save Category Limits'}
          </button>
          {categoryBudgetMsg && <div style={{ fontSize: '12px', color: categoryBudgetMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{categoryBudgetMsg.text}</div>}
        </div>

        {/* Envelopes Section */}
        <div style={card}>
          <div style={sectionTitle}><span>💌</span> Envelopes & Accounts</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, marginBottom: '16px', lineHeight: '1.6' }}>
            Your main bank account plus any extra envelopes (e.g., Wallet, Cash, Vacation Fund).
          </div>
          {envDeleteMsg && <div style={{ fontSize: '12px', color: envDeleteMsg.type === 'success' ? '#10b981' : '#ef4444', marginBottom: '12px', fontWeight: '600' }}>{envDeleteMsg.text}</div>}

          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Default Bank Account (from budget.bank_balance) */}
            {budget && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', padding: '12px 14px', border: `1px solid ${theme.border}`, borderRadius: '10px', backgroundColor: theme.surfaceMuted }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, width: '100%' }}>
                  <div style={{ fontSize: '24px' }}>🏦</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: theme.text, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      Bank Account
                      <span style={{ fontSize: '10px', backgroundColor: theme.primary, color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>DEFAULT</span>
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>
                      This primary account stays available. You can update its balance, while extra envelopes can be removed below.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bankBalance}
                        onChange={e => setBankBalance(formatNumberInput(e.target.value))}
                        style={{ ...fieldStyle, width: isMobile ? '100%' : '160px', padding: '8px 10px', fontSize: '14px', marginBottom: 0 }}
                      />
                      <button
                        onClick={handleSaveBalance}
                        disabled={loading}
                        style={{ padding: '8px 16px', width: isMobile ? '100%' : 'auto', background: theme.primary, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}
                      >
                        {loading ? '...' : 'Update'}
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '8px' }}>
                      Current balance: <span style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(parseAmountInput(bankBalance), budget.currency)}</span>
                    </div>
                    {balanceMsg && <div style={{ fontSize: '12px', color: balanceMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{balanceMsg.text}</div>}
                  </div>
                </div>
              </div>
            )}

            {envelopes.map(env => (
              <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', padding: '14px', border: `1px solid ${theme.border}`, borderRadius: '18px', backgroundColor: theme.surfaceMuted }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <div style={{ fontSize: '24px' }}>{env.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {env.name}
                      {env.is_default && <span style={{ fontSize: '10px', backgroundColor: theme.primary, color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>ACCOUNT</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', marginTop: '8px' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editedEnvelopeBalances[env.id] ?? formatNumberInput(env.balance.toString())}
                        onChange={e => setEditedEnvelopeBalances((current) => ({ ...current, [env.id]: formatNumberInput(e.target.value) }))}
                        style={{ ...fieldStyle, width: isMobile ? '100%' : '180px', padding: '8px 10px', fontSize: '14px', marginBottom: 0 }}
                      />
                      <button
                        onClick={() => handleSaveEnvelopeBalance(env.id)}
                        disabled={loading}
                        style={{ padding: '8px 16px', width: isMobile ? '100%' : 'auto', background: theme.primary, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}
                      >
                        {loading ? '...' : 'Update'}
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '8px' }}>
                      Current balance: <span style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(parseAmountInput(editedEnvelopeBalances[env.id] ?? env.balance.toString()), env.currency)}</span>
                    </div>
                    {envUpdateMsg[env.id] && <div style={{ fontSize: '12px', color: envUpdateMsg[env.id]?.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{envUpdateMsg[env.id]?.text}</div>}
                  </div>
                </div>
                <button onClick={() => handleDeleteEnvelope(env.id, env.name)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '10px 12px', borderRadius: '10px', fontWeight: '700', width: isMobile ? '100%' : 'auto' }} title="Delete envelope">
                  Delete
                </button>
              </div>
            ))}
          </div>

          {!showEnvelopeForm ? (
            <button
              onClick={() => setShowEnvelopeForm(true)}
              style={{ width: '100%', padding: '14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: theme.shadow }}>
              + Add Envelope
            </button>
          ) : (
            <div style={{ backgroundColor: theme.surfaceMuted, borderRadius: '18px', padding: '16px', border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: theme.text, margin: 0 }}>New Envelope</h3>
                <button onClick={() => setShowEnvelopeForm(false)} style={{ background: 'none', border: 'none', color: theme.textSubtle, cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Name</label>
                <input type="text" value={envName} onChange={e => setEnvName(e.target.value)} placeholder="e.g. Wallet, Cash, Vacation" style={fieldStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={lbl}>Icon (Emoji)</label>
                  <input type="text" value={envIcon} onChange={e => setEnvIcon(e.target.value)} placeholder="e.g. 💰" style={fieldStyle} />
                </div>
                <div>
                  <label style={lbl}>Initial Balance</label>
                  <input type="text" inputMode="decimal" value={envBalance} onChange={e => setEnvBalance(formatNumberInput(e.target.value))} placeholder="0.00" style={fieldStyle} />
                </div>
              </div>

              <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '12px' }}>
                Starting balance preview: <span style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(parseAmountInput(envBalance), budget?.currency || 'USD')}</span>
              </div>

              <button onClick={handleAddEnvelope} disabled={loading}
                style={{ width: '100%', padding: '12px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Adding...' : 'Save Envelope'}
              </button>
              {envMsg && <div style={{ fontSize: '12px', color: envMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{envMsg.text}</div>}
            </div>
          )}
        </div>

        {/* Recurring Transactions Section */}
        <div style={card}>
          <div style={sectionTitle}><span>🔄</span> Recurring Transactions</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, marginBottom: '16px', lineHeight: '1.6' }}>
            Set up automatic income (like salary) or expenses (like rent) to be added on a schedule.
          </div>
          {recurringDeleteMsg && <div style={{ fontSize: '12px', color: recurringDeleteMsg.type === 'success' ? '#10b981' : '#ef4444', marginBottom: '12px', fontWeight: '600' }}>{recurringDeleteMsg.text}</div>}

          {/* List of existing recurring transactions */}
          {recurringTransactions.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recurringTransactions.map(rt => (
                <div key={rt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', padding: '14px', border: `1px solid ${theme.border}`, borderRadius: '18px', backgroundColor: theme.surfaceMuted }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ backgroundColor: rt.type === 'income' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: rt.type === 'income' ? '#10b981' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {rt.type === 'income' ? '💰' : '💸'} {rt.category}
                      </span>
                      <span style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: '600', textTransform: 'capitalize' }}>
                        Every {rt.frequency.replace('ly', '')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>
                      Next: {new Date(rt.next_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: rt.type === 'income' ? '#10b981' : '#ef4444' }}>
                      {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount, budget?.currency || 'USD')}
                    </div>
                    <button onClick={() => handleDeleteRecurring(rt.id)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '10px 12px', borderRadius: '10px', fontWeight: '700' }} title="Delete recurring transaction">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showRecurringForm ? (
            <button
              onClick={() => setShowRecurringForm(true)}
              style={{ width: '100%', padding: '14px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: theme.shadow }}>
              + Add Recurring Transaction
            </button>
          ) : (
            <div style={{ backgroundColor: theme.surfaceMuted, borderRadius: '18px', padding: '16px', border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: theme.text, margin: 0 }}>New Recurring</h3>
                <button onClick={() => setShowRecurringForm(false)} style={{ background: 'none', border: 'none', color: theme.textSubtle, cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => { setRecType('expense'); setRecCategory(EXPENSE_CATEGORIES[0]); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.surfaceMuted, color: theme.text, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Expense
                </button>
                <button onClick={() => { setRecType('income'); setRecCategory(INCOME_CATEGORIES[0]); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.surfaceMuted, color: theme.text, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Income
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Amount ({currency})</label>
                <input type="number" value={recAmount} onChange={e => setRecAmount(e.target.value)} placeholder="0.00" style={fieldStyle} step="0.01" min="0" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={recCategory} onChange={e => setRecCategory(e.target.value)} style={fieldStyle}>
                    {(recType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Frequency</label>
                  <select value={recFrequency} onChange={e => setRecFrequency(e.target.value as any)} style={fieldStyle}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Start Date (Next occurrence)</label>
                <input type="date" value={recNextDate} onChange={e => setRecNextDate(e.target.value)} style={fieldStyle} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={lbl}>Note (Optional)</label>
                <input type="text" value={recNote} onChange={e => setRecNote(e.target.value)} placeholder="e.g. Rent, Salary, Netflix" style={fieldStyle} />
              </div>

              <button onClick={handleAddRecurring} disabled={loading}
                style={{ width: '100%', padding: '12px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Adding...' : 'Save Recurring'}
              </button>
              {recurringMsg && <div style={{ fontSize: '12px', color: recurringMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{recurringMsg.text}</div>}
            </div>
          )}
        </div>

        {/* Account Info */}
        <div style={card}>
          <div style={sectionTitle}><span>👤</span> Account</div>
          <div style={{ backgroundColor: theme.surfaceMuted, borderRadius: '18px', padding: '14px 16px', marginBottom: '20px', border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Signed in as</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: theme.text }}>{user?.email}</div>
          </div>

          {!signOutConfirm ? (
            <button onClick={() => setSignOutConfirm(true)}
              style={{ width: '100%', padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 14px 30px rgba(239,68,68,0.18)' }}>
              Sign Out
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={() => setSignOutConfirm(false)}
                style={{ flex: 1, padding: '12px', background: theme.surfaceMuted, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSignOut}
                style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 12px 24px rgba(239,68,68,0.16)' }}>
                Confirm Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
