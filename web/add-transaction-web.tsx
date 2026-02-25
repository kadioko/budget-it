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

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
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
    }
  };

  return (
    <>
      <style>{`
        html, body {
          scrollbar-gutter: stable;
          overflow-y: scroll;
          background: var(--bg-main);
          color: var(--text-main);
        }
        input:focus, select:focus {
          border-color: var(--primary) !important;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        padding: '20px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100vw',
        margin: '0',
        left: '0',
        right: '0',
        backgroundColor: 'var(--bg-main)',
      }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '24px',
          gap: '16px'
        }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>
            Add {transactionType === 'income' ? 'Income' : 'Expense'}
          </h1>
        </div>

        <div style={{ 
          backgroundColor: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: 'var(--shadow-md)'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                Transaction Type
              </label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setTransactionType('expense')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: transactionType === 'expense' ? 'var(--danger)' : 'var(--bg-secondary)',
                    color: transactionType === 'expense' ? '#fff' : 'var(--text-secondary)',
                    border: transactionType === 'expense' ? 'none' : '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  💸 Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('income')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: transactionType === 'income' ? 'var(--success)' : 'var(--bg-secondary)',
                    color: transactionType === 'income' ? '#fff' : 'var(--text-secondary)',
                    border: transactionType === 'income' ? 'none' : '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  💰 Income
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                Amount
              </label>
              <input
                type="text"
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                }}
                required
              />
            </div>

            {envelopes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Envelope / Account
                </label>
                <select
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                }}
              >
                {(transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this expense..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: '#fadbd8', color: '#e74c3c', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ backgroundColor: '#d5f4e6', color: '#1e8449', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#95a5a6' : (transactionType === 'income' ? '#27ae60' : '#e74c3c'),
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            >
              {loading ? 'Adding...' : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
