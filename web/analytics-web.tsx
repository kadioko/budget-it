import React, { useState, useEffect, useMemo } from 'react';
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
import { Doughnut } from 'react-chartjs-2';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { themeTokens, useThemeStore } from '../src/store/theme';
import { getBudgetCycleWindow } from '../src/lib/budget-logic';

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

const toDateString = (date: Date) => date.toISOString().split('T')[0];

export default function AnalyticsWeb({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { transactions, budget, envelopes, loading, error, isOffline, fetchTransactions } = useBudgetStore();
  const { mode } = useThemeStore();
  const theme = themeTokens[mode];
  
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'all'>('month');
  const [selectedAccountId, setSelectedAccountId] = useState<'all' | 'bank' | string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);

  // Fetch transactions on mount
  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const accountOptions = useMemo(
    () => [
      { id: 'all', label: 'All accounts' },
      { id: 'bank', label: 'Bank account' },
      ...envelopes.map((envelope) => ({ id: envelope.id, label: `${envelope.icon} ${envelope.name}` })),
    ],
    [envelopes]
  );

  const categoryOptions = useMemo(
    () => ['all', ...Array.from(new Set(transactions.map((transaction) => transaction.category))).sort((a, b) => a.localeCompare(b))],
    [transactions]
  );

  const analyticsRange = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);

    if (selectedPeriod === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (selectedPeriod === 'month') {
      const cycle = budget
        ? getBudgetCycleWindow(now, budget.month_start_day)
        : { monthStart: new Date(now.getFullYear(), now.getMonth(), 1), monthEnd: now };
      startDate = cycle.monthStart;
      endDate = cycle.monthEnd;
    } else {
      startDate = new Date(0);
    }

    return { startDate, endDate };
  }, [budget, selectedPeriod]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        const matchesPeriod = transactionDate >= analyticsRange.startDate && transactionDate <= analyticsRange.endDate;
        const matchesAccount = selectedAccountId === 'all'
          ? true
          : selectedAccountId === 'bank'
            ? !transaction.envelope_id
            : transaction.envelope_id === selectedAccountId;
        const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
        return matchesPeriod && matchesAccount && matchesCategory;
      }),
    [analyticsRange.endDate, analyticsRange.startDate, selectedAccountId, selectedCategory, transactions]
  );

  const analytics = useMemo(() => {
    if (!filteredTransactions.length) return null;

    const categoryBreakdown: { [key: string]: { total: number; count: number; type: 'income' | 'expense' } } = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach((transaction) => {
      const isIncome = transaction.amount < 0;
      const amount = Math.abs(transaction.amount);

      if (!categoryBreakdown[transaction.category]) {
        categoryBreakdown[transaction.category] = { total: 0, count: 0, type: isIncome ? 'income' : 'expense' };
      }

      categoryBreakdown[transaction.category].total += amount;
      categoryBreakdown[transaction.category].count += 1;

      if (isIncome) {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    });

    const daysDiff = Math.max(1, Math.ceil((analyticsRange.endDate.getTime() - analyticsRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const avgDailyIncome = totalIncome / daysDiff;
    const avgDailyExpenses = totalExpenses / daysDiff;

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      avgDailyIncome,
      avgDailyExpenses,
      monthlyIncomeProjection: avgDailyIncome * 30,
      monthlyExpensesProjection: avgDailyExpenses * 30,
      categoryBreakdown,
      transactionCount: filteredTransactions.length,
      daysDiff,
    };
  }, [analyticsRange.endDate, analyticsRange.startDate, filteredTransactions]);

  const monthComparison = useMemo(() => {
    const scopedTransactions = transactions.filter((transaction) => {
      const matchesAccount = selectedAccountId === 'all'
        ? true
        : selectedAccountId === 'bank'
          ? !transaction.envelope_id
          : transaction.envelope_id === selectedAccountId;
      const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
      return matchesAccount && matchesCategory;
    });
    if (!scopedTransactions.length) return [];

    const now = new Date();
    const currentCycle = budget
      ? getBudgetCycleWindow(now, budget.month_start_day)
      : { monthStart: new Date(now.getFullYear(), now.getMonth(), 1), monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    const previousCycle = budget
      ? getBudgetCycleWindow(new Date(currentCycle.monthStart.getTime() - 24 * 60 * 60 * 1000), budget.month_start_day)
      : { monthStart: new Date(now.getFullYear(), now.getMonth() - 1, 1), monthEnd: new Date(now.getFullYear(), now.getMonth(), 0) };
    const categoryTotals = new Map<string, { current: number; previous: number }>();

    scopedTransactions.forEach((transaction) => {
      if (transaction.amount <= 0) return;
      const existing = categoryTotals.get(transaction.category) || { current: 0, previous: 0 };
      if (transaction.date >= toDateString(currentCycle.monthStart) && transaction.date <= toDateString(currentCycle.monthEnd)) {
        existing.current += transaction.amount;
      } else if (transaction.date >= toDateString(previousCycle.monthStart) && transaction.date <= toDateString(previousCycle.monthEnd)) {
        existing.previous += transaction.amount;
      }
      categoryTotals.set(transaction.category, existing);
    });

    return Array.from(categoryTotals.entries())
      .map(([category, totals]) => {
        const delta = totals.current - totals.previous;
        const deltaPercent = totals.previous === 0
          ? (totals.current > 0 ? 100 : 0)
          : Math.round((delta / totals.previous) * 100);
        return {
          category,
          current: totals.current,
          previous: totals.previous,
          delta,
          deltaPercent,
        };
      })
      .filter((item) => item.current > 0 || item.previous > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [budget, selectedAccountId, selectedCategory, transactions]);

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
            <div style={{ textAlign: 'center', padding: '56px 32px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', boxShadow: theme.shadow }}>
              <div style={{ fontSize: '40px', marginBottom: '14px' }}>📈</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: theme.text, marginBottom: '8px' }}>Loading analytics</div>
              <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6 }}>
                We’re preparing your cycle trends, category breakdowns, and spending comparisons.
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error && transactions.length === 0) {
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
          * { box-sizing: border-box; }
        `}</style>
        <div style={{ minHeight: '100vh', backgroundColor: theme.background, padding: '20px', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', margin: '0', left: '0', right: '0' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '56px 28px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', boxShadow: theme.shadow }}>
              <div style={{ fontSize: '44px', marginBottom: '14px' }}>⚠️</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: theme.text, marginBottom: '8px' }}>Analytics could not load</div>
              <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.7, marginBottom: '18px' }}>{error}</div>
              <button onClick={onBack} style={{ padding: '12px 18px', borderRadius: '14px', border: 'none', background: theme.primary, color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                Back to dashboard
              </button>
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
            <div style={{ textAlign: 'center', padding: '56px 32px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '24px', boxShadow: theme.shadow }}>
              <div style={{ fontSize: '44px', marginBottom: '14px' }}>{isOffline ? '📡' : '🧾'}</div>
              <div style={{ fontSize: '22px', color: theme.text, fontWeight: '800', marginBottom: '8px' }}>
                {isOffline ? 'Analytics are limited offline' : 'No analytics yet'}
              </div>
              <div style={{ fontSize: '14px', color: theme.textSubtle, marginTop: '8px', lineHeight: 1.7, marginBottom: '18px' }}>
                {isOffline
                  ? 'Reconnect to refresh your latest data, or keep logging transactions and review the charts once you are back online.'
                    : 'Add a few transactions first, or broaden your filters, then come back here to see trends, category breakdowns, and cycle comparisons.'}
              </div>
              <button onClick={onBack} style={{ padding: '12px 18px', borderRadius: '14px', border: 'none', background: theme.primary, color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                Back to dashboard
              </button>
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
        html, body { font-family: var(--app-font-body, "Manrope", sans-serif); }
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
          {isOffline && (
            <div className="analytics-shell-card" style={{ borderRadius: '18px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: theme.text }}>
              <span style={{ fontSize: '18px' }}>📡</span>
              <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                You are offline. Analytics shown here may be based on the last synced data.
              </div>
            </div>
          )}
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
                    {period === 'week' ? 'Last 7 days' : period === 'month' ? 'Current cycle' : 'All time'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value as 'all' | 'bank' | string)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surfaceMuted,
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {accountOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.surfaceMuted,
                    color: theme.text,
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option === 'all' ? 'All categories' : option}</option>
                  ))}
                </select>
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
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  {categoryData.map((item, index) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '14px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '999px', backgroundColor: chartColors[index % chartColors.length], flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: theme.text, overflowWrap: 'anywhere' }}>{item.label}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted }}>{formatCurrency(item.value, budget?.currency || 'TZS')}</div>
                      </div>
                    </div>
                  ))}
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

            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Trends</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme.text, margin: '0 0 16px 0', letterSpacing: '-0.4px' }}>Current cycle vs previous cycle</h3>
              {monthComparison.length === 0 ? (
                <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}`, fontSize: '13px', color: theme.textMuted, lineHeight: 1.6 }}>
                  Add more history for this filter set to compare cycle-over-cycle spending patterns by category.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {monthComparison.slice(0, 6).map((item) => {
                    const maxValue = Math.max(item.current, item.previous, 1);
                    const trendColor = item.delta > 0 ? theme.danger : item.delta < 0 ? theme.success : theme.textMuted;
                    const trendLabel = item.delta > 0 ? 'Higher' : item.delta < 0 ? 'Lower' : 'Flat';
                    return (
                      <div key={item.category} style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: theme.surfaceMuted, border: `1px solid ${theme.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: theme.text }}>{item.category}</div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>
                              This month {formatCurrency(item.current, budget?.currency || 'TZS')} · Previous month {formatCurrency(item.previous, budget?.currency || 'TZS')}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: trendColor, backgroundColor: `${trendColor}12`, borderRadius: '999px', padding: '6px 10px' }}>
                            {item.delta > 0 ? '↑' : item.delta < 0 ? '↓' : '→'} {trendLabel} {Math.abs(item.deltaPercent)}%
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flex: 1, height: '42px' }}>
                            <div style={{ width: '50%', height: `${Math.max(14, (item.previous / maxValue) * 100)}%`, borderRadius: '10px 10px 4px 4px', backgroundColor: 'rgba(148,163,184,0.45)' }} />
                            <div style={{ width: '50%', height: `${Math.max(14, (item.current / maxValue) * 100)}%`, borderRadius: '10px 10px 4px 4px', backgroundColor: trendColor }} />
                          </div>
                          <div style={{ width: isMobile ? '100px' : '120px', fontSize: '12px', color: theme.textMuted, lineHeight: 1.5 }}>
                            Change: {item.delta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(item.delta), budget?.currency || 'TZS')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                  ...filteredTransactions.map(t => [
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
