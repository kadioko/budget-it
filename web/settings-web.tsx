import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'];

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid var(--border-color)',
  borderRadius: '10px', fontSize: '15px', backgroundColor: '#fff',
  outline: 'none', color: 'var(--text-main)', boxSizing: 'border-box',
};

function Msg({ text, type }: { text: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginTop: '12px',
      backgroundColor: type === 'success' ? '#f0fdf4' : '#fdf2f2',
      border: `1px solid ${type === 'success' ? '#bbf7d0' : '#f5c6c6'}`,
      color: type === 'success' ? '#166534' : '#c0392b',
    }}>
      {type === 'success' ? '✅' : '⚠️'} {text}
    </div>
  );
}

export default function SettingsWeb({ onBack }: { onBack: () => void }) {
  const { user, signOut } = useAuthStore();
  const { budget, loading, createBudget, updateBudget, updateBankBalance, recurringTransactions, fetchRecurringTransactions, addRecurringTransaction, deleteRecurringTransaction, envelopes, fetchEnvelopes, createEnvelope, deleteEnvelope } = useBudgetStore();

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

  const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' };
  const card: React.CSSProperties = { backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: 'var(--shadow-md)' };
  const sectionTitle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg-main); color: var(--text-main); }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input:focus, select:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(52,152,219,0.15) !important; }
        .curr-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Sticky header */}
      <div style={{ background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '16px', cursor: 'pointer', padding: '6px 14px', fontWeight: '700' }}>
            ← Back
          </button>
          <span style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>⚙️ Settings</span>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px 60px', animation: 'fadeIn 0.4s ease' }}>
        
        {/* Budget Targets */}
        <div style={card}>
          <div style={sectionTitle}><span>🎯</span> Budget Targets</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={lbl}>Currency</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'].map(c => (
                  <button key={c} className="curr-btn" onClick={() => setCurrency(c)}
                    style={{ flex: '1 1 calc(20% - 8px)', padding: '10px 0', border: currency === c ? '2px solid var(--primary)' : '1px solid var(--border-color)', borderRadius: '8px', background: currency === c ? 'var(--primary)' : 'var(--bg-card)', color: currency === c ? '#fff' : 'var(--text-main)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Month Starts On (Day)</label>
              <select value={monthStartDay} onChange={e => setMonthStartDay(e.target.value)} style={fieldStyle}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSaveBudget} disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? 'var(--text-muted)' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(52,152,219,0.3)', marginTop: '8px' }}>
            {loading ? 'Saving...' : '💾 Save Budget Settings'}
          </button>
          {budgetMsg && <Msg text={budgetMsg.text} type={budgetMsg.type} />}
        </div>

        {/* Envelopes Section */}
        <div style={card}>
          <div style={sectionTitle}><span>💌</span> Envelopes & Accounts</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
            Manage multiple accounts or budgeting envelopes (e.g., Wallet, Bank, Vacation Fund).
          </div>
          
          {envelopes.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {envelopes.map(env => (
                <div key={env.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>{env.icon}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {env.name}
                        {env.is_default && <span style={{ fontSize: '10px', backgroundColor: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>DEFAULT</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatCurrency(env.balance, env.currency)}
                      </div>
                    </div>
                  </div>
                  {!env.is_default && (
                    <button onClick={async () => {
                      if(window.confirm('Are you sure you want to delete this envelope? Transactions will lose this envelope reference.')) {
                        try {
                          await deleteEnvelope(env.id);
                        } catch(e) {
                          alert('Failed to delete envelope');
                        }
                      }
                    }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px', padding: '4px' }} title="Delete">
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!showEnvelopeForm ? (
            <button
              onClick={() => setShowEnvelopeForm(true)}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #16a085, #2ecc71)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(46,204,113,0.35)' }}>
              + Add Envelope
            </button>
          ) : (
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>New Envelope</h3>
                <button onClick={() => setShowEnvelopeForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Name</label>
                <input type="text" value={envName} onChange={e => setEnvName(e.target.value)} placeholder="e.g. Wallet, Cash, Vacation" style={fieldStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Adding...' : 'Save Envelope'}
              </button>
              {envMsg && <Msg text={envMsg.text} type={envMsg.type} />}
            </div>
          )}
        </div>

        {/* Bank Balance (Legacy / Default) */}
        <div style={card}>
          <div style={sectionTitle}><span>🏦</span> Bank Account Balance</div>
          <label style={lbl}>Starting Balance ({currency})</label>
          <input type="number" step="0.01" value={bankBalance} onChange={e => setBankBalance(e.target.value)}
            placeholder="0.00" style={{ ...fieldStyle, marginBottom: '12px' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Your initial balance — transactions will be deducted from this
          </div>
          <button onClick={handleSaveBalance} disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? 'var(--text-muted)' : 'var(--success)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(39,174,96,0.35)', marginTop: '8px' }}>
            {loading ? 'Saving...' : '💾 Save Balance'}
          </button>
          {balanceMsg && <Msg text={balanceMsg.text} type={balanceMsg.type} />}
        </div>

        {/* Recurring Transactions Section */}
        <div style={card}>
          <div style={sectionTitle}><span>🔄</span> Recurring Transactions</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
            Set up automatic income (like salary) or expenses (like rent) to be added on a schedule.
          </div>
          
          {/* List of existing recurring transactions */}
          {recurringTransactions.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recurringTransactions.map(rt => (
                <div key={rt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ backgroundColor: rt.type === 'income' ? 'var(--success-bg)' : 'var(--danger-bg)', color: rt.type === 'income' ? 'var(--success)' : 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {rt.type === 'income' ? '💰' : '💸'} {rt.category}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'capitalize' }}>
                        Every {rt.frequency.replace('ly', '')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      Next: {new Date(rt.next_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: rt.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                      {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount, budget?.currency || 'USD')}
                    </div>
                    <button onClick={() => handleDeleteRecurring(rt.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px', padding: '4px' }} title="Delete">
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
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #9b59b6, #8e44ad)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(155,89,182,0.35)' }}>
              + Add Recurring Transaction
            </button>
          ) : (
            <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>New Recurring</h3>
                <button onClick={() => setShowRecurringForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => { setRecType('expense'); setRecCategory(EXPENSE_CATEGORIES[0]); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: recType === 'expense' ? '2px solid var(--danger)' : '1px solid var(--border-color)', background: recType === 'expense' ? 'var(--danger-bg)' : 'var(--bg-card)', color: recType === 'expense' ? 'var(--danger)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Expense
                </button>
                <button onClick={() => { setRecType('income'); setRecCategory(INCOME_CATEGORIES[0]); }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: recType === 'income' ? '2px solid var(--success)' : '1px solid var(--border-color)', background: recType === 'income' ? 'var(--success-bg)' : 'var(--bg-card)', color: recType === 'income' ? 'var(--success)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Income
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Amount ({currency})</label>
                <input type="number" value={recAmount} onChange={e => setRecAmount(e.target.value)} placeholder="0.00" style={fieldStyle} step="0.01" min="0" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Adding...' : 'Save Recurring'}
              </button>
              {recurringMsg && <Msg text={recurringMsg.text} type={recurringMsg.type} />}
            </div>
          )}
        </div>

        {/* Account Info */}
        <div style={card}>
          <div style={sectionTitle}><span>👤</span> Account</div>
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Signed in as</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>{user?.email}</div>
          </div>

          {!signOutConfirm ? (
            <button onClick={() => setSignOutConfirm(true)}
              style={{ width: '100%', padding: '14px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(231,76,60,0.3)' }}>
              Sign Out
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSignOutConfirm(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSignOut}
                style={{ flex: 1, padding: '12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(231,76,60,0.3)' }}>
                Confirm Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
