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
  }, [user]);

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
    fetchTransactions(user?.id || '');
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
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#7f8c8d' }}>Loading transactions...</div>
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
          {/* Header */}
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
              Transaction History
            </h1>
          </div>

          {/* Balance Card */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>💰 Running Balance</h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: runningBalance >= 0 ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
              {formatCurrency(Math.abs(runningBalance), budget?.currency || 'TZS')}
            </div>
            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              {runningBalance >= 0 ? 'Positive balance' : 'Negative balance'}
            </div>
          </div>

          {/* Filters */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Transactions List */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No transactions found</div>
                <div style={{ fontSize: '14px' }}>
                  {transactions.length === 0 ? 'Add your first transaction to get started!' : 'Try adjusting your filters'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTransactions.map((transaction) => {
                  const isIncome = transaction.amount < 0;
                  const displayAmount = Math.abs(transaction.amount);
                  
                  return (
                    <div key={transaction.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #ecf0f1',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            backgroundColor: isIncome ? '#d5f4e6' : '#fadbd8',
                            color: isIncome ? '#27ae60' : '#e74c3c',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {isIncome ? '💰' : '💸'} {transaction.category}
                          </span>
                          <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                            {new Date(transaction.date).toLocaleDateString()}
                          </span>
                        </div>
                        {transaction.note && (
                          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
                            {transaction.note}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: isIncome ? '#27ae60' : '#e74c3c'
                        }}>
                          {isIncome ? '+' : '-'}{formatCurrency(displayAmount, budget?.currency || 'TZS')}
                        </div>
                        
                        <button
                          onClick={() => handleEdit(transaction.id)}
                          style={{
                            backgroundColor: '#f39c12',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                          Edit
                        </button>
                        
                        <button
                          onClick={() => setShowDeleteConfirm(transaction.id)}
                          style={{
                            backgroundColor: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
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
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '16px' }}>
                  Delete Transaction
                </h3>
                <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '24px' }}>
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      backgroundColor: '#95a5a6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    style={{
                      backgroundColor: '#e74c3c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      cursor: 'pointer',
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
