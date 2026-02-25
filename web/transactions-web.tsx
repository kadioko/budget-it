import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import EditTransactionWeb from './edit-transaction-web';

// Format currency with commas
const formatCurrency = (amount: number, currency: string) => {
  // Handle NaN or invalid numbers
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  // For TZS, format without currency symbol (we'll add it manually)
  if (currency === 'TZS') {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' TZS';
  }
  
  // For other currencies, use standard formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function TransactionsWeb({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { transactions, loading, budget, deleteTransaction, fetchTransactions } = useBudgetStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [runningBalance, setRunningBalance] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  // Get unique categories from transactions
  const categories = ['all', ...Array.from(new Set(transactions.map(t => t.category)))];

  // Filter transactions
  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchesType = filterType === 'all' || 
                          (filterType === 'income' && t.amount < 0) ||
                          (filterType === 'expense' && t.amount > 0);
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate running balance
  useEffect(() => {
    let balance = 0;
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedTransactions.forEach(t => {
      balance -= t.amount; // Subtract because expenses are positive, income is negative
    });
    setRunningBalance(balance);
  }, [transactions]);

  // Fetch transactions on mount
  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDelete = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const handleEdit = (transactionId: string) => {
    setEditingTransaction(transactionId);
  };

  const handleEditSave = () => {
    setEditingTransaction(null);
    if (user?.id) fetchTransactions(user.id);
  };

  // Show edit form if editing
  if (editingTransaction) {
    return (
      <EditTransactionWeb 
        transactionId={editingTransaction}
        onBack={() => setEditingTransaction(null)}
        onSave={handleEditSave}
      />
    );
  }

  if (loading && transactions.length === 0) {
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
              <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Loading transactions...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

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
          color: var(--text-main);
        }
        * {
          box-sizing: border-box;
        }
        input:focus, select:focus {
          border-color: var(--primary) !important;
          outline: none;
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
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={onBack}
                style={{
                  background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
                  marginRight: '16px', padding: '8px', color: 'var(--text-main)'
                }}
              >
                ←
              </button>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Transaction History</h1>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Balance</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: (budget?.bank_balance || 0) + runningBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency((budget?.bank_balance || 0) + runningBalance, budget?.currency || 'TZS')}
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '16px', boxShadow: 'var(--shadow-md)', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box',
                backgroundColor: 'var(--bg-main)', color: 'var(--text-main)'
              }}
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  fontSize: '14px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)'
                }}
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  fontSize: '14px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)'
                }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction List */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>No transactions found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>Try changing your filters or add a new transaction.</div>
              </div>
            ) : (
              <div>
                {filteredTransactions.slice(0, visibleCount).map((t, index) => {
                  const isExpense = t.amount > 0;
                  return (
                    <div key={t.id} style={{
                      padding: '16px',
                      borderBottom: index < filteredTransactions.length - 1 ? '1px solid var(--border-light)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: 'var(--bg-card)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            backgroundColor: !isExpense ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: !isExpense ? 'var(--success-text)' : 'var(--danger-text)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {!isExpense ? '💰' : '💸'} {t.category}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {new Date(t.date).toLocaleDateString()}
                          </span>
                        </div>
                        {t.note && (
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            {t.note}
                          </div>
                        )}
                      </div>
                      

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: !isExpense ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {!isExpense ? '+' : '-'}{formatCurrency(Math.abs(t.amount), budget?.currency || 'TZS')}
                        </div>
                        
                        <button
                          onClick={() => handleEdit(t.id)}
                          style={{
                            backgroundColor: '#f39c12',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        
                        <button
                          onClick={() => setShowDeleteConfirm(t.id)}
                          style={{
                            backgroundColor: 'var(--danger)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {visibleCount < filteredTransactions.length && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                  >
                    Load More Transactions... ({filteredTransactions.length - visibleCount} remaining)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(2px)'
            }}>
              <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)', margin: '0 0 16px 0' }}>
                  Delete Transaction
                </h3>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--danger)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
