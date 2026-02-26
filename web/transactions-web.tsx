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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          html, body {
            scrollbar-gutter: stable;
            overflow-y: scroll;
            margin: 0;
            padding: 0;
            width: 100%;
            background: #0f172a;
            color: #f8fafc;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          * {
            box-sizing: border-box;
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
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#94a3b8' }}>Loading transactions...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        html, body {
          scrollbar-gutter: stable;
          overflow-y: scroll;
          margin: 0;
          padding: 0;
          width: 100%;
          background: #0f172a;
          color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        * {
          box-sizing: border-box;
        }
        input:focus, select:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important;
          outline: none;
        }
        .tx-row {
          transition: all 0.2s ease;
        }
        .tx-row:hover {
          background-color: #273549 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px -4px rgba(0,0,0,0.3) !important;
        }
        .back-btn {
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background-color: #334155 !important;
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
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>Transactions</h1>
            </div>
            
            <div style={{ textAlign: 'right', background: (budget?.bank_balance || 0) + runningBalance >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '10px 16px', borderRadius: '12px', border: `1px solid ${(budget?.bank_balance || 0) + runningBalance >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
              <div style={{ fontSize: '11px', color: (budget?.bank_balance || 0) + runningBalance >= 0 ? '#10b981' : '#ef4444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', opacity: 0.8 }}>Total Balance</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: (budget?.bank_balance || 0) + runningBalance >= 0 ? '#10b981' : '#ef4444', lineHeight: 1 }}>
                {formatCurrency((budget?.bank_balance || 0) + runningBalance, budget?.currency || 'TZS')}
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)', marginBottom: '24px', border: '1px solid #334155' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid #334155',
                  fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: '#f8fafc', fontWeight: '500'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155',
                  fontSize: '14px', backgroundColor: '#0f172a', color: '#f8fafc', fontWeight: '600', cursor: 'pointer'
                }}
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income Only</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155',
                  fontSize: '14px', backgroundColor: '#0f172a', color: '#f8fafc', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction List */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)', overflow: 'hidden', border: '1px solid #334155' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.8 }}>📭</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>No transactions found</div>
                <div style={{ fontSize: '15px', marginTop: '8px' }}>Try changing your filters or add a new transaction.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredTransactions.slice(0, visibleCount).map((t, index) => {
                  const isExpense = t.amount > 0;
                  return (
                    <div key={t.id} className="tx-row" style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px',
                      backgroundColor: '#1e293b', borderBottom: index < filteredTransactions.length - 1 ? '1px solid #334155' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{ 
                          width: '48px', height: '48px', borderRadius: '12px', 
                          backgroundColor: !isExpense ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 
                        }}>
                          {!isExpense ? '💰' : '💸'}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>{t.category}</div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {t.note && <span style={{ color: '#64748b' }}> • {t.note}</span>}
                          </div>
                        </div>
                      </div>
                      

                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{
                          fontSize: '17px',
                          fontWeight: '800',
                          color: !isExpense ? '#10b981' : '#ef4444'
                        }}>
                          {!isExpense ? '+' : '-'}{formatCurrency(Math.abs(t.amount), budget?.currency || 'TZS')}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEdit(t.id)}
                            style={{
                              backgroundColor: 'rgba(59,130,246,0.15)',
                              color: '#3b82f6',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#3b82f6'; }}
                          >
                            Edit
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteConfirm(t.id)}
                            style={{
                              backgroundColor: 'rgba(239,68,68,0.15)',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
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
                      padding: '20px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderTop: '1px solid #334155',
                      color: '#3b82f6',
                      fontSize: '14px',
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
              backgroundColor: 'rgba(15,23,42,0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(51, 65, 85, 0.5)',
                border: 'none',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#f8fafc', margin: '0 0 12px 0' }}>
                  Delete Transaction
                </h3>
                <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '32px', lineHeight: 1.5 }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      backgroundColor: '#334155',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      backgroundColor: '#ef4444',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
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
