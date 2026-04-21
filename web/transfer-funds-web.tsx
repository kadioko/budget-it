import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { themeTokens, useThemeStore } from '../src/store/theme';

const formatCurrency = (amount: number, currency: string) => {
  if (!Number.isFinite(amount)) amount = 0;
  if (currency === 'TZS') {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TZS';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
};

export default function TransferFundsWeb({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { budget, envelopes, createTransfer, loading, isOffline } = useBudgetStore();
  const { mode } = useThemeStore();
  const theme = themeTokens[mode];
  const [fromAccountId, setFromAccountId] = useState<'bank' | string>('bank');
  const [toAccountId, setToAccountId] = useState<string>(envelopes[0]?.id || 'bank');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const accountOptions = useMemo(() => [
    { id: 'bank', label: 'Bank account', icon: '🏦', balance: budget?.bank_balance || 0 },
    ...envelopes.map((envelope) => ({ id: envelope.id, label: envelope.name, icon: envelope.icon, balance: envelope.balance })),
  ], [budget?.bank_balance, envelopes]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = Number(amount);
    if (!user) {
      setError('You need to be signed in to move funds.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }

    try {
      await createTransfer(user.id, numericAmount, fromAccountId, toAccountId as 'bank' | string, date, note || undefined);
      setSuccess(`Moved ${formatCurrency(numericAmount, budget?.currency || 'USD')} successfully.`);
      setTimeout(() => onBack(), 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer funds.');
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.surfaceMuted,
    color: theme.text,
    fontSize: '15px',
    boxSizing: 'border-box',
  };

  const hasTransferTargets = accountOptions.length >= 2;

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; font-family: var(--app-font-body, "Manrope", sans-serif); background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: theme.background, padding: '20px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <button onClick={onBack} style={{ padding: '10px 14px', borderRadius: '12px', border: `1px solid ${theme.borderStrong}`, color: theme.primary, backgroundColor: theme.surfaceStrong, fontWeight: 700, cursor: 'pointer' }}>
              ← Back
            </button>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Move Money</div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, color: theme.text, margin: 0 }}>Transfer between accounts</h1>
            </div>
          </div>

          {!budget ? (
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '40px 28px', boxShadow: theme.shadow, textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '14px' }}>🎯</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: theme.text, marginBottom: '8px' }}>Set up your budget first</div>
              <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.7 }}>
                Transfers need a budget and at least one account context before money can move between places.
              </div>
            </div>
          ) : !hasTransferTargets ? (
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '40px 28px', boxShadow: theme.shadow, textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '14px' }}>💼</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: theme.text, marginBottom: '8px' }}>Add another account or envelope first</div>
              <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.7 }}>
                Transfers work best once you have your main bank account plus at least one extra envelope to move money into or out of.
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', padding: '24px', boxShadow: theme.shadow }}>
            {isOffline && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#b45309' }}>
                You are offline. Transfers are disabled until the app reconnects because both account balances need to stay in sync.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: theme.textSubtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>From</label>
                <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} style={fieldStyle}>
                  {accountOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.icon} {option.label} ({formatCurrency(option.balance, budget?.currency || 'USD')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: theme.textSubtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>To</label>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} style={fieldStyle}>
                  {accountOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.icon} {option.label} ({formatCurrency(option.balance, budget?.currency || 'USD')})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: theme.textSubtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Amount</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldStyle} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: theme.textSubtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: theme.textSubtle, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Note</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={fieldStyle} placeholder="Optional note for this transfer" />
            </div>

            {error && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.18)', color: theme.danger }}>{error}</div>}
            {success && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.18)', color: theme.success }}>{success}</div>}

            <button type="submit" disabled={loading || isOffline} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: loading || isOffline ? '#94a3b8' : theme.primary, color: '#fff', fontSize: '15px', fontWeight: 800, cursor: loading || isOffline ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Moving funds...' : 'Move Funds'}
            </button>
          </form>
          )}
        </div>
      </div>
    </>
  );
}
