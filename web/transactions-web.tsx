import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { themeTokens, useThemeStore } from '../src/store/theme';
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
  const { mode } = useThemeStore();
  const theme = themeTokens[mode];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [runningBalance, setRunningBalance] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => setIsMobile(window.innerWidth < 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const handleDelete = async (transactionId: string) => {
    setDeletingTransactionId(transactionId);
    try {
      await deleteTransaction(transactionId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setDeletingTransactionId(null);
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
            background: var(--app-bg, ${theme.background});
            color: var(--app-text, ${theme.text});
            font-family: var(--app-font-body, "Manrope", sans-serif);
          }
          * {
            box-sizing: border-box;
          }
        `}</style>
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: theme.background, 
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
              <div style={{ fontSize: '18px', color: theme.textSubtle, letterSpacing: '0.9px', marginBottom: '6px' }}>Loading transactions...</div>
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
          background: var(--app-bg, ${theme.background});
          color: var(--app-text, ${theme.text});
          font-family: var(--app-font-body, "Manrope", sans-serif);
        }
        * {
          box-sizing: border-box;
        }
        input:focus, select:focus {
          border-color: ${theme.primary} !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25) !important;
          outline: none;
        }
        .back-btn {
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background-color: ${theme.surfaceStrong} !important;
        }
        .section-card {
          background: ${theme.surface};
          border: 1px solid ${theme.border};
          box-shadow: ${theme.shadow};
          backdrop-filter: blur(16px);
        }
        @media (max-width: 639px) {
          .tx-row:hover {
            transform: none;
          }
        }
      `}</style>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: theme.background, 
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
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '14px' : '16px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isMobile ? '100%' : 'auto' }}>
              <button
                className="back-btn"
                onClick={onBack}
                style={{
                  background: theme.surfaceStrong, border: `1px solid ${theme.borderStrong}`, borderRadius: '12px', fontSize: '15px', cursor: 'pointer',
                  padding: '10px 16px', color: theme.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span>←</span> Back
              </button>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '6px' }}>Activity</div>
                <h1 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: '900', color: theme.text, margin: 0, letterSpacing: '-0.8px' }}>Transactions</h1>
              </div>
            </div>
            
            <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto', background: (budget?.bank_balance || 0) + runningBalance >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', padding: '12px 16px', borderRadius: '16px', border: `1px solid ${(budget?.bank_balance || 0) + runningBalance >= 0 ? 'rgba(16,185,129,0.24)' : 'rgba(239,68,68,0.24)'}` }}>
              <div style={{ fontSize: '11px', color: (budget?.bank_balance || 0) + runningBalance >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', opacity: 0.95 }}>Running Balance</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: (budget?.bank_balance || 0) + runningBalance >= 0 ? '#10b981' : '#ef4444', lineHeight: 1, letterSpacing: '-0.5px' }}>
                {formatCurrency((budget?.bank_balance || 0) + runningBalance, budget?.currency || 'TZS')}
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="section-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '6px' }}>Filters</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: theme.text, letterSpacing: '-0.4px' }}>Find the transaction you need fast</div>
            </div>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.2)',
                  fontSize: '15px', boxSizing: 'border-box', backgroundColor: theme.surfaceMuted, color: theme.text, fontWeight: '500'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.2)',
                  fontSize: '14px', backgroundColor: theme.surfaceMuted, color: theme.text, fontWeight: '600', cursor: 'pointer'
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
                  flex: 1, padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.2)',
                  fontSize: '14px', backgroundColor: theme.surfaceMuted, color: theme.text, fontWeight: '600', cursor: 'pointer'
                }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction List */}
          <div className="section-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center', color: theme.textSubtle }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.9 }}>📭</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: theme.text, marginBottom: '8px' }}>No transactions found</div>
                <div style={{ fontSize: '15px', lineHeight: 1.6 }}>Try changing your filters, search term, or add a new transaction.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', padding: '12px' }}>
                {filteredTransactions.slice(0, visibleCount).map((t, index) => {
                  const isExpense = t.amount > 0;
                  const isDeleting = deletingTransactionId === t.id;
                  return (
                    <div key={t.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'stretch' : 'center',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '16px' : '20px',
                      padding: '16px',
                      backgroundColor: theme.surfaceMuted,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '20px',
                      marginBottom: index < filteredTransactions.slice(0, visibleCount).length - 1 ? '10px' : '0',
                      boxShadow: theme.shadow,
                      opacity: isDeleting ? 0.72 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, width: '100%', minWidth: 0 }}>
                        <div style={{
                          width: '52px', height: '52px', borderRadius: '16px',
                          backgroundColor: !isExpense ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                          border: `1px solid ${!isExpense ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`
                        }}>
                          {!isExpense ? '💰' : '💸'}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: theme.text, overflowWrap: 'anywhere' }}>{t.category}</div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: !isExpense ? '#16a34a' : '#dc2626', backgroundColor: !isExpense ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', borderRadius: '999px', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{!isExpense ? 'Income' : 'Expense'}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: theme.textSubtle, fontWeight: '500', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {t.note && <span style={{ color: theme.textMuted }}> • {t.note}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: isMobile ? '100%' : 'auto' }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '900',
                          color: !isExpense ? '#16a34a' : '#dc2626',
                          textAlign: isMobile ? 'left' : 'right'
                        }}>
                          {!isExpense ? '+' : '-'}{formatCurrency(Math.abs(t.amount), budget?.currency || 'TZS')}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                          <button
                            onClick={() => handleEdit(t.id)}
                            disabled={Boolean(deletingTransactionId)}
                            style={{
                              backgroundColor: 'rgba(37,99,235,0.08)',
                              color: deletingTransactionId ? theme.textSubtle : '#2563eb',
                              border: '1px solid rgba(37,99,235,0.14)',
                              borderRadius: '12px',
                              padding: '10px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: deletingTransactionId ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              flex: isMobile ? 1 : '0 0 auto',
                              opacity: deletingTransactionId ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.08)'; e.currentTarget.style.color = '#2563eb'; }}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => setShowDeleteConfirm(t.id)}
                            disabled={Boolean(deletingTransactionId)}
                            style={{
                              backgroundColor: 'rgba(239,68,68,0.08)',
                              color: deletingTransactionId ? theme.textSubtle : '#ef4444',
                              border: '1px solid rgba(239,68,68,0.14)',
                              borderRadius: '12px',
                              padding: '10px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: deletingTransactionId ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              flex: isMobile ? 1 : '0 0 auto',
                              opacity: deletingTransactionId ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
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
                      padding: '18px',
                      backgroundColor: 'rgba(37,99,235,0.06)',
                      border: '1px solid rgba(37,99,235,0.12)',
                      borderRadius: '18px',
                      color: '#2563eb',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginTop: '12px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.06)')}
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
                backgroundColor: theme.surfaceStrong,
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: theme.shadow,
                border: 'none',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: theme.text, margin: '0 0 12px 0' }}>
                  Delete Transaction
                </h3>
                <p style={{ fontSize: '15px', color: theme.textSubtle, marginBottom: '32px', lineHeight: 1.5 }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      backgroundColor: theme.surfaceMuted,
                      border: 'none',
                      borderRadius: '12px',
                      color: theme.text,
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
                    disabled={Boolean(deletingTransactionId)}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      backgroundColor: '#ef4444',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: deletingTransactionId ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                      transition: 'all 0.2s',
                      opacity: deletingTransactionId ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                  >
                    {deletingTransactionId ? 'Deleting...' : 'Delete'}
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
