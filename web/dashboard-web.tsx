import React, { useState, useEffect, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import SettingsWeb from './settings-web';
import AddTransactionWeb from './add-transaction-web';
import TransactionsWeb from './transactions-web';
import AnalyticsWeb from './analytics-web';

const formatCurrency = (amount: number, currency: string) => {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  if (currency === 'TZS') {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TZS';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
};

const getDaysUntilEndOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
};

const getDateInfo = () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// Progress bar component
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;
  return (
    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        backgroundColor: isOver ? 'var(--danger)' : color,
        borderRadius: '4px',
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

// Stat card component
function StatCard({ title, value, subtitle, color, progress, progressMax, progressColor, icon }: {
  title: string; value: string; subtitle: string; color: string;
  progress?: number; progressMax?: number; progressColor?: string; icon: string;
}) {
  return (
    <div style={{
      backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px',
      boxShadow: 'var(--shadow-md)', borderLeft: `5px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
        <div style={{ fontSize: '22px' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{subtitle}</div>
      {progress !== undefined && progressMax !== undefined && (
        <ProgressBar value={progress} max={progressMax} color={progressColor || color} />
      )}
    </div>
  );
}

// Toast notification
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: type === 'success' ? 'var(--success)' : 'var(--danger)',
      color: '#fff', padding: '12px 24px', borderRadius: '12px',
      boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: '600',
      zIndex: 9999, whiteSpace: 'nowrap', maxWidth: '90vw',
      animation: 'slideUp 0.3s ease',
    }}>
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  );
}

export default function DashboardWeb() {
  const { user } = useAuthStore();
  const { budget, stats, transactions, isOffline, pendingActions, setOfflineStatus, syncOfflineActions, fetchBudget, fetchTransactions, processRecurringTransactions } = useBudgetStore();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'add-transaction' | 'transactions' | 'analytics'>('dashboard');
  const [dataReady, setDataReady] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Network listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setOfflineStatus(offline);
      
      // If we just came back online and have pending actions, sync them
      if (!offline && pendingActions.length > 0) {
        showToast('Back online! Syncing data...', 'success');
        syncOfflineActions().then(() => {
          showToast('Sync complete!', 'success');
        });
      }
    });

    return () => unsubscribe();
  }, [pendingActions.length]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchBudget(user.id), 
        fetchTransactions(user.id),
        processRecurringTransactions(user.id)
      ]).finally(() => setDataReady(true));
      const timer = setTimeout(() => setDataReady(true), 5000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const runningBalance = useMemo(() => {
    let balance = budget?.bank_balance || 0;
    transactions.forEach(t => { balance -= t.amount; });
    return balance;
  }, [budget?.bank_balance, transactions]);

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]
  );

  if (!dataReady) {
    return (
      <>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #3498db 100%)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>💰</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Loading your budget...</div>
        </div>
      </>
    );
  }

  if (currentView === 'settings') return <SettingsWeb onBack={() => setCurrentView('dashboard')} />;
  if (currentView === 'add-transaction') {
    return <AddTransactionWeb onBack={() => {
      setCurrentView('dashboard');
      if (user) { fetchTransactions(user.id); fetchBudget(user.id); }
    }} />;
  }
  if (currentView === 'transactions') return <TransactionsWeb onBack={() => setCurrentView('dashboard')} />;
  if (currentView === 'analytics') return <AnalyticsWeb onBack={() => setCurrentView('dashboard')} />;

  if (!budget) {
    return (
      <>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #3498db 100%)', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-xl)', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎯</div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>Welcome to Budget It!</h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>Set up your daily and monthly spending targets to start tracking your finances.</p>
            <button onClick={() => setCurrentView('settings')} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3498db, #2980b9)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(52,152,219,0.4)' }}>
              Set Up My Budget →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!stats) return null;

  const cur = budget.currency;
  const dailyPct = budget.daily_target > 0 ? Math.min(Math.round((stats.spentToday / budget.daily_target) * 100), 100) : 0;
  const monthlyPct = budget.monthly_target > 0 ? Math.min(Math.round((stats.spentMonthToDate / budget.monthly_target) * 100), 100) : 0;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg-main, #f0f2f5); }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .nav-btn:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important; }
        .nav-btn { transition: all 0.15s ease !important; }
        .nav-btn-add { background: linear-gradient(135deg, #27ae60, #1e8449) !important; box-shadow: 0 2px 8px rgba(39,174,96,0.4) !important; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sticky top nav */}
      <div style={{ background: '#1e2d3d', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '12px 16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '22px' }}>💰</span>
            <span style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>Budget It</span>
          </div>
          {isOffline && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f39c12', backgroundColor: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.3)', borderRadius: '6px', padding: '3px 8px' }}>⚡ Offline</div>
          )}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flex: '1 1 auto' }}>
            {([
              { label: '+ Add', view: 'add-transaction', bg: 'linear-gradient(135deg, #27ae60, #1e8449)', shadow: 'rgba(39,174,96,0.4)' },
              { label: '📋 History', view: 'transactions', bg: 'linear-gradient(135deg, #8e44ad, #6c3483)', shadow: 'rgba(142,68,173,0.4)' },
              { label: '📈 Analytics', view: 'analytics', bg: 'linear-gradient(135deg, #e67e22, #ca6f1e)', shadow: 'rgba(230,126,34,0.4)' },
              { label: '⚙️ Settings', view: 'settings', bg: 'linear-gradient(135deg, #5d6d7e, #4d5d6e)', shadow: 'rgba(93,109,126,0.4)' },
            ] as const).map(({ label, view, bg, shadow }) => (
              <button key={view} className="nav-btn" onClick={() => setCurrentView(view)}
                style={{ background: bg, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 2px 8px ${shadow}` }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px 60px', animation: 'fadeIn 0.3s ease' }}>

        {/* Date + user info */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{getDateInfo()}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            {getDaysUntilEndOfMonth()} days left in month · <span style={{ color: 'var(--text-tertiary)' }}>{user?.email}</span>
          </div>
        </div>

        {/* Hero balance card */}
        <div style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #2980b9 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '16px', boxShadow: '0 8px 32px rgba(30,45,61,0.35)', color: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Account Balance</div>
          <div style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '4px', color: runningBalance >= 0 ? '#fff' : '#ff7675' }}>
            {runningBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(runningBalance), cur)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.65 }}>
            {transactions.length === 0
              ? 'No transactions yet — add one to get started'
              : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} recorded`}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <StatCard
            title="Today's Spending" icon={stats.isOverDailyBudget ? '⚠️' : '☀️'}
            value={formatCurrency(stats.spentToday, cur)}
            subtitle={`${dailyPct}% of ${formatCurrency(budget.daily_target, cur)} target`}
            color={stats.isOverDailyBudget ? '#e74c3c' : '#3498db'}
            progress={stats.spentToday} progressMax={budget.daily_target}
            progressColor={stats.isOverDailyBudget ? '#e74c3c' : '#3498db'}
          />
          <StatCard
            title="Month to Date" icon={stats.isOverMonthlyBudget ? '🔴' : '📅'}
            value={formatCurrency(stats.spentMonthToDate, cur)}
            subtitle={`${monthlyPct}% of ${formatCurrency(budget.monthly_target, cur)} target`}
            color={stats.isOverMonthlyBudget ? '#e74c3c' : '#27ae60'}
            progress={stats.spentMonthToDate} progressMax={budget.monthly_target}
            progressColor={stats.isOverMonthlyBudget ? '#e74c3c' : '#27ae60'}
          />
          <StatCard
            title="Projected Month End" icon="🔮"
            value={formatCurrency(stats.projectedMonthEnd, cur)}
            subtitle={stats.projectedMonthEnd > budget.monthly_target ? '⚠️ Over budget projected' : '✅ On track'}
            color={stats.projectedMonthEnd > budget.monthly_target ? '#e74c3c' : '#f39c12'}
          />
          <StatCard
            title="Streak" icon={stats.streak >= 7 ? '🔥' : '⚡'}
            value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`}
            subtitle={stats.streak >= 7 ? 'Amazing streak! Keep it up!' : stats.streak > 0 ? 'Keep going!' : 'Start your streak today'}
            color="#9b59b6"
          />
        </div>

        {/* Budget status pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: stats.isOverDailyBudget ? '#ef4444' : '#10b981', borderRadius: '14px', padding: '16px 18px', boxShadow: stats.isOverDailyBudget ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Daily Budget</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', lineHeight: 1.2 }}>
              {stats.isOverDailyBudget
                ? `−${formatCurrency(stats.spentToday - budget.daily_target, cur)}`
                : `+${formatCurrency(stats.dailyRemaining, cur)}`}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)', marginTop: '4px', fontWeight: '600' }}>
              {stats.isOverDailyBudget ? '⚠️ over limit' : '✅ remaining today'}
            </div>
          </div>
          <div style={{ backgroundColor: stats.isOverMonthlyBudget ? '#ef4444' : '#10b981', borderRadius: '14px', padding: '16px 18px', boxShadow: stats.isOverMonthlyBudget ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Monthly Budget</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', lineHeight: 1.2 }}>
              {stats.isOverMonthlyBudget
                ? `−${formatCurrency(stats.spentMonthToDate - budget.monthly_target, cur)}`
                : `+${formatCurrency(stats.monthlyRemaining, cur)}`}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)', marginTop: '4px', fontWeight: '600' }}>
              {stats.isOverMonthlyBudget ? '⚠️ over limit' : '✅ remaining this month'}
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>Recent Transactions</h2>
            <button onClick={() => setCurrentView('transactions')}
              style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              View all →
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontSize: '14px' }}>No transactions yet</div>
              <button onClick={() => setCurrentView('add-transaction')}
                style={{ marginTop: '12px', padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Add your first transaction
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTransactions.map(t => {
                const isIncome = t.amount < 0;
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#334155', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isIncome ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                        {isIncome ? '💰' : '💸'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{t.category}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{t.note ? ` · ${t.note}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: isIncome ? '#2ecc71' : '#ff7675' }}>
                      {isIncome ? '+' : '−'}{formatCurrency(Math.abs(t.amount), cur)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
