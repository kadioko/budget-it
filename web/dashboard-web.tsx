import React, { useState, useEffect, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { themeTokens, useThemeStore } from '../src/store/theme';
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
      background: 'linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.96) 100%)', borderRadius: '22px', padding: '22px',
      boxShadow: '0 20px 40px rgba(15,23,42,0.18)', border: '1px solid rgba(148,163,184,0.16)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{title}</div>
          <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: color, boxShadow: `0 0 18px ${color}` }} />
        </div>
        <div style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.8px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.56)', marginTop: '8px', lineHeight: 1.5 }}>{subtitle}</div>
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
  const { budget, envelopes, stats, transactions, isOffline, pendingActions, setOfflineStatus, syncOfflineActions, fetchBudget, fetchEnvelopes, fetchTransactions, processRecurringTransactions } = useBudgetStore();
  const { mode } = useThemeStore();
  const theme = themeTokens[mode];
  const isLightMode = mode === 'light';
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'add-transaction' | 'transactions' | 'analytics'>('dashboard');
  const [dataReady, setDataReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<'all' | 'bank' | string>('all');

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
        fetchEnvelopes(user.id),
        fetchTransactions(user.id),
        processRecurringTransactions(user.id)
      ]).finally(() => setDataReady(true));
      const timer = setTimeout(() => setDataReady(true), 5000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => setIsMobile(window.innerWidth < 640);
    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const accountOptions = useMemo(() => {
    const baseOptions = [{ id: 'bank', label: 'Bank account', icon: '🏦', balance: budget?.bank_balance || 0, currency: budget?.currency || 'USD' }];
    const envelopeOptions = envelopes.map((env) => ({ id: env.id, label: env.name, icon: env.icon, balance: env.balance, currency: env.currency }));
    const totalBalance = baseOptions.reduce((sum, item) => sum + item.balance, 0) + envelopeOptions.reduce((sum, item) => sum + item.balance, 0);

    return [
      { id: 'all', label: 'All accounts', icon: '🧾', balance: totalBalance, currency: budget?.currency || 'USD' },
      ...baseOptions,
      ...envelopeOptions,
    ];
  }, [budget?.bank_balance, budget?.currency, envelopes]);

  const selectedAccount = useMemo(
    () => accountOptions.find((option) => option.id === selectedAccountId) || accountOptions[0],
    [accountOptions, selectedAccountId]
  );

  useEffect(() => {
    if (!selectedAccount) {
      setSelectedAccountId('all');
      return;
    }

    if (selectedAccountId !== 'all' && !accountOptions.some((option) => option.id === selectedAccountId)) {
      setSelectedAccountId('all');
    }
  }, [accountOptions, selectedAccount, selectedAccountId]);

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
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: theme.background, padding: '20px' }}>
          <div style={{ backgroundColor: theme.surface, borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: theme.shadow, animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎯</div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: theme.text, marginBottom: '12px' }}>Welcome to Budget It!</h1>
            <p style={{ fontSize: '15px', color: theme.textSubtle, marginBottom: '32px', lineHeight: 1.6 }}>Set up your daily and monthly spending targets to start tracking your finances.</p>
            <button onClick={() => setCurrentView('settings')} style={{ width: '100%', padding: '16px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: `0 4px 12px ${theme.shadow}` }}>
              Set Up My Budget →
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
          @keyframes pulseCard { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
          .dashboard-loading-card { background: ${theme.surface}; border: 1px solid ${theme.border}; box-shadow: ${theme.shadow}; backdrop-filter: blur(16px); animation: pulseCard 1.4s ease-in-out infinite; }
        `}</style>
        <div style={{ minHeight: '100vh', background: theme.background }}>
          <div style={{ background: theme.navSurface, position: 'sticky', top: 0, zIndex: 100, boxShadow: theme.shadow, borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ maxWidth: '760px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>💰</span>
                <span style={{ fontSize: '17px', fontWeight: '800', color: theme.text }}>Budget It</span>
              </div>
              <div style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: 700 }}>Preparing dashboard...</div>
            </div>
          </div>
          <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 16px 60px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Overview</div>
              <div style={{ fontSize: '28px', color: theme.text, fontWeight: '900', lineHeight: 1.1, letterSpacing: '-1px' }}>Loading your budget at a glance</div>
              <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.6 }}>Your account is signed in. We’re finishing your dashboard data now.</div>
            </div>
            <div className="dashboard-loading-card" style={{ borderRadius: '28px', height: isMobile ? '220px' : '260px', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div className="dashboard-loading-card" style={{ borderRadius: '22px', height: '160px' }} />
              <div className="dashboard-loading-card" style={{ borderRadius: '22px', height: '160px' }} />
              <div className="dashboard-loading-card" style={{ borderRadius: '22px', height: '160px' }} />
            </div>
            <div className="dashboard-loading-card" style={{ borderRadius: '16px', height: '220px' }} />
          </div>
        </div>
      </>
    );
  }

  const cur = budget.currency;
  const dailyPct = budget.daily_target > 0 ? Math.min(Math.round((stats.spentToday / budget.daily_target) * 100), 100) : 0;
  const monthlyPct = budget.monthly_target > 0 ? Math.min(Math.round((stats.spentMonthToDate / budget.monthly_target) * 100), 100) : 0;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .nav-btn:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important; }
        .nav-btn { transition: all 0.15s ease !important; }
        .nav-btn-add { background: linear-gradient(135deg, #27ae60, #1e8449) !important; box-shadow: 0 2px 8px rgba(39,174,96,0.4) !important; }
        .section-card { background: ${theme.surface}; border: 1px solid ${theme.border}; box-shadow: ${theme.shadow}; backdrop-filter: blur(16px); }
        .dashboard-shell { max-width: 1180px; }
        .account-filter-btn { transition: all 0.2s ease; }
        .account-filter-btn:hover { transform: translateY(-1px); }
        @media (max-width: 639px) {
          .dashboard-shell {
            max-width: 760px;
          }
          .dashboard-nav-actions {
            width: 100%;
            justify-content: stretch !important;
          }
          .dashboard-nav-actions .nav-btn {
            flex: 1 1 calc(50% - 6px);
            text-align: center;
            min-height: 40px;
          }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sticky top nav */}
      <div style={{ background: theme.navSurface, position: 'sticky', top: 0, zIndex: 100, boxShadow: theme.shadow, borderBottom: `1px solid ${theme.border}` }}>
        <div className="dashboard-shell" style={{ margin: '0 auto', padding: '12px 24px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '22px' }}>💰</span>
            <span style={{ fontSize: '17px', fontWeight: '800', color: theme.text, letterSpacing: '-0.3px' }}>Budget It</span>
          </div>
          {isOffline && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f39c12', backgroundColor: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.3)', borderRadius: '6px', padding: '3px 8px' }}>⚡ Offline</div>
          )}
          <div className="dashboard-nav-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flex: '1 1 auto' }}>
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

      <div className="dashboard-shell" style={{ margin: '0 auto', padding: '28px 24px 72px', animation: 'fadeIn 0.3s ease' }}>

        {/* Date + user info */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: theme.textSubtle, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Overview</div>
          <div style={{ fontSize: isMobile ? '26px' : '38px', color: theme.text, fontWeight: '900', letterSpacing: '-1.2px' }}>Your budget at a glance</div>
          <div style={{ fontSize: '14px', color: theme.textMuted, marginTop: '8px', lineHeight: 1.6 }}>
            {getDateInfo()} · {getDaysUntilEndOfMonth()} days left in month · <span style={{ color: theme.text, fontWeight: 600 }}>{user?.email}</span>
          </div>
        </div>

        {/* Hero balance card */}
        <div style={{ background: theme.heroGradient, borderRadius: '28px', padding: isMobile ? '22px 18px' : '38px 36px', marginBottom: '24px', boxShadow: theme.shadow, color: isLightMode ? theme.text : '#fff', border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.35fr) minmax(320px, 0.95fr)', gap: '18px', alignItems: 'stretch', marginBottom: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: isMobile ? 'auto' : '240px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Account Balance</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {accountOptions.map((option) => {
                    const active = option.id === selectedAccount?.id;
                    return (
                      <button
                        key={option.id}
                        className="account-filter-btn"
                        onClick={() => setSelectedAccountId(option.id as 'all' | 'bank' | string)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '999px',
                          border: active ? `1px solid ${theme.borderStrong}` : `1px solid ${isLightMode ? theme.border : 'rgba(255,255,255,0.16)'}`,
                          background: active ? theme.primary : (isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)'),
                          color: active ? '#fff' : (isLightMode ? theme.text : '#fff'),
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {option.icon} {option.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: isMobile ? '30px' : '56px', fontWeight: '900', letterSpacing: '-1.8px', marginBottom: '8px', color: (selectedAccount?.balance || 0) >= 0 ? (isLightMode ? theme.text : '#fff') : (isLightMode ? theme.danger : '#ffb4b4'), overflowWrap: 'anywhere' }}>
                  {(selectedAccount?.balance || 0) < 0 ? '-' : ''}{formatCurrency(Math.abs(selectedAccount?.balance || 0), selectedAccount?.currency || cur)}
                </div>
                <div style={{ fontSize: '14px', color: isLightMode ? theme.textMuted : 'rgba(255,255,255,0.78)', lineHeight: 1.6, maxWidth: '640px' }}>
                  {selectedAccount?.id === 'all'
                    ? `Viewing your combined balance across ${accountOptions.length - 1} account${accountOptions.length - 1 !== 1 ? 's' : ''}.`
                    : `Viewing the current balance for ${selectedAccount?.label || 'this account'}.`}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px', marginTop: '18px' }}>
                <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Tracked Accounts</div>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>{accountOptions.length - 1}</div>
                  <div style={{ fontSize: '12px', color: isLightMode ? theme.textMuted : 'rgba(255,255,255,0.74)', marginTop: '4px' }}>Bank + envelopes available</div>
                </div>
                <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Transactions Logged</div>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>{transactions.length}</div>
                  <div style={{ fontSize: '12px', color: isLightMode ? theme.textMuted : 'rgba(255,255,255,0.74)', marginTop: '4px' }}>Across your current budget cycle</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: '12px' }}>
              <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.1)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Daily Target</div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{formatCurrency(budget.daily_target, cur)}</div>
              </div>
              <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.1)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Monthly Target</div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{formatCurrency(budget.monthly_target, cur)}</div>
              </div>
              <div style={{ padding: '16px 18px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.1)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Selected Account</div>
                <div style={{ fontSize: '18px', fontWeight: '800', overflowWrap: 'anywhere' }}>{selectedAccount?.icon} {selectedAccount?.label}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Today</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(stats.spentToday, cur)}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Month to date</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(stats.spentMonthToDate, cur)}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: isLightMode ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)', border: isLightMode ? `1px solid ${theme.border}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '11px', color: isLightMode ? theme.textSubtle : 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Projection</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(stats.projectedMonthEnd, cur)}</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
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
        <div className="section-card" style={{ borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: theme.text, margin: 0 }}>Recent Transactions</h2>
            <button onClick={() => setCurrentView('transactions')}
              style={{ fontSize: '12px', color: theme.primary, fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              View all →
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: theme.textSubtle }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontSize: '14px' }}>No transactions yet</div>
              <button onClick={() => setCurrentView('add-transaction')}
                style={{ marginTop: '12px', padding: '8px 20px', background: theme.primary, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Add your first transaction
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTransactions.map(t => {
                const isIncome = t.amount < 0;
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '12px', padding: '10px 12px', backgroundColor: theme.surfaceMuted, borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isIncome ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                        {isIncome ? '💰' : '💸'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: theme.text, overflowWrap: 'anywhere' }}>{t.category}</div>
                        <div style={{ fontSize: '11px', color: theme.textSubtle, overflowWrap: 'anywhere' }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{t.note ? ` · ${t.note}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: isIncome ? '#2ecc71' : '#ff7675', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
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
