import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'];

// Format currency with commas
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function SettingsWeb({ onBack }: { onBack: () => void }) {
  const { user, signOut } = useAuthStore();
  const { budget, loading, createBudget, updateBudget } = useBudgetStore();

  const [dailyTarget, setDailyTarget] = useState(
    budget?.daily_target.toString() || ''
  );
  const [monthlyTarget, setMonthlyTarget] = useState(
    budget?.monthly_target.toString() || ''
  );
  const [currency, setCurrency] = useState(budget?.currency || 'USD');
  const [monthStartDay, setMonthStartDay] = useState(
    budget?.month_start_day.toString() || '1'
  );

  useEffect(() => {
    if (budget) {
      setDailyTarget(budget.daily_target.toString());
      setMonthlyTarget(budget.monthly_target.toString());
      setCurrency(budget.currency);
      setMonthStartDay(budget.month_start_day.toString());
    }
  }, [budget]);

  const handleSaveBudget = async () => {
    if (!dailyTarget || !monthlyTarget) {
      alert('Please fill in all fields');
      return;
    }

    const daily = parseFloat(dailyTarget);
    const monthly = parseFloat(monthlyTarget);
    const startDay = parseInt(monthStartDay);

    if (isNaN(daily) || isNaN(monthly) || isNaN(startDay)) {
      alert('Please enter valid numbers');
      return;
    }

    if (daily <= 0 || monthly <= 0) {
      alert('Targets must be greater than 0');
      return;
    }

    if (startDay < 1 || startDay > 28) {
      alert('Month start day must be between 1 and 28');
      return;
    }

    try {
      if (budget) {
        await updateBudget(budget.id, daily, monthly, currency, startDay);
      } else {
        await createBudget(user.id, daily, monthly, currency, startDay);
      }
      alert('Budget saved successfully!');
      onBack();
    } catch (error: any) {
      alert('Failed to save budget: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        window.location.reload();
      } catch (error: any) {
        alert('Failed to sign out: ' + error.message);
      }
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
          gap: '12px'
        }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ←
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>
            Settings
          </h1>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px' }}>
            Budget Settings
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
              Daily Spending Target
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#7f8c8d', fontWeight: '600' }}>{currency}</span>
              <input
                type="number"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
                placeholder="0.00"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff'
                }}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
              Monthly Spending Target
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#7f8c8d', fontWeight: '600' }}>{currency}</span>
              <input
                type="number"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                placeholder="0.00"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#fff'
                }}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
              Currency
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {CURRENCIES.map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  disabled={loading}
                  style={{
                    padding: '8px',
                    border: currency === curr ? '2px solid #3498db' : '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: currency === curr ? '#e3f2fd' : '#fff',
                    color: currency === curr ? '#3498db' : '#2c3e50',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = currency === curr ? '#bbdefb' : '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = currency === curr ? '#e3f2fd' : '#fff';
                  }}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
              Month Start Day
            </label>
            <input
              type="number"
              value={monthStartDay}
              onChange={(e) => setMonthStartDay(e.target.value)}
              placeholder="1"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#fff'
              }}
              min="1"
              max="28"
            />
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              (1 = 1st of month, 15 = 15th of month, etc.)
            </div>
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#95a5a6' : '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.opacity = '1';
            }}
          >
            {loading ? 'Saving...' : budget ? 'Update Budget' : 'Create Budget'}
          </button>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>
            Account
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '4px' }}>
              Email
            </div>
            <div style={{ fontSize: '16px', color: '#2c3e50', fontWeight: '600' }}>
              {user?.email}
            </div>
          </div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '8px',
              backgroundColor: '#fff',
            }}
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
          <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '24px' }}>
            Example: {formatCurrency(50000, currency)}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
