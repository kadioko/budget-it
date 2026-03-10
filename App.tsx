import React, { useEffect, useState } from 'react';
import { useAuthStore } from './src/store/auth';
import { applyWebTheme, useThemeStore } from './src/store/theme';
import DashboardWeb from './web/dashboard-web';

// Override Expo's react-native-web reset that sets body{overflow:hidden} and #root{display:flex;height:100%}
// These break scrolling and layout for a standard web app.
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: auto !important; min-height: 100vh; overflow-x: hidden !important; overflow-y: auto !important; margin: 0; padding: 0; background: var(--app-bg, #f0f2f5); color: var(--app-text, #0f172a); transition: background-color 0.2s ease, color 0.2s ease; }
    #root { display: block !important; height: auto !important; min-height: 100vh; flex: none !important; }
  `;
  document.head.appendChild(style);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 16px',
  fontSize: '15px',
  borderRadius: '10px',
  border: '1.5px solid #e0e0e0',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s',
  color: '#2c3e50',
};

const featurePillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  backdropFilter: 'blur(8px)',
};

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .auth-shell { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(380px, 460px); gap: 32px; width: min(1180px, 100%); align-items: stretch; }
        .auth-hero { display: flex; flex-direction: column; justify-content: space-between; min-height: 620px; padding: 48px; border-radius: 32px; color: #fff; background: linear-gradient(160deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.88) 48%, rgba(37,99,235,0.8) 100%); box-shadow: 0 28px 80px rgba(0,0,0,0.28); border: 1px solid rgba(255,255,255,0.12); }
        .auth-card { width: 100%; display: flex; flex-direction: column; justify-content: center; background-color: rgba(255,255,255,0.97); border-radius: 32px; padding: 48px 40px; box-shadow: 0 24px 64px rgba(0,0,0,0.25); animation: fadeIn 0.4s ease; border: 1px solid rgba(255,255,255,0.35); backdrop-filter: blur(10px); }
        .auth-feature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .auth-metrics-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 1080px) { .auth-shell { grid-template-columns: minmax(0, 1fr) minmax(340px, 420px); gap: 24px; } .auth-hero { min-height: 580px; padding: 40px; } .auth-card { padding: 40px 32px; } }
        @media (max-width: 900px) { .auth-shell { grid-template-columns: 1fr; max-width: 760px; } .auth-hero { min-height: auto; padding: 32px 28px; } .auth-card { padding: 36px 28px; } }
        @media (max-width: 640px) { .auth-shell { gap: 18px; } .auth-hero { padding: 24px 20px; border-radius: 24px; } .auth-card { padding: 28px 22px; border-radius: 24px; } .auth-feature-grid, .auth-metrics-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #3498db 100%)',
        padding: '28px',
      }}>
        <div className="auth-shell">
          <div className="auth-hero">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', marginBottom: '28px', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                Smarter personal finance, built for everyday use
              </div>
              <div style={{ fontSize: '52px', lineHeight: 1, marginBottom: '20px' }}>💰</div>
              <h1 style={{ fontSize: '42px', fontWeight: '900', lineHeight: 1.05, letterSpacing: '-1.2px', marginBottom: '14px' }}>Budget with clarity, not guesswork.</h1>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', maxWidth: '540px' }}>
                Track spending, monitor your balance, and stay on top of your goals with a cleaner, faster budgeting flow designed to work well on both desktop and mobile.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="auth-feature-grid">
                <div style={featurePillStyle}><span>📊</span><span>Clear daily and monthly tracking</span></div>
                <div style={featurePillStyle}><span>⚡</span><span>Quick transaction logging</span></div>
                <div style={featurePillStyle}><span>📱</span><span>Mobile-friendly responsive web app</span></div>
                <div style={featurePillStyle}><span>🔒</span><span>Secure account-based access</span></div>
              </div>
              <div className="auth-metrics-grid">
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>24/7</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>budget visibility</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>1 view</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>for balances and trends</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>Fast</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>setup and onboarding</div>
                </div>
              </div>
            </div>
          </div>
          <div className="auth-card">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#2c3e50', letterSpacing: '-0.5px' }}>Budget It</h1>
              <p style={{ fontSize: '14px', color: '#95a5a6', marginTop: '6px' }}>Track your spending, save smarter</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

function PasswordInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...inputStyle, paddingRight: '48px' }}
        onFocus={(e) => (e.target.style.borderColor = '#3498db')}
        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
          color: '#95a5a6', padding: '4px',
        }}
        tabIndex={-1}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <AuthCard>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>Welcome back</h2>
        <p style={{ fontSize: '14px', color: '#7f8c8d', lineHeight: 1.5 }}>Sign in to continue tracking your budget, balances, and recent spending.</p>
      </div>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#3498db')}
          onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          autoComplete="email"
        />
        <PasswordInput value={password} onChange={setPassword} placeholder="Password" disabled={loading} />
        {error && (
          <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #f5c6c6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #3498db, #2980b9)',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '4px', boxShadow: loading ? 'none' : '0 4px 12px rgba(52,152,219,0.35)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? '⏳ Signing in...' : 'Sign In'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#7f8c8d' }}>
        Don't have an account?{' '}
        <button onClick={onSwitch} style={{ color: '#3498db', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          Sign up free
        </button>
      </div>
    </AuthCard>
  );
}

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    try {
      await signUp(email, password);
      const { user: currentUser } = useAuthStore.getState();
      if (!currentUser) {
        setSuccess('Account created! Check your email to verify, then sign in.');
        setTimeout(() => onSwitch(), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <AuthCard>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50', marginBottom: '24px', textAlign: 'center' }}>Create your account</h2>
      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#27ae60')}
          onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          autoComplete="email"
        />
        <PasswordInput value={password} onChange={setPassword} placeholder="Password (min 6 characters)" disabled={loading} />
        <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirm password" disabled={loading} />
        {error && (
          <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #f5c6c6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            ✅ {success}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #27ae60, #219a52)',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '4px', boxShadow: loading ? 'none' : '0 4px 12px rgba(39,174,96,0.35)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? '⏳ Creating account...' : 'Create Account'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#7f8c8d' }}>
        Already have an account?{' '}
        <button onClick={onSwitch} style={{ color: '#3498db', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          Sign in
        </button>
      </div>
    </AuthCard>
  );
}

export default function App() {
  const { user, checkAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try { await checkAuth(); } catch {}
      finally { if (!cancelled) setReady(true); }
    };
    init();
    const timer = setTimeout(() => { if (!cancelled) setReady(true); }, 4000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (!ready) {
    return (
      <>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #3498db 100%)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>💰</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Budget It</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Loading your finances...</div>
        </div>
      </>
    );
  }

  if (!user) {
    if (currentScreen === 'login') return <LoginForm onSwitch={() => setCurrentScreen('signup')} />;
    return <SignupForm onSwitch={() => setCurrentScreen('login')} />;
  }

  return <DashboardWeb />;
}
