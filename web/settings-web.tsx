import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'];

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid #e0e0e0',
  borderRadius: '10px', fontSize: '15px', backgroundColor: '#fff',
  outline: 'none', color: '#2c3e50', boxSizing: 'border-box',
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
  const { budget, loading, createBudget, updateBudget, updateBankBalance } = useBudgetStore();

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
  const [signOutConfirm, setSignOutConfirm] = useState(false);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch {}
  };

  const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#636e72', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' };
  const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' };
  const sectionTitle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', color: '#2c3e50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input:focus, select:focus { border-color: #3498db !important; box-shadow: 0 0 0 3px rgba(52,152,219,0.15) !important; }
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

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px 48px', animation: 'fadeIn 0.3s ease' }}>

        {/* Budget Targets */}
        <div style={card}>
          <div style={sectionTitle}><span>🎯</span> Budget Targets</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={lbl}>Daily Target ({currency})</label>
              <input type="number" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)}
                placeholder="e.g. 50000" disabled={loading} style={fieldStyle} step="0.01" min="0" />
            </div>
            <div>
              <label style={lbl}>Monthly Target ({currency})</label>
              <input type="number" value={monthlyTarget} onChange={e => setMonthlyTarget(e.target.value)}
                placeholder="e.g. 1500000" disabled={loading} style={fieldStyle} step="0.01" min="0" />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Currency</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {CURRENCIES.map(curr => (
                <button key={curr} className="curr-btn" onClick={() => setCurrency(curr)} disabled={loading}
                  style={{
                    padding: '8px 4px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
                    border: currency === curr ? '2px solid #3498db' : '1.5px solid #e0e0e0',
                    backgroundColor: currency === curr ? '#ebf5fb' : '#fff',
                    color: currency === curr ? '#2980b9' : '#636e72',
                  }}>
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Month Start Day (1–28)</label>
            <input type="number" value={monthStartDay} onChange={e => setMonthStartDay(e.target.value)}
              placeholder="1" disabled={loading} style={fieldStyle} min="1" max="28" />
            <div style={{ fontSize: '11px', color: '#b2bec3', marginTop: '4px' }}>Day of month your budget period resets</div>
          </div>

          <button onClick={handleSaveBudget} disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(52,152,219,0.35)' }}>
            {loading ? 'Saving...' : budget ? '💾 Update Budget' : '🚀 Create Budget'}
          </button>
          {budgetMsg && <Msg text={budgetMsg.text} type={budgetMsg.type} />}
        </div>

        {/* Bank Balance */}
        <div style={card}>
          <div style={sectionTitle}><span>🏦</span> Bank Account Balance</div>
          <label style={lbl}>Starting Balance ({currency})</label>
          <input type="number" step="0.01" value={bankBalance} onChange={e => setBankBalance(e.target.value)}
            placeholder="0.00" style={{ ...fieldStyle, marginBottom: '12px' }} />
          <div style={{ fontSize: '11px', color: '#b2bec3', marginBottom: '16px' }}>
            Your initial balance — transactions will be deducted from this
          </div>
          <button onClick={handleSaveBalance} disabled={loading}
            style={{ width: '100%', padding: '14px', background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #27ae60, #219a52)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 12px rgba(39,174,96,0.35)' }}>
            {loading ? 'Saving...' : '💾 Save Balance'}
          </button>
          {balanceMsg && <Msg text={balanceMsg.text} type={balanceMsg.type} />}
        </div>

        {/* Account Info */}
        <div style={card}>
          <div style={sectionTitle}><span>👤</span> Account</div>
          <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#b2bec3', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Signed in as</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#2c3e50' }}>{user?.email}</div>
          </div>

          {!signOutConfirm ? (
            <button onClick={() => setSignOutConfirm(true)}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #e74c3c, #c0392b)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(231,76,60,0.3)' }}>
              Sign Out
            </button>
          ) : (
            <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #f5c6c6', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#c0392b', marginBottom: '12px', textAlign: 'center' }}>
                Are you sure you want to sign out?
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSignOutConfirm(false)}
                  style={{ flex: 1, padding: '12px', background: '#fff', color: '#636e72', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSignOut}
                  style={{ flex: 1, padding: '12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  Yes, Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
