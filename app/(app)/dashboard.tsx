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

const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
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
      label: `${monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      remainingDays,
    };
  }, [budget]);

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
    ? 'Refreshing data'
    : lastSyncedAt
      ? `Updated ${lastSyncedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : 'Tap to refresh';

  if (loading && !budget && transactions.length === 0) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <ActivityIndicator size="large" color={nativeTheme.primary} />
        <Text style={styles.loadingText}>Loading your money dashboard...</Text>
      </View>
    );
  }

  if (!budget) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <View style={[nativeStyles.card, styles.emptyCard]}>
          <Text style={nativeStyles.emptyTitle}>{error ? 'Could not load your budget' : 'Set your first budget'}</Text>
          <Text style={nativeStyles.emptyText}>
            {error
              ? 'Check your connection, then try again. Your saved data will remain safe.'
              : 'Add your daily and monthly targets so Budget It can show pacing, safe spend, and alerts.'}
          </Text>
          <Pressable
            style={[nativeStyles.primaryButton, styles.emptyButton]}
            onPress={error ? refreshDashboard : () => router.push('/(app)/settings')}
          >
            <Text style={nativeStyles.primaryButtonText}>{error ? 'Try Again' : 'Open Settings'}</Text>
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
            <Text style={styles.connectionBannerText}>You are offline. Showing your last saved budget.</Text>
          </View>
        ) : null}
        <View style={nativeStyles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={nativeStyles.heroEyebrow}>{todayLabel}</Text>
            <View style={styles.heroActions}>
              <Pressable style={styles.heroIconButton} onPress={() => router.push('/(app)/help-guides')} accessibilityRole="button" accessibilityLabel="Open quick guides">
                <Ionicons name="help" size={18} color="#ffffff" />
              </Pressable>
              <Pressable style={styles.heroIconButton} onPress={() => router.push('/(app)/alerts')} accessibilityRole="button" accessibilityLabel="Open alerts">
                <Ionicons name={inbox.length ? 'notifications' : 'notifications-outline'} size={18} color="#ffffff" />
                {inbox.length ? <View style={styles.alertCount}><Text style={styles.alertCountText}>{inbox.length > 9 ? '9+' : inbox.length}</Text></View> : null}
              </Pressable>
            </View>
          </View>
          <Text style={nativeStyles.heroTitle}>Your budget pulse</Text>
          <Text style={nativeStyles.heroText}>
            {projectedGap > 0
              ? `At this pace, you may go over by ${formatMoney(projectedGap, currency)}.`
              : `You are pacing ${formatMoney(Math.abs(projectedGap), currency)} under target.`}
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
              <Text style={styles.syncButtonTitle}>{refreshing ? 'Syncing your budget' : 'Sync pulse'}</Text>
              <Text style={styles.syncButtonLabel}>{syncLabel}</Text>
            </View>
            {!refreshing ? <Ionicons name="chevron-forward" size={15} color="#9edacb" /> : null}
          </Pressable>

          <View style={styles.heroGrid}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Available</Text>
              <Text style={styles.heroStatValue}>{formatMoney(totalBalance, currency)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Safe today</Text>
              <Text style={styles.heroStatValue}>{formatMoney(safeDaily, currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickRow}>
          <QuickAction label="Add expense" icon="add" tone="primary" onPress={() => router.push({ pathname: '/(app)/add-transaction', params: { type: 'expense' } })} />
          <QuickAction label="Log income" icon="trending-up" tone="success" onPress={() => router.push({ pathname: '/(app)/add-transaction', params: { type: 'income' } })} />
          <QuickAction label="Move money" icon="swap-horizontal" tone="accent" onPress={() => router.push('/(app)/transfer-funds')} />
        </View>

        <View style={styles.metricRow}>
          <MetricCard
            title="Today"
            value={formatMoney(spentToday, currency)}
            subtitle={`${dailyPercent}% of daily target`}
            tone={stats?.isOverDailyBudget ? 'danger' : 'success'}
            progress={dailyPercent}
          />
          <MetricCard
            title="Cycle"
            value={formatMoney(spentCycle, currency)}
            subtitle={cycleDetails?.label || 'Current cycle'}
            tone={stats?.isOverMonthlyBudget ? 'danger' : 'primary'}
            progress={cyclePercent}
          />
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>Insights</Text>
          <Text style={nativeStyles.sectionTitle}>Stay on track</Text>
          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>
              {projectedGap > 0 ? 'Slow the pace a little' : 'You have room to breathe'}
            </Text>
            <Text style={styles.insightText}>
              Keep spending near {formatMoney(safeDaily, currency)} per day for the next {cycleDetails?.remainingDays || 1} days to finish this cycle cleanly.
            </Text>
          </View>
        </View>

        <View style={nativeStyles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={nativeStyles.sectionEyebrow}>Category Watch</Text>
              <Text style={nativeStyles.sectionTitle}>Tracked limits</Text>
            </View>
            <Pressable style={styles.smallLink} onPress={() => router.push('/(app)/settings')}>
              <Text style={styles.smallLinkText}>Manage</Text>
            </Pressable>
          </View>

          {categoryRows.length === 0 ? (
            <Text style={styles.mutedCopy}>Add category limits in Settings to see progress and early warnings here.</Text>
          ) : (
            <View style={styles.listGap}>
              {categoryRows.map((row) => (
                <View key={row.category} style={styles.categoryItem}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.categoryTitle}>{row.category}</Text>
                    <Text style={[styles.categoryStatus, row.percent >= 85 && styles.categoryWarning]}>
                      {row.percent >= 100 ? 'Over' : row.percent >= 85 ? 'Almost there' : 'On track'}
                    </Text>
                  </View>
                  <Text style={styles.mutedCopy}>
                    {formatMoney(row.spent, currency)} of {formatMoney(row.limit, currency)} - {formatMoney(row.remaining, currency)} left
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
              <Text style={nativeStyles.sectionEyebrow}>Recent Activity</Text>
              <Text style={nativeStyles.sectionTitle}>Latest transactions</Text>
            </View>
            <Pressable style={styles.smallLink} onPress={() => router.push('/(app)/transactions')}>
              <Text style={styles.smallLinkText}>View all</Text>
            </Pressable>
          </View>

          {recentTransactions.length === 0 ? (
            <Text style={styles.mutedCopy}>No transactions yet. Add one and the dashboard starts lighting up.</Text>
          ) : (
            <View style={styles.listGap}>
              {recentTransactions.map((item) => (
                <TransactionRow key={item.id} item={item} currency={currency} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({ label, icon, tone, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'primary' | 'success' | 'accent'; onPress: () => void }) {
  const iconColor = tone === 'success' ? nativeTheme.success : tone === 'accent' ? '#9a6510' : nativeTheme.primary;
  const backgroundColor = tone === 'success' ? nativeTheme.successSoft : tone === 'accent' ? nativeTheme.accentSoft : '#dff1eb';
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]} onPress={onPress}>
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

function TransactionRow({ item, currency }: { item: Transaction; currency: string }) {
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
        <Text style={styles.transactionTitle}>{isTransfer ? 'Transfer' : item.category}</Text>
        <Text style={styles.transactionMeta} numberOfLines={1}>
          {[item.merchant, item.note, item.date].filter(Boolean).join(' - ')}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
        {sign}{formatMoney(Math.abs(item.amount), currency)}
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
  heroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroIconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
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
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
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
