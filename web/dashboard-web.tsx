import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import SettingsWeb from './settings-web';
import AddTransactionWeb from './add-transaction-web';
import TransactionsWeb from './transactions-web';
import AnalyticsWeb from './analytics-web';

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

// Calculate days until end of month
const getDaysUntilEndOfMonth = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysUntilEnd = lastDayOfMonth.getDate() - now.getDate();
  return daysUntilEnd;
};

// Get current date info
const getDateInfo = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return now.toLocaleDateString('en-US', options);
};

export default function DashboardWeb() {
  const { user } = useAuthStore();
  const { budget, stats, transactions, loading, fetchBudget, fetchTransactions } = useBudgetStore();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'add-transaction' | 'transactions' | 'analytics'>('dashboard');

  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchBudget(user.id),
        fetchTransactions(user.id),
      ]).finally(() => setDataReady(true));
      // Safety: force ready after 5 seconds
      const timer = setTimeout(() => setDataReady(true), 5000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!dataReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>💰</div>
          <div style={{ fontSize: '16px', color: '#2c3e50' }}>Loading your budget...</div>
        </div>
      </div>
    );
  }

  // Route to sub-views first (before budget/stats checks)
  if (currentView === 'settings') {
    return <SettingsWeb onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'add-transaction') {
    return <AddTransactionWeb onBack={() => {
      setCurrentView('dashboard');
      if (user) {
        fetchTransactions(user.id);
        fetchBudget(user.id);
      }
    }} />;
  }

  if (currentView === 'transactions') {
    return <TransactionsWeb onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'analytics') {
    return <AnalyticsWeb onBack={() => setCurrentView('dashboard')} />;
  }

  if (!budget) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '12px' }}>No Budget Set</h1>
          <p style={{ fontSize: '14px', color: '#7f8c8d', textAlign: 'center', marginBottom: '24px' }}>
            Let's set up your daily and monthly spending targets to get started.
          </p>
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              backgroundColor: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Set Up Budget
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#7f8c8d', marginBottom: '16px' }}>Calculating your stats...</div>
          <button
            onClick={() => setCurrentView('settings')}
            style={{ backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  const getDailyMessage = () => {
    if (stats.isOverDailyBudget) {
      const overspend = stats.spentToday - budget.daily_target;
      return {
        text: `Over by ${overspend.toFixed(2)} ${budget.currency}`,
        color: '#e74c3c',
        bgColor: '#fadbd8',
      };
    }
    const remaining = stats.dailyRemaining;
    return {
      text: `Under by ${remaining.toFixed(2)} ${budget.currency}`,
      color: '#27ae60',
      bgColor: '#d5f4e6',
    };
  };

  const getMonthlyMessage = () => {
    if (stats.isOverMonthlyBudget) {
      const overspend = stats.spentMonthToDate - budget.monthly_target;
      return {
        text: `Over by ${overspend.toFixed(2)} ${budget.currency}`,
        color: '#e74c3c',
        bgColor: '#fadbd8',
      };
    }
    const remaining = stats.monthlyRemaining;
    return {
      text: `Under by ${remaining.toFixed(2)} ${budget.currency}`,
      color: '#27ae60',
      bgColor: '#d5f4e6',
    };
  };

  // Calculate running balance from transactions + bank balance
  const runningBalance = useMemo(() => {
    let balance = budget?.bank_balance || 0;
    transactions.forEach(t => {
      balance -= t.amount;
    });
    return balance;
  }, [budget?.bank_balance, transactions]);

  const dailyMsg = getDailyMessage();
  const monthlyMsg = getMonthlyMessage();

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
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            gap: '12px'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', margin: 0, flex: 1 }}>
              Budget It
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentView('add-transaction')}
                style={{
                  backgroundColor: '#3498db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                + Add Transaction
              </button>
              <button
                onClick={() => setCurrentView('transactions')}
                style={{
                  backgroundColor: '#9b59b6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                📊 View History
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                style={{
                  backgroundColor: '#e67e22',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                📈 Analytics
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                style={{
                  backgroundColor: '#7f8c8d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        
        {/* Calendar & Date Info Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>📅 Date & Time</h2>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
            {getDateInfo()}
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '12px' }}>
            {getDaysUntilEndOfMonth()} days until end of month
          </div>
          <div style={{ backgroundColor: '#e8f4fd', borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#3498db' }}>
              Track your spending daily!
            </div>
          </div>
        </div>

        {/* Bank Account Balance Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>💰 Bank Account Balance</h2>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: runningBalance >= 0 ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
            {formatCurrency(Math.abs(runningBalance), budget?.currency || 'TZS')}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            {runningBalance >= 0 ? 'Positive balance' : 'Negative balance'}
          </div>
          {transactions.length === 0 && (
            <div style={{ backgroundColor: '#fff3cd', borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#856404' }}>
                Add transactions to see your balance
              </div>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Today's Spending</h2>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
            {formatCurrency(stats.spentToday, budget.currency)}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            Target: {formatCurrency(budget.daily_target, budget.currency)}
          </div>
          <div style={{ backgroundColor: dailyMsg.bgColor, borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: dailyMsg.color }}>
              {dailyMsg.text}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Month to Date</h2>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
            {formatCurrency(stats.spentMonthToDate, budget.currency)}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            Target: {formatCurrency(budget.monthly_target, budget.currency)}
          </div>
          <div style={{ backgroundColor: monthlyMsg.bgColor, borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: monthlyMsg.color }}>
              {monthlyMsg.text}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Projected End of Month</h2>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
            {formatCurrency(stats.projectedMonthEnd, budget.currency)}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            Target: {formatCurrency(budget.monthly_target, budget.currency)}
          </div>
          {stats.projectedMonthEnd > budget.monthly_target ? (
            <div style={{ backgroundColor: '#fadbd8', borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#e74c3c' }}>
                Projected over budget
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#d5f4e6', borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#27ae60' }}>
                On track
              </div>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Streak</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3498db', textAlign: 'center', marginBottom: '4px' }}>
            {stats.streak}
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d', textAlign: 'center', marginBottom: '8px' }}>
            {stats.streak === 1 ? 'day' : 'days'} under budget
          </div>
          {stats.streak >= 7 && (
            <div style={{ fontSize: '14px', color: '#f39c12', textAlign: 'center', fontWeight: '600' }}>
              🔥 Great job keeping it up!
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
