import React, { useEffect, useState } from 'react';
import { useAuthStore } from './src/store/auth';
import DashboardWeb from './web/dashboard-web';

// Simple web-only login component (no React Native dependencies)
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }
    try {
      await signIn(email, password);
    } catch (err: any) {
      setLocalError(err.message || 'Login failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: '8px' }}>Budget It</h1>
        <p style={{ fontSize: '14px', color: '#7f8c8d', textAlign: 'center', marginBottom: '40px' }}>Track your spending, save smarter</p>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '12px 16px', marginBottom: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff', boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '12px 16px', marginBottom: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff', boxSizing: 'border-box' }}
          />
          {(localError || error) && (
            <div style={{ color: '#e74c3c', fontSize: '12px', marginBottom: '12px' }}>{localError || error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', backgroundColor: loading ? '#95a5a6' : '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ color: '#7f8c8d', fontSize: '14px' }}>Don't have an account? </span>
          <button onClick={onSwitch} style={{ color: '#3498db', fontSize: '14px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Sign up</button>
        </div>
      </div>
    </div>
  );
}

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    try {
      await signUp(email, password);
      alert('Account created! Please check your email to verify, then sign in.');
      onSwitch();
    } catch (err: any) {
      setLocalError(err.message || 'Signup failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: '8px' }}>Budget It</h1>
        <p style={{ fontSize: '14px', color: '#7f8c8d', textAlign: 'center', marginBottom: '40px' }}>Create your account</p>
        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '12px 16px', marginBottom: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff', boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ width: '100%', padding: '12px 16px', marginBottom: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', backgroundColor: '#fff', boxSizing: 'border-box' }}
          />
          {(localError || error) && (
            <div style={{ color: '#e74c3c', fontSize: '12px', marginBottom: '12px' }}>{localError || error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', backgroundColor: loading ? '#95a5a6' : '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ color: '#7f8c8d', fontSize: '14px' }}>Already have an account? </span>
          <button onClick={onSwitch} style={{ color: '#3498db', fontSize: '14px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, checkAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await checkAuth();
      } catch (e) {
        console.error('Auth init failed:', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    init();
    // Safety net: force ready after 4 seconds no matter what
    const timer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 4000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>💰</div>
          <div style={{ fontSize: '16px', color: '#2c3e50' }}>Loading Budget It...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentScreen === 'login') {
      return <LoginForm onSwitch={() => setCurrentScreen('signup')} />;
    }
    return <SignupForm onSwitch={() => setCurrentScreen('login')} />;
  }

  return <DashboardWeb />;
}
