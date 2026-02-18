import React, { useEffect, useState } from 'react';
import { useAuthStore } from './src/store/auth';
import DashboardWeb from './web/dashboard-web';

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

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #3498db 100%)',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#fff',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#2c3e50', letterSpacing: '-0.5px' }}>Budget It</h1>
            <p style={{ fontSize: '14px', color: '#95a5a6', marginTop: '6px' }}>Track your spending, save smarter</p>
          </div>
          {children}
        </div>
      </div>
    </>
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
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50', marginBottom: '24px', textAlign: 'center' }}>Welcome back</h2>
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
