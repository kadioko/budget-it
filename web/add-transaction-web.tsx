import React, { useState } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

// Format currency with commas
const formatCurrency = (amount: number, currency: string) => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  if (currency === 'TZS') {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' TZS';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function AddTransactionWeb({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { addTransaction, loading, envelopes, budget } = useBudgetStore();
  
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [envelopeId, setEnvelopeId] = useState(envelopes.find(e => e.is_default)?.id || envelopes[0]?.id || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
  const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

  const formatAmountWithCommas = (value: string) => {
    const cleanValue = value.replace(/[^\d.]/g, '');
    const parts = cleanValue.split('.');
    let integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decimalPart) {
      return `${integerPart}.${decimalPart}`;
    }
    return integerPart;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayAmount(formatAmountWithCommas(value));
    const cleanValue = value.replace(/[^\d.]/g, '');
    setAmount(cleanValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalAmount = transactionType === 'expense' ? parseFloat(amount) : -parseFloat(amount);
      await addTransaction(
        user.id,
        finalAmount,
        category,
        date,
        note || undefined,
        envelopeId || null
      );
      
      const transactionTypeText = transactionType === 'income' ? 'Income' : 'Expense';
      const actionText = transactionType === 'income' ? 'added to' : 'deducted from';
      setSuccess(`${transactionTypeText} of ${formatCurrency(Math.abs(parseFloat(amount)), budget?.currency || 'USD')} successfully ${actionText} your balance!`);
      setTimeout(() => onBack(), 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = loading || isSubmitting;

  return (
    <>
      <style>{`
        html, body {
          scrollbar-gutter: stable;
          overflow-y: scroll;
          margin: 0;
          padding: 0;
          width: 100%;
          background: #0f172a;
          color: #f8fafc;
          font-family: var(--app-font-body, "Manrope", sans-serif);
        }
        *, *::before, *::after {
          box-sizing: border-box;
          font-family: inherit;
        }
        input:focus, select:focus, textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important;
          outline: none;
        }
        /* Date input calendar icon filter for dark mode */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.6;
          cursor: pointer;
        }
        .back-btn {
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background-color: #334155 !important;
        }
        .type-btn {
          transition: all 0.2s ease;
        }
        .type-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0f172a', 
        padding: '20px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100vw',
        margin: '0',
        left: '0',
        right: '0'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '60px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
            <button
              className="back-btn"
              onClick={onBack}
              style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '15px', cursor: 'pointer',
                padding: '10px 16px', color: '#f8fafc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <span>←</span> Back
            </button>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>
              Add {transactionType === 'income' ? 'Income' : 'Expense'}
            </h1>
          </div>

          <div style={{ 
            backgroundColor: '#1e293b', 
            padding: '32px', 
            borderRadius: '24px', 
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Transaction Type
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="type-btn"
                    onClick={() => setTransactionType('expense')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: transactionType === 'expense' ? 'rgba(239,68,68,0.15)' : '#0f172a',
                      color: transactionType === 'expense' ? '#ef4444' : '#64748b',
                      border: `2px solid ${transactionType === 'expense' ? '#ef4444' : '#334155'}`,
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    💸 Expense
                  </button>
                  <button
                    type="button"
                    className="type-btn"
                    onClick={() => setTransactionType('income')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: transactionType === 'income' ? 'rgba(16,185,129,0.15)' : '#0f172a',
                      color: transactionType === 'income' ? '#10b981' : '#64748b',
                      border: `2px solid ${transactionType === 'income' ? '#10b981' : '#334155'}`,
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    💰 Income
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
                  Amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94a3b8', fontWeight: '600' }}>
                    {budget?.currency === 'TZS' ? 'TSh' : '$'}
                  </span>
                  <input
                    type="text"
                    value={displayAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 56px',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: '700',
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                    }}
                    required
                  />
                </div>
              </div>

              {envelopes.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
                    Envelope / Account
                  </label>
                  <select
                    value={envelopeId}
                    onChange={(e) => setEnvelopeId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      cursor: 'pointer',
                      appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto',
                    }}
                  >
                    <option value="">Default Bank Account</option>
                    {envelopes.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.icon} {env.name} ({formatCurrency(env.balance, env.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto',
                  }}
                >
                  {(transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    colorScheme: 'dark',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note about this expense..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '15px',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {error && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠️ {error}
                </div>
              )}
              {success && (
                <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: '600', border: '1px solid rgba(16,185,129,0.2)' }}>
                  ✅ {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: isBusy ? '#334155' : (transactionType === 'income' ? '#10b981' : '#ef4444'),
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isBusy ? 'none' : `0 4px 12px ${transactionType === 'income' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                }}
                onMouseEnter={(e) => !isBusy && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !isBusy && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isBusy ? 'Saving transaction...' : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
