import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { getBudgetCycleWindow, toDateKey } from '@/lib/budget-logic';
import { formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';

type CategoryTrend = { category: string; current: number; previous: number; change: number };

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const { budget, transactions, stats, loading, fetchBudget, fetchTransactions } = useBudgetStore();

  useEffect(() => {
    if (user) {
      fetchBudget(user.id);
      fetchTransactions(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const insightData = useMemo(() => {
    if (!budget) return null;
    const currentWindow = getBudgetCycleWindow(new Date(), budget.month_start_day);
    const previousWindow = getBudgetCycleWindow(
      new Date(currentWindow.monthStart.getFullYear(), currentWindow.monthStart.getMonth(), currentWindow.monthStart.getDate() - 1),
      budget.month_start_day
    );
    const inWindow = (date: string, start: Date, end: Date) => date >= toDateKey(start) && date <= toDateKey(end);
    const expenses = transactions.filter((item) => item.amount > 0 && item.kind !== 'transfer');
    const current = expenses.filter((item) => inWindow(item.date, currentWindow.monthStart, currentWindow.monthEnd));
    const previous = expenses.filter((item) => inWindow(item.date, previousWindow.monthStart, previousWindow.monthEnd));
    const currentTotal = current.reduce((sum, item) => sum + item.amount, 0);
    const previousTotal = previous.reduce((sum, item) => sum + item.amount, 0);
    const categories = Array.from(new Set([...current, ...previous].map((item) => item.category)));
    const categoryTrends: CategoryTrend[] = categories
      .map((category) => {
        const currentAmount = current.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0);
        const previousAmount = previous.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0);
        return { category, current: currentAmount, previous: previousAmount, change: currentAmount - previousAmount };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);

    const dailySpending = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      const date = toDateKey(day);
      return { label: day.toLocaleDateString('en-US', { weekday: 'narrow' }), amount: expenses.filter((item) => item.date === date).reduce((sum, item) => sum + item.amount, 0) };
    });

    return { currentWindow, currentTotal, previousTotal, categoryTrends, dailySpending };
  }, [budget, transactions]);

  if (loading && !insightData) {
    return <View style={[nativeStyles.screen, styles.centered]}><ActivityIndicator size="large" color={nativeTheme.primary} /></View>;
  }

  if (!budget || !insightData) return null;

  const currency = budget.currency;
  const change = insightData.currentTotal - insightData.previousTotal;
  const changePercent = insightData.previousTotal > 0 ? Math.round((Math.abs(change) / insightData.previousTotal) * 100) : 0;
  const trendUp = change > 0;
  const maxDay = Math.max(...insightData.dailySpending.map((day) => day.amount), 1);
  const projectedGap = (stats?.projectedMonthEnd || 0) - budget.monthly_target;

  return (
    <View style={nativeStyles.screen}>
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[nativeStyles.content, styles.content]}>
        <View style={nativeStyles.heroCard}>
          <Text style={nativeStyles.heroEyebrow}>MONEY INTELLIGENCE</Text>
          <Text style={nativeStyles.heroTitle}>Insights that make sense.</Text>
          <Text style={nativeStyles.heroText}>Your custom budget-cycle spending, trend direction, and the categories shaping it most.</Text>
        </View>

        <View style={styles.trendCard}>
          <View style={styles.trendHeading}>
            <View>
              <Text style={styles.trendLabel}>THIS BUDGET CYCLE</Text>
              <Text style={styles.trendValue}>{formatMoney(insightData.currentTotal, currency)}</Text>
            </View>
            <View style={[styles.trendBadge, trendUp ? styles.trendBadgeWarning : styles.trendBadgeGood]}>
              <Ionicons name={trendUp ? 'trending-up' : 'trending-down'} size={18} color={trendUp ? nativeTheme.warning : nativeTheme.success} />
              <Text style={[styles.trendBadgeText, { color: trendUp ? nativeTheme.warning : nativeTheme.success }]}>{changePercent}%</Text>
            </View>
          </View>
          <Text style={styles.trendText}>{trendUp ? 'Higher' : 'Lower'} than your last cycle by {formatMoney(Math.abs(change), currency)}.</Text>
          <View style={styles.cyclePill}><Ionicons name="calendar-outline" size={14} color={nativeTheme.primary} /><Text style={styles.cyclePillText}>{insightData.currentWindow.monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {insightData.currentWindow.monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text></View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>Weekly rhythm</Text>
          <Text style={nativeStyles.sectionTitle}>Last 7 days</Text>
          <View style={styles.chartArea}>
            {insightData.dailySpending.map((day) => (
              <View key={day.label} style={styles.barSlot}>
                <View style={styles.barTrack}><View style={[styles.barFill, { height: `${Math.max(6, (day.amount / maxDay) * 100)}%` }]} /></View>
                <Text style={styles.barLabel}>{day.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartCaption}>A quick pulse of when your spending happens, not just how much.</Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>Category movement</Text>
          <Text style={nativeStyles.sectionTitle}>What changed?</Text>
          {insightData.categoryTrends.length === 0 ? <Text style={styles.mutedText}>Add a few transactions and your category trends will appear here.</Text> : insightData.categoryTrends.map((item) => (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryDot}><Text style={styles.categoryInitial}>{item.category.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.categoryCopy}><Text style={styles.categoryName}>{item.category}</Text><Text style={styles.categoryPrevious}>Last cycle {formatMoney(item.previous, currency)}</Text></View>
              <View style={styles.categoryAmount}><Text style={styles.categoryCurrent}>{formatMoney(item.current, currency)}</Text><Text style={[styles.categoryChange, { color: item.change > 0 ? nativeTheme.warning : nativeTheme.success }]}>{item.change > 0 ? '+' : ''}{formatMoney(item.change, currency)}</Text></View>
            </View>
          ))}
        </View>

        <View style={[styles.callout, projectedGap > 0 ? styles.calloutWarning : styles.calloutGood]}>
          <Ionicons name={projectedGap > 0 ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={24} color={projectedGap > 0 ? nativeTheme.warning : nativeTheme.success} />
          <View style={styles.calloutCopy}><Text style={styles.calloutTitle}>{projectedGap > 0 ? 'Protect the rest of this cycle' : 'Your pace is healthy'}</Text><Text style={styles.calloutText}>{projectedGap > 0 ? `At this pace, you may end ${formatMoney(projectedGap, currency)} over your target.` : 'Keep your current rhythm and you are on track to finish this cycle within budget.'}</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 118 }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  trendCard: { backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: nativeTheme.border, padding: 18, marginBottom: 14, shadowColor: '#0a272e', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  trendHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, trendLabel: { color: nativeTheme.subtle, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 }, trendValue: { color: nativeTheme.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginTop: 7 },
  trendBadge: { borderRadius: 14, paddingVertical: 9, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 }, trendBadgeWarning: { backgroundColor: nativeTheme.warningSoft }, trendBadgeGood: { backgroundColor: nativeTheme.successSoft }, trendBadgeText: { fontWeight: '900', fontSize: 13 }, trendText: { color: nativeTheme.muted, fontSize: 13, marginTop: 13, lineHeight: 19 },
  cyclePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: nativeTheme.surfaceMuted, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10, marginTop: 13 }, cyclePillText: { color: nativeTheme.primary, fontSize: 11, fontWeight: '800' },
  chartArea: { height: 164, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 4 }, barSlot: { flex: 1, alignItems: 'center', gap: 8 }, barTrack: { height: 126, width: 16, borderRadius: 8, backgroundColor: '#e7f2ee', overflow: 'hidden', justifyContent: 'flex-end' }, barFill: { width: '100%', borderRadius: 8, backgroundColor: nativeTheme.primary }, barLabel: { color: nativeTheme.subtle, fontSize: 11, fontWeight: '800' }, chartCaption: { color: nativeTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  mutedText: { color: nativeTheme.muted, fontSize: 13, lineHeight: 20, marginTop: 12 }, categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: nativeTheme.border }, categoryDot: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#dff1eb', alignItems: 'center', justifyContent: 'center' }, categoryInitial: { color: nativeTheme.primary, fontWeight: '900', fontSize: 15 }, categoryCopy: { flex: 1 }, categoryName: { color: nativeTheme.ink, fontWeight: '900', fontSize: 14 }, categoryPrevious: { color: nativeTheme.subtle, fontSize: 11, fontWeight: '700', marginTop: 3 }, categoryAmount: { alignItems: 'flex-end' }, categoryCurrent: { color: nativeTheme.ink, fontWeight: '900', fontSize: 13 }, categoryChange: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  callout: { borderRadius: 22, padding: 17, flexDirection: 'row', gap: 12, marginBottom: 10 }, calloutWarning: { backgroundColor: nativeTheme.warningSoft }, calloutGood: { backgroundColor: nativeTheme.successSoft }, calloutCopy: { flex: 1 }, calloutTitle: { color: nativeTheme.ink, fontSize: 14, fontWeight: '900' }, calloutText: { color: nativeTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
