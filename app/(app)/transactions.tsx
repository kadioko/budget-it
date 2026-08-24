import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { Transaction } from '@/types/index';
import { fromDateKey, toDateKey } from '@/lib/budget-logic';
import { categoryInitial, formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';
import { useI18n } from '@/store/language';

const FILTERS = ['All', 'Expenses', 'Income', 'Transfers'] as const;
type Filter = typeof FILTERS[number];
type DateFilter = 'all' | '7d' | 'month';

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { transactions, loading, budget, error, isOffline, deleteTransaction, fetchTransactions } = useBudgetStore();
  const { language, t } = useI18n();
  const [filter, setFilter] = useState<Filter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const locale = language === 'sw' ? 'sw-TZ' : 'en-US';

  const refreshTransactions = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      await fetchTransactions(user.id);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshTransactions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastSevenDays = new Date(today);
    lastSevenDays.setDate(today.getDate() - 6);

    return transactions.filter((item) => {
      const matchesType = filter === 'All'
        || (filter === 'Transfers' && item.kind === 'transfer')
        || (filter === 'Income' && item.amount < 0 && item.kind !== 'transfer')
        || (filter === 'Expenses' && item.amount > 0 && item.kind !== 'transfer');
      const matchesDate = dateFilter === 'all'
        || (dateFilter === '7d' && item.date >= toDateKey(lastSevenDays))
        || (dateFilter === 'month' && item.date >= toDateKey(monthStart));
      const searchableText = [item.category, item.merchant, item.note, ...(item.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesType && matchesDate && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [dateFilter, filter, searchQuery, transactions]);

  const transactionSummary = useMemo(() => ({
    expenses: transactions.filter((item) => item.amount > 0 && item.kind !== 'transfer').length,
    income: transactions.filter((item) => item.amount < 0 && item.kind !== 'transfer').length,
  }), [transactions]);

  const handleDelete = (id: string) => {
    Alert.alert(t('mobile.transactions.delete'), t('mobile.transactions.deleteBody'), [
      { text: t('mobile.transactions.cancel'), style: 'cancel' },
      {
        text: t('mobile.transactions.delete'),
        onPress: () => {
          void deleteTransaction(id).catch(() => {
            Alert.alert(t('mobile.transactions.delete'), t('mobile.transactions.deleteFailed'));
          });
        },
        style: 'destructive',
      },
    ]);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionCard
      item={item}
      currency={budget?.currency || 'USD'}
      locale={locale}
      transferLabel={t('mobile.transactions.transfer')}
      recurringLabel={t('mobile.transactions.recurring')}
      editLabel={t('mobile.transactions.edit')}
      deleteLabel={t('mobile.transactions.delete')}
      onEdit={() => router.push({ pathname: '/(app)/edit-transaction', params: { id: item.id } })}
      onDelete={() => handleDelete(item.id)}
    />
  );

  if (loading && transactions.length === 0) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <TransactionSkeleton label={t('mobile.transactions.loading')} />
      </View>
    );
  }

  return (
    <View style={nativeStyles.screen}>
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[nativeStyles.content, styles.listContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshTransactions} tintColor={nativeTheme.primary} colors={[nativeTheme.primary]} />}
        ListHeaderComponent={
          <>
            {isOffline ? (
              <View style={styles.connectionBanner}>
                <Text style={styles.connectionBannerText}>{t('mobile.transactions.offline')}</Text>
              </View>
            ) : null}
            <View style={nativeStyles.heroCard}>
              <Text style={nativeStyles.heroEyebrow}>{t('mobile.transactions.eyebrow')}</Text>
              <Text style={nativeStyles.heroTitle}>{t('mobile.transactions.title')}</Text>
              <Text style={nativeStyles.heroText}>
                {t('mobile.transactions.subtitle')}
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{transactionSummary.expenses}</Text><Text style={styles.summaryLabel}>{t('mobile.transactions.expenses')}</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{transactionSummary.income}</Text><Text style={styles.summaryLabel}>{t('mobile.transactions.incomeEntries')}</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}><Text style={styles.summaryValue}>{transactions.filter((item) => item.kind === 'transfer').length}</Text><Text style={styles.summaryLabel}>{t('mobile.transactions.transfers')}</Text></View>
              </View>
            </View>

            <View style={styles.searchShell}>
              <Ionicons name="search-outline" size={18} color={nativeTheme.subtle} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('mobile.transactions.searchPlaceholder')}
                placeholderTextColor="#7d9592"
                returnKeyType="search"
              />
              {searchQuery ? <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear transaction search"><Ionicons name="close-circle" size={18} color={nativeTheme.subtle} /></Pressable> : null}
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const active = filter === item;
                return (
                  <Pressable
                    key={item}
                    style={[nativeStyles.chip, styles.filterChip, active && nativeStyles.chipActive]}
                    onPress={() => setFilter(item)}
                  >
                    <Text style={[nativeStyles.chipText, active && nativeStyles.chipTextActive]}>{item === 'All' ? t('mobile.transactions.all') : item === 'Expenses' ? t('mobile.transactions.expenses') : item === 'Income' ? t('mobile.transactions.income') : t('mobile.transactions.transfers')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.filterRow, styles.dateFilterRow]}>
              {(['all', '7d', 'month'] as const).map((item) => {
                const active = dateFilter === item;
                const label = item === 'all' ? t('mobile.transactions.allTime') : item === '7d' ? t('mobile.transactions.lastSevenDays') : t('mobile.transactions.thisMonth');
                return <Pressable key={item} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setDateFilter(item)}><Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{label}</Text></Pressable>;
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={[nativeStyles.card, styles.emptyCard]}>
            <Text style={nativeStyles.emptyTitle}>{error && !transactions.length ? t('mobile.transactions.loadError') : transactions.length ? t('mobile.transactions.noResults') : t('mobile.transactions.empty')}</Text>
            <Text style={nativeStyles.emptyText}>
              {error && !transactions.length
              ? t('mobile.transactions.offline')
                : transactions.length ? t('mobile.transactions.noResultsBody') : t('mobile.transactions.emptyBody')}
            </Text>
            {error && !transactions.length ? (
              <Pressable style={[nativeStyles.primaryButton, styles.retryButton]} onPress={refreshTransactions}>
                <Text style={nativeStyles.primaryButtonText}>{t('mobile.transactions.retry')}</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

function TransactionSkeleton({ label }: { label: string }) {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel={label}>
      <View style={[styles.skeletonBlock, styles.skeletonHero]} />
      <View style={[styles.skeletonBlock, styles.skeletonCard]} />
      <View style={[styles.skeletonBlock, styles.skeletonCard]} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function TransactionCard({
  item,
  currency,
  locale,
  transferLabel,
  recurringLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  item: Transaction;
  currency: string;
  locale: string;
  transferLabel: string;
  recurringLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = item.amount < 0;
  const isTransfer = item.kind === 'transfer';
  const color = isIncome ? nativeTheme.success : isTransfer ? nativeTheme.primary : nativeTheme.danger;
  const sign = isIncome ? '+' : isTransfer && item.transfer_direction === 'incoming' ? '+' : '-';
  const translateX = React.useRef(new Animated.Value(0)).current;
  const subtitle = [
    item.merchant,
    item.note,
    item.tags?.length ? item.tags.map((tag) => `#${tag}`).join(' ') : null,
  ].filter(Boolean).join(' - ');

  const closeActions = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  const panResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !isTransfer && gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-136, Math.min(0, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      Animated.spring(translateX, {
        toValue: gesture.dx < -52 ? -136 : 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    },
    onPanResponderTerminate: () => closeActions(),
  }), [isTransfer, translateX]);

  const card = (
    <View style={[styles.transactionItem, !isTransfer && styles.swipeCard]}>
      <View style={styles.transactionTop}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{categoryInitial(item.category)}</Text>
        </View>

        <View style={styles.transactionInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.transactionCategory}>{isTransfer ? transferLabel : item.category}</Text>
            {item.is_recurring ? (
              <View style={styles.recurringPill}>
                <Text style={styles.recurringText}>{recurringLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.transactionDate}>{(fromDateKey(item.date) ?? new Date()).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          {subtitle ? <Text style={styles.transactionNote} numberOfLines={2}>{subtitle}</Text> : null}
        </View>

        <Text style={[styles.transactionAmount, { color }]}>
          {sign}{formatMoney(Math.abs(item.amount), currency, locale)}
        </Text>
      </View>
    </View>
  );

  if (isTransfer) return card;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeActions}>
        <Pressable style={styles.swipeEdit} onPress={() => { closeActions(); onEdit(); }} accessibilityRole="button" accessibilityLabel={`${editLabel} ${item.category}`}>
          <Ionicons name="create-outline" size={17} color="#ffffff" />
          <Text style={styles.swipeActionText}>{editLabel}</Text>
        </Pressable>
        <Pressable style={styles.swipeDelete} onPress={() => { closeActions(); onDelete(); }} accessibilityRole="button" accessibilityLabel={`${deleteLabel} ${item.category}`}>
          <Ionicons name="trash-outline" size={17} color="#ffffff" />
          <Text style={styles.swipeActionText}>{deleteLabel}</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {card}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 118,
  },
  centered: {
    flex: 1,
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  dateFilterRow: { marginTop: -5 },
  searchShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 16, paddingHorizontal: 13, marginBottom: 10, backgroundColor: nativeTheme.surface, borderWidth: 1, borderColor: nativeTheme.border },
  searchInput: { flex: 1, color: nativeTheme.ink, fontSize: 13, fontWeight: '700', paddingVertical: 10 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: nativeTheme.surfaceMuted, borderWidth: 1, borderColor: nativeTheme.border },
  dateChipActive: { backgroundColor: '#dff1eb', borderColor: nativeTheme.primary },
  dateChipText: { color: nativeTheme.muted, fontSize: 11, fontWeight: '800' },
  dateChipTextActive: { color: nativeTheme.primary },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  summaryLabel: { color: '#a6c4be', fontSize: 10, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  connectionBanner: {
    borderRadius: 14,
    backgroundColor: nativeTheme.warningSoft,
    borderWidth: 1,
    borderColor: '#f4d79b',
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 12,
  },
  connectionBannerText: {
    color: '#7d4c0a',
    fontSize: 12,
    fontWeight: '800',
  },
  retryButton: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  filterChip: {
    paddingHorizontal: 13,
  },
  transactionItem: {
    backgroundColor: nativeTheme.surface,
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  swipeContainer: { marginBottom: 12, overflow: 'hidden', borderRadius: 22 },
  swipeCard: { marginBottom: 0 },
  swipeActions: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 136, flexDirection: 'row', overflow: 'hidden', borderRadius: 22 },
  swipeEdit: { width: 68, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: nativeTheme.primary },
  swipeDelete: { width: 68, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: nativeTheme.danger },
  swipeActionText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  transactionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  categoryBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#dff1eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 17,
    fontWeight: '900',
    color: nativeTheme.primary,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  transactionCategory: {
    fontSize: 15,
    fontWeight: '900',
    color: nativeTheme.ink,
  },
  transactionDate: {
    fontSize: 12,
    color: nativeTheme.subtle,
    marginTop: 3,
    fontWeight: '700',
  },
  transactionNote: {
    fontSize: 12,
    color: nativeTheme.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '900',
    maxWidth: 112,
    textAlign: 'right',
  },
  recurringPill: {
    borderRadius: 999,
    backgroundColor: nativeTheme.accentSoft,
    borderWidth: 1,
    borderColor: '#f0d59a',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  recurringText: {
    color: '#9a6510',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyCard: {
    alignItems: 'center',
  },
  skeletonWrap: { width: '100%', gap: 12 },
  skeletonBlock: { backgroundColor: '#dcebe6', borderRadius: 20 },
  skeletonHero: { height: 190 },
  skeletonCard: { height: 96 },
});
