import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { themeTokens, useThemeStore } from '../src/store/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'];

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

export default function SettingsWeb({ onBack }: { onBack: () => void }) {
  const { user, signOut } = useAuthStore();
  const { budget, loading, createBudget, updateBudget, updateBankBalance, recurringTransactions, fetchRecurringTransactions, addRecurringTransaction, deleteRecurringTransaction, envelopes, fetchEnvelopes, createEnvelope, deleteEnvelope } = useBudgetStore();
  const { mode, setMode, toggleMode } = useThemeStore();
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
  const [balanceMsg, setBalanceMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [recurringMsg, setRecurringMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [envMsg, setEnvMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  // New Recurring Transaction Form State
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('Salary');
  const [recType, setRecType] = useState<'income' | 'expense'>('income');
  const [recFrequency, setRecFrequency] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [recNextDate, setRecNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [recNote, setRecNote] = useState('');

  // New Envelope Form State
  const [showEnvelopeForm, setShowEnvelopeForm] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envIcon, setEnvIcon] = useState('💰');
  const [envBalance, setEnvBalance] = useState('');

  const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Rent', 'Other'];
  const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

  useEffect(() => {
    if (user?.id) {
      fetchRecurringTransactions(user.id);
      fetchEnvelopes(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (budget) {
      setDailyTarget(budget.daily_target.toString());
      setMonthlyTarget(budget.monthly_target.toString());
      setCurrency(budget.currency);
      setMonthStartDay(budget.month_start_day.toString());
      setBankBalance(budget.bank_balance?.toString() || '0');
    }
  }, [budget]);

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
      await updateBankBalance(budget.id, parseFloat(bankBalance) || 0);
      setBalanceMsg({ text: 'Bank balance updated successfully!', type: 'success' });
    } catch (error: any) {
      setBalanceMsg({ text: error.message || 'Failed to update balance', type: 'error' });
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
    try {
      await deleteRecurringTransaction(id);
    } catch (error) {
      console.error('Failed to delete recurring transaction', error);
    }
  };

  const handleAddEnvelope = async () => {
    setEnvMsg(null);
    if (!envName) {
      setEnvMsg({ text: 'Please enter a name for the envelope', type: 'error' });
      return;
    }
    const bal = parseFloat(envBalance) || 0;
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
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input:focus, select:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important; }
        .curr-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Sticky header */}
      <div style={{ background: theme.navSurface, position: 'sticky', top: 0, zIndex: 100, boxShadow: theme.shadow, borderBottom: `1px solid ${theme.border}`, backdropFilter: 'blur(14px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
          <button onClick={onBack} style={{ background: theme.surfaceStrong, border: `1px solid ${theme.borderStrong}`, borderRadius: '12px', color: theme.primary, fontSize: '16px', cursor: 'pointer', padding: '8px 14px', fontWeight: '700' }}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Preferences</div>
            <span style={{ fontSize: '20px', fontWeight: '900', color: theme.text, letterSpacing: '-0.5px' }}>⚙️ Settings</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px 60px', animation: 'fadeIn 0.4s ease' }}>
        <div style={card}>
          <div style={sectionTitle}><span>{mode === 'dark' ? '🌙' : '☀️'}</span> Appearance</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6, marginBottom: '16px' }}>Choose how the web app looks. Your preference is saved on this device.</div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', marginBottom: '12px' }}>
            <button onClick={() => setMode('light')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: `1px solid ${mode === 'light' ? theme.borderStrong : theme.border}`, background: mode === 'light' ? theme.primary : theme.surfaceMuted, color: mode === 'light' ? '#fff' : theme.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              Light mode
            </button>
            <button onClick={() => setMode('dark')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: `1px solid ${mode === 'dark' ? theme.borderStrong : theme.border}`, background: mode === 'dark' ? theme.primary : theme.surfaceMuted, color: mode === 'dark' ? '#fff' : theme.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              Dark mode
            </button>
          </div>
          <button onClick={toggleMode} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: theme.surfaceMuted, color: theme.text, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            Toggle to {mode === 'light' ? 'dark' : 'light'}
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

        {/* Envelopes Section */}
        <div style={card}>
          <div style={sectionTitle}><span>💌</span> Envelopes & Accounts</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, marginBottom: '16px', lineHeight: '1.6' }}>
            Your main bank account plus any extra envelopes (e.g., Wallet, Cash, Vacation Fund).
          </div>

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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={bankBalance}
                        onChange={e => setBankBalance(e.target.value)}
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
                    {balanceMsg && <div style={{ fontSize: '12px', color: balanceMsg.type === 'success' ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: '600' }}>{balanceMsg.text}</div>}
                  </div>
                </div>
              </div>
            )}

            {envelopes.map(env => (
              <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', padding: '14px', border: `1px solid ${theme.border}`, borderRadius: '18px', backgroundColor: theme.surfaceMuted }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '24px' }}>{env.icon}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {env.name}
                      {env.is_default && <span style={{ fontSize: '10px', backgroundColor: theme.primary, color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>ACCOUNT</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textMuted }}>
                      {formatCurrency(env.balance, env.currency)}
                    </div>
                  </div>
                </div>
                <button onClick={async () => {
                  if(window.confirm('Delete this envelope? Transactions will lose this reference.')) {
                    try { await deleteEnvelope(env.id); } catch(e) { alert('Failed to delete envelope'); }
                  }
                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }} title="Delete">
                  🗑️
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
                  <input type="number" value={envBalance} onChange={e => setEnvBalance(e.target.value)} placeholder="0.00" style={fieldStyle} step="0.01" />
                </div>
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
                    <button onClick={() => handleDeleteRecurring(rt.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }} title="Delete">
                      🗑️
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
