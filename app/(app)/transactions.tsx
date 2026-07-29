import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { Transaction } from '@/types/index';
import { categoryInitial, formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';

const FILTERS = ['All', 'Expenses', 'Income', 'Transfers'] as const;
type Filter = typeof FILTERS[number];

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { transactions, loading, budget, deleteTransaction, fetchTransactions } = useBudgetStore();
  const [filter, setFilter] = useState<Filter>('All');

  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      if (filter === 'All') return true;
      if (filter === 'Transfers') return item.kind === 'transfer';
      if (filter === 'Income') return item.amount < 0 && item.kind !== 'transfer';
      return item.amount > 0 && item.kind !== 'transfer';
    });
  }, [filter, transactions]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete transaction', 'This will remove the transaction and update balances.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: () => deleteTransaction(id),
        style: 'destructive',
      },
    ]);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionCard
      item={item}
      currency={budget?.currency || 'USD'}
      onDelete={() => handleDelete(item.id)}
      onEdit={() => router.push({ pathname: '/(app)/edit-transaction', params: { id: item.id } })}
    />
  );

  if (loading && transactions.length === 0) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <ActivityIndicator size="large" color={nativeTheme.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
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
        ListHeaderComponent={
          <>
            <View style={nativeStyles.heroCard}>
              <Text style={nativeStyles.heroEyebrow}>Money Trail</Text>
              <Text style={nativeStyles.heroTitle}>Transactions</Text>
              <Text style={nativeStyles.heroText}>
                Review spending, income, transfers, merchants, and notes in one clean feed.
              </Text>
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
                    <Text style={[nativeStyles.chipText, active && nativeStyles.chipTextActive]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={[nativeStyles.card, styles.emptyCard]}>
            <Text style={nativeStyles.emptyTitle}>No transactions yet</Text>
            <Text style={nativeStyles.emptyText}>
              Add your first expense or income entry and it will appear here with merchant and tag details.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function TransactionCard({
  item,
  currency,
  onDelete,
  onEdit,
}: {
  item: Transaction;
  currency: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const isIncome = item.amount < 0;
  const isTransfer = item.kind === 'transfer';
  const color = isIncome ? nativeTheme.success : isTransfer ? nativeTheme.primary : nativeTheme.danger;
  const sign = isIncome ? '+' : isTransfer && item.transfer_direction === 'incoming' ? '+' : '-';
  const subtitle = [
    item.merchant,
    item.note,
    item.tags?.length ? item.tags.map((tag) => `#${tag}`).join(' ') : null,
  ].filter(Boolean).join(' - ');

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionTop}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{categoryInitial(item.category)}</Text>
        </View>

        <View style={styles.transactionInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.transactionCategory}>{isTransfer ? 'Transfer' : item.category}</Text>
            {item.is_recurring ? (
              <View style={styles.recurringPill}>
                <Text style={styles.recurringText}>Recurring</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          {subtitle ? <Text style={styles.transactionNote} numberOfLines={2}>{subtitle}</Text> : null}
        </View>

        <Text style={[styles.transactionAmount, { color }]}>
          {sign}{formatMoney(Math.abs(item.amount), currency)}
        </Text>
      </View>

      {!isTransfer ? (
        <View style={styles.actionRow}>
          <Pressable onPress={onEdit} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
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
  deleteButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
    backgroundColor: nativeTheme.dangerSoft,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  editButtonText: {
    color: nativeTheme.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButtonText: {
    color: nativeTheme.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.7,
  },
  emptyCard: {
    alignItems: 'center',
  },
});
