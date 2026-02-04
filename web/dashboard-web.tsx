import React, { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';

export default function DashboardWeb() {
  const { user } = useAuthStore();
  const { budget, stats, loading, fetchBudget, fetchTransactions } = useBudgetStore();

  useEffect(() => {
    if (user) {
      fetchBudget(user.id);
      fetchTransactions(user.id);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
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
            onClick={() => alert('Budget Setup: Please go to Settings to set up your budget targets.')}
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
        <div>Loading stats...</div>
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

  const dailyMsg = getDailyMessage();
  const monthlyMsg = getMonthlyMessage();

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '8px' }}>Today's Spending</h2>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
            {stats.spentToday.toFixed(2)} {budget.currency}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            Target: {budget.daily_target.toFixed(2)} {budget.currency}
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
            {stats.spentMonthToDate.toFixed(2)} {budget.currency}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            Target: {budget.monthly_target.toFixed(2)} {budget.currency}
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
            {stats.projectedMonthEnd.toFixed(2)} {budget.currency}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '12px' }}>
            Budget: {budget.monthly_target.toFixed(2)} {budget.currency}
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
  );
}
