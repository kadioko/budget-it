import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { getBudgetCycleWindow, toDateKey } from '@/lib/budget-logic';
import { Transaction } from '@/types/index';
import { categoryInitial, formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';
import { useNotificationSettingsStore } from '@/store/notifications';
import { useI18n } from '@/store/language';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, t, tr } = useI18n();
  const {
    budget,
    categoryBudgets,
    stats,
    transactions,
    envelopes,
    loading,
    error,
    isOffline,
    fetchBudget,
    fetchEnvelopes,
    fetchTransactions,
  } = useBudgetStore();
  const { inbox, fetchInbox } = useNotificationSettingsStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const locale = language === 'sw' ? 'sw-TZ' : 'en-US';
  const todayLabel = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const refreshDashboard = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        fetchBudget(user.id),
        fetchEnvelopes(user.id),
        fetchTransactions(user.id),
        fetchInbox(user.id).catch(() => undefined),
      ]);
      setLastSyncedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshDashboard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cycleDetails = useMemo(() => {
    if (!budget) return null;
    const { monthStart, monthEnd } = getBudgetCycleWindow(new Date(), budget.month_start_day);
    const remainingDays = Math.max(1, Math.ceil((monthEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return {
      label: `${monthStart.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${monthEnd.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`,
      remainingDays,
    };
  }, [budget, locale]);

  const categoryRows = useMemo(() => {
    if (!budget) return [];
    const sourceBudgets = budget.category_budgets && Object.keys(budget.category_budgets).length > 0
      ? budget.category_budgets
      : categoryBudgets;
    const { monthStart, monthEnd } = getBudgetCycleWindow(new Date(), budget.month_start_day);
    const start = toDateKey(monthStart);
    const end = toDateKey(monthEnd);

    return Object.entries(sourceBudgets || {})
      .filter(([, limit]) => Number.isFinite(limit) && limit > 0)
      .map(([category, limit]) => {
        const spent = transactions
          .filter((tx) => tx.amount > 0 && tx.category === category && tx.date >= start && tx.date <= end)
          .reduce((sum, tx) => sum + tx.amount, 0);
        const percent = Math.min(100, Math.round((spent / limit) * 100));
        return { category, limit, spent, percent, remaining: Math.max(0, limit - spent) };
      })
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);
  }, [budget, categoryBudgets, transactions]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]
  );

  const currency = budget?.currency || 'USD';
  const totalEnvelopeBalance = envelopes.reduce((sum, envelope) => sum + envelope.balance, 0);
  const totalBalance = (budget?.bank_balance || 0) + totalEnvelopeBalance;
  const dailyTarget = budget?.daily_target || 0;
  const monthlyTarget = budget?.monthly_target || 0;
  const spentToday = stats?.spentToday || 0;
  const spentCycle = stats?.spentMonthToDate || 0;
  const dailyPercent = dailyTarget > 0 ? Math.min(100, Math.round((spentToday / dailyTarget) * 100)) : 0;
  const cyclePercent = monthlyTarget > 0 ? Math.min(100, Math.round((spentCycle / monthlyTarget) * 100)) : 0;
  const safeDaily = cycleDetails ? Math.max(0, (stats?.monthlyRemaining || 0) / cycleDetails.remainingDays) : 0;
  const projectedGap = (stats?.projectedMonthEnd || 0) - monthlyTarget;
  const syncLabel = refreshing
    ? t('mobile.dashboard.refreshing')
    : lastSyncedAt
      ? tr('mobile.dashboard.updatedAt', { time: lastSyncedAt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) })
      : t('mobile.dashboard.tapToRefresh');

  if (loading && !budget && transactions.length === 0) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <DashboardSkeleton label={t('mobile.dashboard.loading')} />
      </View>
    );
  }

  if (!budget) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <View style={[nativeStyles.card, styles.emptyCard]}>
          <Text style={nativeStyles.emptyTitle}>{error ? t('mobile.dashboard.loadError') : t('mobile.dashboard.setupTitle')}</Text>
          <Text style={nativeStyles.emptyText}>
            {error
              ? t('mobile.dashboard.offline')
              : t('mobile.dashboard.setupBody')}
          </Text>
          {!error ? (
            <View style={styles.setupSteps}>
              {[t('mobile.dashboard.setupStepOne'), t('mobile.dashboard.setupStepTwo'), t('mobile.dashboard.setupStepThree')].map((step, index) => (
                <View key={step} style={styles.setupStep}>
                  <View style={styles.setupStepNumber}><Text style={styles.setupStepNumberText}>{index + 1}</Text></View>
                  <Text style={styles.setupStepText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            style={[nativeStyles.primaryButton, styles.emptyButton]}
            onPress={error ? refreshDashboard : () => router.push('/(app)/settings')}
          >
            <Text style={nativeStyles.primaryButtonText}>{error ? t('mobile.dashboard.tryAgain') : t('mobile.dashboard.openSetup')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={nativeStyles.screen}>
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[nativeStyles.content, styles.scrollContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshDashboard} tintColor={nativeTheme.primary} colors={[nativeTheme.primary]} />}
      >
        {isOffline ? (
          <View style={styles.connectionBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={nativeTheme.warning} />
            <Text style={styles.connectionBannerText}>{t('mobile.dashboard.offline')}</Text>
          </View>
        ) : null}
        <View style={nativeStyles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={nativeStyles.heroEyebrow}>{todayLabel}</Text>
            <View style={styles.heroActions}>
              <Pressable style={styles.heroIconButton} onPress={() => router.push('/(app)/help-guides')} accessibilityRole="button" accessibilityLabel="Open quick guides" accessibilityHint="Learn how to use Budget It">
                <Ionicons name="help" size={18} color="#ffffff" />
              </Pressable>
              <Pressable style={styles.heroIconButton} onPress={() => router.push('/(app)/alerts')} accessibilityRole="button" accessibilityLabel="Open alerts" accessibilityHint="Review budget warnings and reminders">
                <Ionicons name={inbox.length ? 'notifications' : 'notifications-outline'} size={18} color="#ffffff" />
                {inbox.length ? <View style={styles.alertCount}><Text style={styles.alertCountText}>{inbox.length > 9 ? '9+' : inbox.length}</Text></View> : null}
              </Pressable>
            </View>
          </View>
          <Text style={nativeStyles.heroTitle}>{t('mobile.dashboard.title')}</Text>
          <Text style={nativeStyles.heroText}>
            {projectedGap > 0
              ? tr('mobile.dashboard.overPace', { amount: formatMoney(projectedGap, currency, locale) })
              : tr('mobile.dashboard.underPace', { amount: formatMoney(Math.abs(projectedGap), currency, locale) })}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.syncButton, pressed && !refreshing && styles.syncButtonPressed]}
            onPress={refreshDashboard}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard data"
            accessibilityHint="Fetches the latest budget, transactions, and alerts"
          >
            <View style={styles.syncButtonIcon}>
              {refreshing ? (
                <ActivityIndicator size="small" color={nativeTheme.navy} />
              ) : (
                <Ionicons name="refresh" size={15} color={nativeTheme.navy} />
              )}
            </View>
            <View>
              <Text style={styles.syncButtonTitle}>{refreshing ? t('mobile.dashboard.syncing') : t('mobile.dashboard.syncPulse')}</Text>
              <Text style={styles.syncButtonLabel}>{syncLabel}</Text>
            </View>
            {!refreshing ? <Ionicons name="chevron-forward" size={15} color="#9edacb" /> : null}
          </Pressable>

          <View style={styles.heroGrid}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{t('mobile.dashboard.available')}</Text>
              <Text style={styles.heroStatValue}>{formatMoney(totalBalance, currency, locale)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{t('mobile.dashboard.safeToday')}</Text>
              <Text style={styles.heroStatValue}>{formatMoney(safeDaily, currency, locale)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction label={t('mobile.dashboard.addExpense')} icon="add" tone="primary" onPress={() => router.push({ pathname: '/(app)/add-transaction', params: { type: 'expense' } })} />
          <QuickAction label={t('mobile.dashboard.logIncome')} icon="trending-up" tone="success" onPress={() => router.push({ pathname: '/(app)/add-transaction', params: { type: 'income' } })} />
          <QuickAction label={t('mobile.dashboard.moveMoney')} icon="swap-horizontal" tone="accent" onPress={() => router.push('/(app)/transfer-funds')} />
        </View>

        <View style={styles.metricRow}>
          <MetricCard
            title={t('mobile.dashboard.today')}
            value={formatMoney(spentToday, currency, locale)}
            subtitle={tr('mobile.dashboard.dailyTarget', { percent: dailyPercent })}
            tone={stats?.isOverDailyBudget ? 'danger' : 'success'}
            progress={dailyPercent}
          />
          <MetricCard
            title={t('mobile.dashboard.cycle')}
            value={formatMoney(spentCycle, currency, locale)}
            subtitle={cycleDetails?.label || t('mobile.dashboard.currentCycle')}
            tone={stats?.isOverMonthlyBudget ? 'danger' : 'primary'}
            progress={cyclePercent}
          />
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>{t('mobile.dashboard.insights')}</Text>
          <Text style={nativeStyles.sectionTitle}>{t('mobile.dashboard.stayOnTrack')}</Text>
          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>
              {projectedGap > 0 ? t('mobile.dashboard.slowPace') : t('mobile.dashboard.roomToBreathe')}
            </Text>
            <Text style={styles.insightText}>
              {tr('mobile.dashboard.safeSpend', { amount: formatMoney(safeDaily, currency, locale), days: cycleDetails?.remainingDays || 1 })}
            </Text>
          </View>
        </View>

        <View style={nativeStyles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={nativeStyles.sectionEyebrow}>{t('mobile.dashboard.categoryWatch')}</Text>
              <Text style={nativeStyles.sectionTitle}>{t('mobile.dashboard.trackedLimits')}</Text>
            </View>
            <Pressable style={styles.smallLink} onPress={() => router.push('/(app)/settings')} accessibilityRole="button" accessibilityLabel="Manage category limits">
              <Text style={styles.smallLinkText}>{t('mobile.dashboard.manage')}</Text>
            </Pressable>
          </View>

          {categoryRows.length === 0 ? (
            <Text style={styles.mutedCopy}>{t('mobile.dashboard.categoryHint')}</Text>
          ) : (
            <View style={styles.listGap}>
              {categoryRows.map((row) => (
                <View key={row.category} style={styles.categoryItem}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.categoryTitle}>{row.category}</Text>
                    <Text style={[styles.categoryStatus, row.percent >= 85 && styles.categoryWarning]}>
                      {row.percent >= 100 ? t('mobile.dashboard.over') : row.percent >= 85 ? t('mobile.dashboard.almostThere') : t('mobile.dashboard.onTrack')}
                    </Text>
                  </View>
                  <Text style={styles.mutedCopy}>
                    {tr('mobile.dashboard.spentOfLeft', { spent: formatMoney(row.spent, currency, locale), limit: formatMoney(row.limit, currency, locale), remaining: formatMoney(row.remaining, currency, locale) })}
                  </Text>
                  <ProgressBar percent={row.percent} color={row.percent >= 100 ? nativeTheme.danger : row.percent >= 85 ? nativeTheme.warning : nativeTheme.success} />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={nativeStyles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={nativeStyles.sectionEyebrow}>{t('mobile.dashboard.recentActivity')}</Text>
              <Text style={nativeStyles.sectionTitle}>{t('mobile.dashboard.latestTransactions')}</Text>
            </View>
            <Pressable style={styles.smallLink} onPress={() => router.push('/(app)/transactions')} accessibilityRole="button" accessibilityLabel="View all transactions">
              <Text style={styles.smallLinkText}>{t('mobile.dashboard.viewAll')}</Text>
            </Pressable>
          </View>

          {recentTransactions.length === 0 ? (
            <Text style={styles.mutedCopy}>{t('mobile.dashboard.noTransactions')}</Text>
          ) : (
            <View style={styles.listGap}>
              {recentTransactions.map((item) => (
                <TransactionRow key={item.id} item={item} currency={currency} locale={locale} transferLabel={t('mobile.transactions.transfer')} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DashboardSkeleton({ label }: { label: string }) {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel={label}>
      <View style={[styles.skeletonBlock, styles.skeletonHero]} />
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonBlock, styles.skeletonMetric]} />
        <View style={[styles.skeletonBlock, styles.skeletonMetric]} />
      </View>
      <View style={[styles.skeletonBlock, styles.skeletonCard]} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, icon, tone, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'primary' | 'success' | 'accent'; onPress: () => void }) {
  const iconColor = tone === 'success' ? nativeTheme.success : tone === 'accent' ? '#9a6510' : nativeTheme.primary;
  const backgroundColor = tone === 'success' ? nativeTheme.successSoft : tone === 'accent' ? nativeTheme.accentSoft : '#dff1eb';
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.quickActionIcon, { backgroundColor }]}><Ionicons name={icon} size={17} color={iconColor} /></View>
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  progress,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  progress: number;
  tone: 'primary' | 'success' | 'danger';
}) {
  const color = tone === 'danger' ? nativeTheme.danger : tone === 'success' ? nativeTheme.success : nativeTheme.primary;
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
      <ProgressBar percent={progress} color={color} />
    </View>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }]} />
    </View>
  );
}

function TransactionRow({ item, currency, locale, transferLabel }: { item: Transaction; currency: string; locale: string; transferLabel: string }) {
  const isIncome = item.amount < 0;
  const isTransfer = item.kind === 'transfer';
  const amountColor = isIncome ? nativeTheme.success : isTransfer ? nativeTheme.primary : nativeTheme.danger;
  const sign = isIncome ? '+' : isTransfer && item.transfer_direction === 'incoming' ? '+' : '-';

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionBadge}>
        <Text style={styles.transactionBadgeText}>{categoryInitial(item.category)}</Text>
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionTitle}>{isTransfer ? transferLabel : item.category}</Text>
        <Text style={styles.transactionMeta} numberOfLines={1}>
          {[item.merchant, item.note, item.date].filter(Boolean).join(' - ')}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
        {sign}{formatMoney(Math.abs(item.amount), currency, locale)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 118,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: nativeTheme.warningSoft,
    borderWidth: 1,
    borderColor: '#f4d79b',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 12,
  },
  connectionBannerText: {
    flex: 1,
    color: '#7d4c0a',
    fontSize: 12,
    fontWeight: '800',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  loadingText: {
    color: nativeTheme.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyCard: {
    width: '100%',
    alignItems: 'center',
  },
  emptyButton: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  setupSteps: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 18,
  },
  setupStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 11,
    backgroundColor: nativeTheme.surfaceMuted,
  },
  setupStepNumber: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nativeTheme.primary,
  },
  setupStepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  setupStepText: {
    flex: 1,
    color: nativeTheme.ink,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  skeletonWrap: {
    width: '100%',
    gap: 14,
  },
  skeletonBlock: {
    backgroundColor: '#dcebe6',
    borderRadius: 20,
  },
  skeletonHero: {
    height: 206,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonMetric: {
    flex: 1,
    height: 112,
  },
  skeletonCard: {
    height: 172,
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroIconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  alertCount: { position: 'absolute', right: -5, top: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: nativeTheme.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  alertCountText: { color: nativeTheme.navy, fontSize: 9, fontWeight: '900' },
  heroStat: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  syncButton: {
    minHeight: 50,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(141,212,194,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(141,212,194,0.28)',
  },
  syncButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  syncButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nativeTheme.accent,
  },
  syncButtonTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  syncButtonLabel: {
    color: '#9edacb',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickAction: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: nativeTheme.surface,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  quickActionIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: nativeTheme.ink,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: nativeTheme.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    padding: 16,
  },
  metricTitle: {
    color: nativeTheme.subtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: nativeTheme.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  metricSubtitle: {
    color: nativeTheme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  insightBox: {
    marginTop: 14,
    padding: 15,
    borderRadius: 18,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  insightTitle: {
    color: nativeTheme.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5,
  },
  insightText: {
    color: nativeTheme.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  smallLink: {
    minHeight: 44,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallLinkText: {
    color: nativeTheme.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  mutedCopy: {
    color: nativeTheme.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  listGap: {
    gap: 10,
  },
  categoryItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    color: nativeTheme.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  categoryStatus: {
    color: nativeTheme.success,
    fontSize: 12,
    fontWeight: '900',
  },
  categoryWarning: {
    color: nativeTheme.warning,
  },
  transactionRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  transactionBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#dff1eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionBadgeText: {
    color: nativeTheme.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  transactionBody: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    color: nativeTheme.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  transactionMeta: {
    color: nativeTheme.subtle,
    fontSize: 12,
    marginTop: 3,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '900',
  },
});
