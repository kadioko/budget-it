import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { themeTokens, useThemeStore } from '../src/store/theme';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

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
  const { mode } = useThemeStore();
  const theme = themeTokens[mode];
  
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'all'>('month');
  const [isMobile, setIsMobile] = useState(false);

  // Fetch transactions on mount
  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
        <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Breakdown</div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: theme.text, marginBottom: '16px', letterSpacing: '-0.4px' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
              <div style={{ 
                width: isMobile ? '100%' : '120px', 
                fontSize: '14px', 
                color: theme.textMuted,
                textAlign: isMobile ? 'left' : 'right'
              }}>
                {item.label}
              </div>
              <div style={{ flex: 1, backgroundColor: theme.surfaceMuted, borderRadius: '999px', height: '24px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ 
                width: isMobile ? '100%' : '80px', 
                fontSize: '14px', 
                fontWeight: '600',
                color: theme.text,
                textAlign: isMobile ? 'left' : 'right'
              }}>
                {formatCurrency(item.value, budget?.currency || 'TZS')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
            background: ${theme.background};
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
              <div style={{ fontSize: '18px', color: theme.textMuted }}>Loading analytics...</div>
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
            background: ${theme.background};
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
              <div style={{ fontSize: '18px', color: theme.textMuted }}>No data available for analytics</div>
              <div style={{ fontSize: '14px', color: theme.textSubtle, marginTop: '8px' }}>
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
    .sort((a, b) => b.value - a.value);

  const topCategories = categoryData.slice(0, 5);

  const incomeData = Object.entries(analytics.categoryBreakdown)
    .filter(([_, data]) => data.type === 'income')
    .map(([category, data]) => ({ label: category, value: data.total }))
    .sort((a, b) => b.value - a.value);

  const chartColors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];

  const doughnutData = {
    labels: categoryData.map(d => d.label),
    datasets: [
      {
        data: categoryData.map(d => d.value),
        backgroundColor: chartColors.slice(0, categoryData.length),
        borderWidth: 0,
      },
    ],
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }
        .analytics-shell-card {
          background: ${theme.surface};
          border: 1px solid ${theme.border};
          box-shadow: ${theme.shadow};
          backdrop-filter: blur(16px);
        }
        @media (max-width: 639px) {
          .analytics-period-btn {
            width: 100%;
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
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            flexDirection: isMobile ? 'column' : 'row',
            marginBottom: '24px',
            gap: '16px'
          }}>
            <button
              onClick={onBack}
              style={{
                backgroundColor: theme.surfaceStrong,
                color: theme.primary,
                border: `1px solid ${theme.borderStrong}`,
                borderRadius: '12px',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '10px 14px',
                fontWeight: '700'
              }}
            >
              ← Back
            </button>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '6px' }}>Insights</div>
              <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '900', color: theme.text, margin: 0, letterSpacing: '-0.8px' }}>Analytics</h1>
            </div>
          </div>

          {/* Period Selector */}
          <div className="analytics-shell-card" style={{ borderRadius: '24px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Range</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text, letterSpacing: '-0.4px' }}>Choose the reporting window</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              {(['week', 'month', 'all'] as const).map(period => (
                <button
                  className="analytics-period-btn"
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: selectedPeriod === period ? theme.primary : theme.surfaceMuted,
                    color: selectedPeriod === period ? '#fff' : theme.primary,
                    border: `1px solid ${theme.borderStrong}`,
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: '700',
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="analytics-shell-card" style={{ borderRadius: '22px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Total Income</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: theme.success, letterSpacing: '-0.5px' }}>
                {formatCurrency(analytics.totalIncome, budget?.currency || 'TZS')}
              </div>
            </div>
            
            <div className="analytics-shell-card" style={{ borderRadius: '22px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Total Expenses</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: theme.danger, letterSpacing: '-0.5px' }}>
                {formatCurrency(analytics.totalExpenses, budget?.currency || 'TZS')}
              </div>
            </div>
            
            <div className="analytics-shell-card" style={{ borderRadius: '22px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Net Income</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: analytics.netIncome >= 0 ? theme.success : theme.danger, letterSpacing: '-0.5px' }}>
                {formatCurrency(analytics.netIncome, budget?.currency || 'TZS')}
              </div>
            </div>
            
            <div className="analytics-shell-card" style={{ borderRadius: '22px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Transactions</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: theme.text, letterSpacing: '-0.5px' }}>
                {analytics.transactionCount}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="analytics-shell-card" style={{ borderRadius: '24px', padding: '22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Charts</div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: theme.text, marginBottom: '20px', letterSpacing: '-0.6px' }}>Spending Analysis</h2>
            
            {categoryData.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ width: isMobile ? '100%' : '250px', maxWidth: '250px', height: isMobile ? '220px' : '250px', marginBottom: '20px', padding: '14px', borderRadius: '20px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                  <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
                <div style={{ width: '100%' }}>
                  <SimpleBarChart 
                    data={topCategories} 
                    title="Top Spending Categories" 
                    color="#e74c3c" 
                  />
                </div>
              </div>
            )}
            
            {incomeData.length > 0 && (
              <SimpleBarChart 
                data={incomeData} 
                title="Income Sources" 
                color="#27ae60" 
              />
            )}

            {/* Averages */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
              <div style={{ backgroundColor: theme.surfaceMuted, borderRadius: '20px', padding: '18px', border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSubtle, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Daily Average</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text, letterSpacing: '-0.4px' }}>
                  {formatCurrency(analytics.avgDailyExpenses, budget?.currency || 'TZS')}
                </div>
                <div style={{ fontSize: '12px', color: theme.textSubtle, marginTop: '4px' }}>Expenses</div>
              </div>
              
              <div style={{ backgroundColor: theme.surfaceMuted, borderRadius: '20px', padding: '18px', border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: theme.textSubtle, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Monthly Projection</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: theme.text, letterSpacing: '-0.4px' }}>
                  {formatCurrency(analytics.monthlyExpensesProjection, budget?.currency || 'TZS')}
                </div>
                <div style={{ fontSize: '12px', color: theme.textSubtle, marginTop: '4px' }}>Expenses</div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="analytics-shell-card" style={{ borderRadius: '24px', padding: '20px', marginTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Export</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: theme.text, marginBottom: '14px', letterSpacing: '-0.4px' }}>Download your transactions</div>
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
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                boxShadow: '0 14px 30px rgba(124,58,237,0.22)',
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
