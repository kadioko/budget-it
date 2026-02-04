import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

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

export default function AnalyticsWeb({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { transactions, budget, loading, fetchTransactions } = useBudgetStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'all'>('month');

  // Fetch transactions on mount
  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  }, [user]);

  // Calculate analytics data
  const calculateAnalytics = () => {
    if (!transactions.length) return null;

    const now = new Date();
    let startDate = new Date();
    
    if (selectedPeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (selectedPeriod === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate = new Date(0); // All time
    }

    const filteredTransactions = transactions.filter(t => 
      new Date(t.date) >= startDate
    );

    // Calculate category breakdown
    const categoryBreakdown: { [key: string]: { total: number; count: number; type: 'income' | 'expense' } } = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach(t => {
      const isIncome = t.amount < 0;
      const amount = Math.abs(t.amount);
      
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { total: 0, count: 0, type: isIncome ? 'income' : 'expense' };
      }
      
      categoryBreakdown[t.category].total += amount;
      categoryBreakdown[t.category].count += 1;
      
      if (isIncome) {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    });

    // Calculate daily averages
    const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgDailyIncome = totalIncome / daysDiff;
    const avgDailyExpenses = totalExpenses / daysDiff;

    // Calculate monthly projection
    const monthlyIncomeProjection = avgDailyIncome * 30;
    const monthlyExpensesProjection = avgDailyExpenses * 30;

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      avgDailyIncome,
      avgDailyExpenses,
      monthlyIncomeProjection,
      monthlyExpensesProjection,
      categoryBreakdown,
      transactionCount: filteredTransactions.length,
      daysDiff
    };
  };

  const analytics = calculateAnalytics();

  // Simple bar chart component
  const SimpleBarChart = ({ data, title, color }: { data: { label: string; value: number }[]; title: string; color: string }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '120px', 
                fontSize: '14px', 
                color: '#7f8c8d',
                textAlign: 'right'
              }}>
                {item.label}
              </div>
              <div style={{ flex: 1, backgroundColor: '#ecf0f1', borderRadius: '4px', height: '24px' }}>
                <div style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ 
                width: '80px', 
                fontSize: '14px', 
                fontWeight: '600',
                color: '#2c3e50',
                textAlign: 'right'
              }}>
                {formatCurrency(item.value, budget?.currency || 'TZS')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
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
              <div style={{ fontSize: '18px', color: '#7f8c8d' }}>Loading analytics...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!analytics) {
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
              <div style={{ fontSize: '18px', color: '#7f8c8d' }}>No data available for analytics</div>
              <div style={{ fontSize: '14px', color: '#95a5a6', marginTop: '8px' }}>
                Add some transactions to see your spending analytics!
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Prepare chart data
  const categoryData = Object.entries(analytics.categoryBreakdown)
    .filter(([_, data]) => data.type === 'expense')
    .map(([category, data]) => ({ label: category, value: data.total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 categories

  const incomeData = Object.entries(analytics.categoryBreakdown)
    .filter(([_, data]) => data.type === 'income')
    .map(([category, data]) => ({ label: category, value: data.total }))
    .sort((a, b) => b.value - a.value);

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
              📊 Analytics
            </h1>
          </div>

          {/* Period Selector */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['week', 'month', 'all'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: selectedPeriod === period ? '#3498db' : '#fff',
                    color: selectedPeriod === period ? '#fff' : '#3498db',
                    border: '2px solid #3498db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {period === 'week' ? 'Last Week' : period === 'month' ? 'Last Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Total Income</h3>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>
                {formatCurrency(analytics.totalIncome, budget?.currency || 'TZS')}
              </div>
            </div>
            
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Total Expenses</h3>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>
                {formatCurrency(analytics.totalExpenses, budget?.currency || 'TZS')}
              </div>
            </div>
            
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Net Income</h3>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: analytics.netIncome >= 0 ? '#27ae60' : '#e74c3c' }}>
                {formatCurrency(analytics.netIncome, budget?.currency || 'TZS')}
              </div>
            </div>
            
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Transactions</h3>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
                {analytics.transactionCount}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '20px' }}>Spending Analysis</h2>
            
            {categoryData.length > 0 && (
              <SimpleBarChart 
                data={categoryData} 
                title="Top Spending Categories" 
                color="#e74c3c" 
              />
            )}
            
            {incomeData.length > 0 && (
              <SimpleBarChart 
                data={incomeData} 
                title="Income Sources" 
                color="#27ae60" 
              />
            )}

            {/* Averages */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Daily Average</h4>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>
                  {formatCurrency(analytics.avgDailyExpenses, budget?.currency || 'TZS')}
                </div>
                <div style={{ fontSize: '12px', color: '#95a5a6' }}>Expenses</div>
              </div>
              
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Monthly Projection</h4>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>
                  {formatCurrency(analytics.monthlyExpensesProjection, budget?.currency || 'TZS')}
                </div>
                <div style={{ fontSize: '12px', color: '#95a5a6' }}>Expenses</div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '20px' }}>
            <button
              onClick={() => {
                // Simple CSV export
                const csvContent = [
                  ['Date', 'Category', 'Amount', 'Type', 'Note'],
                  ...transactions.map(t => [
                    t.date,
                    t.category,
                    Math.abs(t.amount).toString(),
                    t.amount < 0 ? 'Income' : 'Expense',
                    t.note || ''
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `budget-it-transactions-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#9b59b6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              📥 Export Transactions (CSV)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
