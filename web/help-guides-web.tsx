import React from 'react';
import { themeTokens, useThemeStore } from '../src/store/theme';
import { useI18n } from '../src/store/language';

const guideIcons = ['◦', '⇄', '↻', '◌', '#'];

export default function HelpGuidesWeb({ onBack }: { onBack: () => void }) {
  const { mode } = useThemeStore();
  const { t } = useI18n();
  const theme = themeTokens[mode];

  const guides = [
    {
      title: t('guides.cardGettingStarted'),
      body: t('guides.cardGettingStartedBody'),
    },
    {
      title: t('guides.cardTransfers'),
      body: t('guides.cardTransfersBody'),
    },
    {
      title: t('guides.cardRecurring'),
      body: t('guides.cardRecurringBody'),
    },
    {
      title: t('guides.cardInsights'),
      body: t('guides.cardInsightsBody'),
    },
    {
      title: t('guides.cardTags'),
      body: t('guides.cardTagsBody'),
    },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; font-family: var(--app-font-body, "Manrope", sans-serif); background: var(--app-bg, ${theme.background}); color: var(--app-text, ${theme.text}); }
        @keyframes guideFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ minHeight: '100vh', background: `radial-gradient(circle at top right, ${theme.backgroundAccent}, transparent 28%), ${theme.background}`, padding: '24px 16px 64px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', animation: 'guideFade 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <button onClick={onBack} style={{ padding: '10px 16px', borderRadius: '14px', border: `1px solid ${theme.borderStrong}`, background: theme.surfaceStrong, color: theme.primary, fontWeight: 700, cursor: 'pointer' }}>
              ← {t('common.back')}
            </button>
            <div style={{ minWidth: '120px', minHeight: '120px', borderRadius: '32px', background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '68px', fontWeight: 900, boxShadow: '0 24px 48px rgba(29,78,216,0.26)', border: '1px solid rgba(255,255,255,0.14)' }}>
              ?
            </div>
          </div>

          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '28px', padding: '28px', boxShadow: theme.shadow, marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('guides.eyebrow')}</div>
            <h1 style={{ fontSize: '36px', lineHeight: 1.05, letterSpacing: '-1px', color: theme.text, margin: '0 0 12px 0' }}>{t('guides.title')}</h1>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: theme.textMuted, margin: 0, maxWidth: '720px' }}>{t('guides.subtitle')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {guides.map((guide, index) => (
              <div key={guide.title} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '22px', padding: '20px', boxShadow: theme.shadow }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: index % 2 === 0 ? 'rgba(29,78,216,0.12)' : 'rgba(16,185,129,0.12)', color: index % 2 === 0 ? '#1d4ed8' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>
                  {guideIcons[index] || '?'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: theme.text, marginBottom: '10px', letterSpacing: '-0.3px' }}>{guide.title}</div>
                <div style={{ fontSize: '14px', color: theme.textMuted, lineHeight: 1.7 }}>{guide.body}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '14px' }}>
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '22px', padding: '20px', boxShadow: theme.shadow }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: theme.textSubtle, textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>{t('guides.tipTitle')}</div>
              <div style={{ fontSize: '15px', lineHeight: 1.75, color: theme.text }}>{t('guides.tipBody')}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(29,78,216,0.88) 100%)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '22px', padding: '20px', boxShadow: theme.shadow, color: '#fff' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>{t('guides.needAnythingElse')}</div>
              <div style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(255,255,255,0.92)' }}>{t('guides.needAnythingElseBody')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
