import React, { useEffect, useState } from 'react';
import { useAuthStore } from './src/store/auth';
import { supabase } from './src/lib/supabase';
import { useI18n, useLanguageStore } from './src/store/language';
import { applyWebTheme, useThemeStore } from './src/store/theme';
import DashboardWeb from './web/dashboard-web';

// Override Expo's react-native-web reset that sets body{overflow:hidden} and #root{display:flex;height:100%}
// These break scrolling and layout for a standard web app.
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body { height: auto !important; min-height: 100vh; overflow-x: hidden !important; overflow-y: auto !important; margin: 0; padding: 0; background: var(--app-bg, #f4f7fb); color: var(--app-text, #0f172a); font-family: var(--app-font-body, "Manrope", sans-serif); transition: background-color 0.2s ease, color 0.2s ease; }
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

type VerificationBanner = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <img
      src="/icon.svg"
      alt="Budget It"
      style={{ width: `${size}px`, height: `${size}px`, display: 'inline-block', borderRadius: '12px', objectFit: 'contain' }}
    />
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--app-font-body, "Manrope", sans-serif); }
        h1, h2 { font-family: var(--app-font-display, "Space Grotesk", sans-serif); }
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
        background: 'radial-gradient(circle at top right, rgba(96,165,250,0.24), transparent 24%), radial-gradient(circle at bottom left, rgba(16,185,129,0.18), transparent 28%), linear-gradient(135deg, #081120 0%, #0f1b32 52%, #1d4ed8 100%)',
        padding: '28px',
      }}>
        <div className="auth-shell">
          <div className="auth-hero">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', marginBottom: '28px', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                {t('auth.heroBadge')}
              </div>
              <div style={{ marginBottom: '20px' }}><BrandMark size={64} /></div>
              <h1 style={{ fontSize: '42px', fontWeight: '900', lineHeight: 1.05, letterSpacing: '-1.2px', marginBottom: '14px' }}>{t('auth.heroTitle')}</h1>
              <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', maxWidth: '540px' }}>
                {t('auth.heroSubtitle')}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="auth-feature-grid">
                <div style={featurePillStyle}><span>📊</span><span>{t('auth.featureTracking')}</span></div>
                <div style={featurePillStyle}><span>⚡</span><span>{t('auth.featureQuickLogging')}</span></div>
                <div style={featurePillStyle}><span>📱</span><span>{t('auth.featureResponsive')}</span></div>
                <div style={featurePillStyle}><span>🔒</span><span>{t('auth.featureSecure')}</span></div>
              </div>
              <div className="auth-metrics-grid">
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>24/7</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>{t('auth.metricVisibility')}</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>1 view</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>{t('auth.metricOneView')}</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: '18px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800 }}>Fast</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>{t('auth.metricSetup')}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="auth-card">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ marginBottom: '12px' }}><BrandMark size={48} /></div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#2c3e50', letterSpacing: '-0.5px' }}>{t('common.appName')}</h1>
              <p style={{ fontSize: '14px', color: '#95a5a6', marginTop: '6px' }}>{t('auth.tagLine')}</p>
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

function GoogleButton({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '13px 14px',
        borderRadius: '10px',
        border: '1.5px solid #d8dee8',
        background: '#fff',
        color: '#1f2937',
        fontSize: '15px',
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.72 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
      }}
    >
      <span style={{ width: '20px', height: '20px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'conic-gradient(from 0deg, #4285f4 0 25%, #34a853 0 50%, #fbbc05 0 75%, #ea4335 0)' }}>G</span>
      {label}
    </button>
  );
}

function AuthDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
      <span style={{ height: '1px', background: '#e2e8f0', flex: 1 }} />
      or
      <span style={{ height: '1px', background: '#e2e8f0', flex: 1 }} />
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn, signInWithGoogle, resetPasswordForEmail, loading } = useAuthStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetMode, setResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError(t('auth.fillAllFields')); return; }
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email) { setError('Enter your email address first.'); return; }
    try {
      await resetPasswordForEmail(email);
      setSuccess('Password reset email sent. Open the link in that email to set a new password.');
    } catch (err: any) {
      setError(err.message || 'Could not send password reset email.');
    }
  };

  const handleGoogle = async () => {
    setError(''); setSuccess('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <AuthCard>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>{resetMode ? 'Reset your password' : t('auth.welcomeBack')}</h2>
        <p style={{ fontSize: '14px', color: '#7f8c8d', lineHeight: 1.5 }}>
          {resetMode ? 'Enter your account email and we will send a secure reset link.' : t('auth.welcomeSubtitle')}
        </p>
      </div>
      <form onSubmit={resetMode ? handlePasswordReset : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#3498db')}
          onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          autoComplete="email"
        />
        {!resetMode && <PasswordInput value={password} onChange={setPassword} placeholder={t('auth.passwordPlaceholder')} disabled={loading} />}
        {error && (
          <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #f5c6c6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5 }}>
            {success}
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
          {loading ? (resetMode ? 'Sending...' : t('auth.signingIn')) : (resetMode ? 'Send reset link' : t('auth.signIn'))}
        </button>
      </form>
      {!resetMode && (
        <>
          <div style={{ margin: '16px 0' }}><AuthDivider /></div>
          <GoogleButton disabled={loading} onClick={handleGoogle} label="Continue with Google" />
        </>
      )}
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#7f8c8d' }}>
        {resetMode ? 'Remembered your password?' : t('auth.noAccount')}{' '}
        <button onClick={() => resetMode ? setResetMode(false) : onSwitch()} style={{ color: '#3498db', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          {resetMode ? t('auth.signIn') : t('auth.signUp')}
        </button>
      </div>
      {!resetMode && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <button type="button" onClick={() => { setResetMode(true); setError(''); setSuccess(''); }} style={{ color: '#64748b', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
            Forgot your password?
          </button>
        </div>
      )}
    </AuthCard>
  );
}

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp, signInWithGoogle, loading } = useAuthStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError(t('auth.fillAllFields')); return; }
    if (password.length < 6) { setError(t('auth.passwordTooShort')); return; }
    if (password !== confirm) { setError(t('auth.passwordsDoNotMatch')); return; }
    try {
      await signUp(email, password);
      const { user: currentUser } = useAuthStore.getState();
      if (!currentUser) {
        setSuccess(t('auth.signupSuccess'));
        setTimeout(() => onSwitch(), 3000);
      }
    } catch (err: any) {
      setError(err.message || t('auth.signupError'));
    }
  };

  const handleGoogle = async () => {
    setError(''); setSuccess('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <AuthCard>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50', marginBottom: '24px', textAlign: 'center' }}>{t('auth.createAccount')}</h2>
      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <input
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#27ae60')}
          onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          autoComplete="email"
        />
        <PasswordInput value={password} onChange={setPassword} placeholder={t('auth.passwordPlaceholder')} disabled={loading} />
        <PasswordInput value={confirm} onChange={setConfirm} placeholder={t('auth.confirmPasswordPlaceholder')} disabled={loading} />
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
          {loading ? t('auth.signingUp') : t('auth.signUp')}
        </button>
      </form>
      <div style={{ margin: '16px 0' }}><AuthDivider /></div>
      <GoogleButton disabled={loading} onClick={handleGoogle} label="Sign up with Google" />
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#7f8c8d' }}>
        {t('auth.haveAccount')}{' '}
        <button onClick={onSwitch} style={{ color: '#3498db', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          {t('auth.signIn')}
        </button>
      </div>
    </AuthCard>
  );
}

function ResetPasswordForm({ onComplete }: { onComplete: () => void }) {
  const { updatePassword, loading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    try {
      await updatePassword(password);
      setSuccess('Password updated. You can continue to your dashboard now.');
      setTimeout(onComplete, 900);
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    }
  };

  return (
    <AuthCard>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' }}>Set a new password</h2>
        <p style={{ fontSize: '14px', color: '#7f8c8d', lineHeight: 1.5 }}>Choose a new password for your Budget It account.</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <PasswordInput value={password} onChange={setPassword} placeholder="New password" disabled={loading} />
        <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirm new password" disabled={loading} />
        {error && (
          <div style={{ backgroundColor: '#fdf2f2', border: '1px solid #f5c6c6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            {success}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #0f766e, #14b8a6)',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '4px', boxShadow: loading ? 'none' : '0 4px 12px rgba(20,184,166,0.3)',
          }}
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  );
}

function VerificationNotice({ banner, onContinue }: { banner: VerificationBanner; onContinue: () => void }) {
  const palette = banner.type === 'success'
    ? { background: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '✅', button: 'linear-gradient(135deg, #27ae60, #219a52)' }
    : banner.type === 'error'
      ? { background: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: '⚠️', button: 'linear-gradient(135deg, #ef4444, #dc2626)' }
      : { background: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: 'ℹ️', button: 'linear-gradient(135deg, #3498db, #2563eb)' };

  return (
    <AuthCard>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '44px', marginBottom: '14px' }}>{palette.icon}</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#2c3e50', marginBottom: '10px' }}>{banner.title}</h2>
        <div style={{ backgroundColor: palette.background, border: `1px solid ${palette.border}`, color: palette.text, padding: '14px 16px', borderRadius: '14px', fontSize: '14px', lineHeight: 1.6, marginBottom: '18px' }}>
          {banner.message}
        </div>
        <button
          onClick={onContinue}
          style={{ width: '100%', padding: '14px', background: palette.button, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.16)' }}
        >
          Continue to sign in
        </button>
      </div>
    </AuthCard>
  );
}

export default function App() {
  const { user, checkAuth } = useAuthStore();
  const { mode } = useThemeStore();
  const language = useLanguageStore((state) => state.language);
  const [ready, setReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'signup' | 'reset-password'>('login');
  const [verificationBanner, setVerificationBanner] = useState<VerificationBanner | null>(null);

  useEffect(() => {
    applyWebTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language === 'sw' ? 'sw' : 'en';
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
    const hasVerificationIntent = searchParams.get('auth_action') === 'email_verified';
    const hasPasswordRecoveryIntent = searchParams.get('auth_action') === 'password_recovery' || hashParams.get('type') === 'recovery';
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('refresh_token') || searchParams.has('code') || searchParams.has('token_hash');
    const hasAuthError = searchParams.has('error') || hashParams.has('error_description');

    if (!hasVerificationIntent && !hasPasswordRecoveryIntent && !hasAuthTokens && !hasAuthError) return;

    let active = true;

    const finalizeUrl = () => {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
    };

    const processVerification = async () => {
      setVerificationBanner({
        type: 'info',
        title: 'Finishing verification…',
        message: 'We are confirming your email and preparing your account.',
      });

      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          throw error;
        }

        if (hasPasswordRecoveryIntent) {
          setVerificationBanner(null);
          setCurrentScreen('reset-password');
        } else if (!hasVerificationIntent && data.session?.user) {
          setVerificationBanner(null);
        } else if (data.session?.user?.email_confirmed_at || hasVerificationIntent) {
          setVerificationBanner({
            type: 'success',
            title: 'Email verified',
            message: 'Your email has been verified successfully. You can now sign in and continue using Budget It.',
          });
          setCurrentScreen('login');
        } else {
          setVerificationBanner({
            type: 'error',
            title: 'Verification not completed',
            message: 'We could not confirm your email from this link. Please try the latest email again or request a new verification email.',
          });
        }
      } catch (error: any) {
        if (!active) return;
        setVerificationBanner({
          type: 'error',
          title: 'Verification failed',
          message: error?.message || 'We could not complete email verification. Please try again from the most recent email link.',
        });
      } finally {
        if (active) finalizeUrl();
      }
    };

    processVerification();

    return () => {
      active = false;
    };
  }, []);

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
          <div style={{ marginBottom: '20px', animation: 'pulse 1.5s infinite' }}><BrandMark size={56} /></div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Budget It</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Loading your finances...</div>
        </div>
      </>
    );
  }

  if (currentScreen === 'reset-password') {
    return <ResetPasswordForm onComplete={() => setCurrentScreen('login')} />;
  }

  if (!user) {
    if (verificationBanner) {
      return <VerificationNotice banner={verificationBanner} onContinue={() => { setVerificationBanner(null); setCurrentScreen('login'); }} />;
    }
    if (currentScreen === 'login') return <LoginForm onSwitch={() => setCurrentScreen('signup')} />;
    return <SignupForm onSwitch={() => setCurrentScreen('login')} />;
  }

  return <DashboardWeb />;
}
