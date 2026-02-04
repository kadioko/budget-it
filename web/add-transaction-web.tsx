import React, { useState } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

export default function AddTransactionWeb({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { addTransaction, loading } = useBudgetStore();
  
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  // Format amount with commas
  const formatAmountWithCommas = (value: string) => {
    // Remove all non-digit and non-decimal characters
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Split into integer and decimal parts
    const parts = cleanValue.split('.');
    let integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    
    // Add commas to integer part
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Return formatted value
    if (decimalPart) {
      return `${integerPart}.${decimalPart}`;
    }
    return integerPart;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayAmount(formatAmountWithCommas(value));
    // Store the clean value for submission
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
      // For income, we store as negative amount to increase balance
      const transactionAmount = transactionType === 'income' ? -Math.abs(parseFloat(amount)) : parseFloat(amount);
      
      await addTransaction(
        user.id,
        transactionAmount,
        category,
        date,
        note || undefined
      );
      onBack(); // Go back to dashboard
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
          margin: 0;
          padding: 0;
          width: 100%;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5', 
        padding: '20px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100vw',
        margin: '0',
        left: '0',
        right: '0'
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
              color: '#3498db',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>
            Add {transactionType === 'income' ? 'Income' : 'Expense'}
          </h1>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                Transaction Type
              </label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setTransactionType('expense')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: transactionType === 'expense' ? '#e74c3c' : '#fff',
                    color: transactionType === 'expense' ? '#fff' : '#e74c3c',
                    border: '2px solid #e74c3c',
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
                    backgroundColor: transactionType === 'income' ? '#27ae60' : '#fff',
                    color: transactionType === 'income' ? '#fff' : '#27ae60',
                    border: '2px solid #27ae60',
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
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
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
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff',
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
              <div style={{
                backgroundColor: '#fadbd8',
                color: '#e74c3c',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {error}
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
