import React, { useState, useEffect } from 'react';
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

interface EditTransactionWebProps {
  transactionId: string;
  onBack: () => void;
  onSave: () => void;
}

export default function EditTransactionWeb({ transactionId, onBack, onSave }: EditTransactionWebProps) {
  const { user } = useAuthStore();
  const { transactions, updateTransaction, loading, budget, envelopes } = useBudgetStore();
  
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the transaction to edit
  const transaction = transactions.find(t => t.id === transactionId);

  // Format amount with commas
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

  useEffect(() => {
    if (transaction) {
      const cleanAmount = Math.abs(transaction.amount).toString();
      setAmount(cleanAmount);
      setDisplayAmount(formatAmountWithCommas(cleanAmount));
      setCategory(transaction.category);
      setDate(transaction.date);
      setNote(transaction.note || '');
      setTransactionType(transaction.amount < 0 ? 'income' : 'expense');
      setEnvelopeId(transaction.envelope_id || '');
    }
  }, [transaction]);

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
      // For income, we store as negative amount to increase balance
      const transactionAmount = transactionType === 'income' ? -Math.abs(parseFloat(amount)) : parseFloat(amount);
      
      await updateTransaction(
        transactionId,
        transactionAmount,
        category,
        date,
        note || undefined,
        envelopeId || null
      );
      
      const transactionTypeText = transactionType === 'income' ? 'Income' : 'Expense';
      setSuccess(`${transactionTypeText} of ${formatCurrency(Math.abs(parseFloat(amount)), budget?.currency || 'USD')} successfully updated!`);
      setTimeout(() => { onSave(); onBack(); }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) {
    return (
      <>
        <style>{`
          html, body {
            scrollbar-gutter: stable;
            overflow-y: scroll;
            margin: 0;
            padding: 0;
            width: 100%;
            background: var(--bg-main);
          }
          * {
            box-sizing: border-box;
          }
        `}</style>
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: 'var(--bg-main)', 
          padding: '20px',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100vw',
          margin: '0',
          left: '0',
          right: '0'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Transaction not found</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-main)',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };
  const isBusy = loading || isSubmitting;

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
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '20px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
                marginRight: '16px', padding: '8px', color: 'var(--text-main)'
              }}
            >
              ←
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Edit Transaction</h1>
          </div>

          <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
            
            {/* Type Toggle */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => { setTransactionType('expense'); if (!EXPENSE_CATEGORIES.includes(category)) setCategory(''); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: transactionType === 'expense' ? 'var(--danger)' : 'var(--bg-secondary)',
                  color: transactionType === 'expense' ? '#fff' : 'var(--text-secondary)',
                  border: transactionType === 'expense' ? 'none' : '2px solid var(--border-color)',
                }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => { setTransactionType('income'); if (!INCOME_CATEGORIES.includes(category)) setCategory(''); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: transactionType === 'income' ? 'var(--success)' : 'var(--bg-secondary)',
                  color: transactionType === 'income' ? '#fff' : 'var(--text-secondary)',
                  border: transactionType === 'income' ? 'none' : '2px solid var(--border-color)',
                }}
              >
                Income
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Amount *</label>
              <input type="text" value={displayAmount} onChange={handleAmountChange} placeholder="0.00" required style={fieldStyle} />
            </div>

            {envelopes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Envelope / Account</label>
                <select value={envelopeId} onChange={(e) => setEnvelopeId(e.target.value)} style={fieldStyle}>
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
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required style={fieldStyle}>
                <option value="" disabled>Select a category</option>
                {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {/* Keep existing category if it's custom/old */}
                {category && !(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(category) && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={fieldStyle} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Note (Optional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" style={fieldStyle} />
            </div>

            {error && (
              <div style={{
                padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 'bold',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                border: '1px solid var(--danger-border)'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            {success && (
              <div style={{
                padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 'bold',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success-text)',
                border: '1px solid var(--success-border)'
              }}>
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              style={{
                width: '100%', padding: '16px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.7 : 1, transition: 'background-color 0.2s'
              }}
            >
              {isBusy ? 'Saving changes...' : 'Update Transaction'}
            </button>
            
          </form>
        </div>
      </div>
    </>
  );
}
