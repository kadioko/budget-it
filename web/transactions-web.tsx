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
          background: #0f172a;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        * {
          box-sizing: border-box;
        }
        input:focus, select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important;
          outline: none;
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
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={onBack}
                style={{
                  background: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer',
                  marginRight: '16px', padding: '6px 12px', color: '#f8fafc', fontWeight: 'bold'
                }}
              >
                ← Back
              </button>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>Transaction History</h1>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Balance</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: (budget?.bank_balance || 0) + runningBalance >= 0 ? '#10b981' : '#ef4444' }}>
                {formatCurrency((budget?.bank_balance || 0) + runningBalance, budget?.currency || 'TZS')}
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155',
                marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box',
                backgroundColor: '#0f172a', color: '#f8fafc'
              }}
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #334155',
                  fontSize: '14px', backgroundColor: '#0f172a', color: '#f8fafc'
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
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #334155',
                  fontSize: '14px', backgroundColor: '#0f172a', color: '#f8fafc'
                }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction List */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>No transactions found</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>Try changing your filters or add a new transaction.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                {filteredTransactions.slice(0, visibleCount).map((t, index) => {
                  const isExpense = t.amount > 0;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#334155', borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: !isExpense ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                          {!isExpense ? '💰' : '💸'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>{t.category}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {t.note ? ` · ${t.note}` : ''}
                          </div>
                        </div>
                      </div>
                      

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '800',
                          color: !isExpense ? '#10b981' : '#ef4444'
                        }}>
                          {!isExpense ? '+' : '-'}{formatCurrency(Math.abs(t.amount), budget?.currency || 'TZS')}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleEdit(t.id)}
                            style={{
                              backgroundColor: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
                            }}
                          >
                            Edit
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteConfirm(t.id)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#ef4444',
                              border: '1px solid #ef4444',
                              borderRadius: '6px',
                              padding: '5px 11px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {visibleCount < filteredTransactions.length && (
                  <button
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginTop: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#3b82f6',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                border: '1px solid #334155'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 16px 0' }}>
                  Delete Transaction
                </h3>
                <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
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
                      backgroundColor: '#ef4444',
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
