import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { toDateKey } from '@/lib/budget-logic';
import { formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

export default function AddTransactionScreen() {
  const { user } = useAuthStore();
  const { budget, envelopes, transactions, addTransaction, fetchEnvelopes, loading } = useBudgetStore();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [merchant, setMerchant] = useState('');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));
  const [accountId, setAccountId] = useState<'bank' | string>('bank');

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const merchantSuggestions = useMemo(() => Array.from(new Set(transactions.map((item) => item.merchant?.trim()).filter((item): item is string => Boolean(item)))).slice(0, 4), [transactions]);

  useEffect(() => {
    if (user) fetchEnvelopes(user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setTransactionType = (nextType: 'expense' | 'income') => {
    setType(nextType);
    setCategory(nextType === 'expense' ? 'Food' : 'Salary');
  };

  const selectMerchant = (value: string) => {
    setMerchant(value);
    const previous = transactions.find((item) => item.merchant?.trim().toLowerCase() === value.toLowerCase() && item.kind !== 'transfer');
    if (previous) {
      setCategory(previous.category);
      setType(previous.amount < 0 ? 'income' : 'expense');
    }
  };

  const handleAddTransaction = async () => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Amount needed', 'Please enter a valid amount.');
      return;
    }

    if (!user || !budget) {
      Alert.alert('Budget not ready', 'Please set up your budget first.');
      return;
    }

    try {
      const signedAmount = type === 'income' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      await addTransaction(
        user.id,
        signedAmount,
        category,
        date,
        note || undefined,
        accountId === 'bank' ? null : accountId,
        {
          merchant: merchant || undefined,
          tags: tagList,
        }
      );
      Alert.alert('Saved', type === 'income' ? 'Income logged.' : 'Expense added.');
      setAmount('');
      setMerchant('');
      setTags('');
      setNote('');
      setDate(toDateKey(new Date()));
      setAccountId('bank');
    } catch (err: any) {
      Alert.alert('Could not save', err.message || 'Failed to add transaction.');
    }
  };

  if (!budget) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <View style={[nativeStyles.card, styles.emptyCard]}>
          <Text style={nativeStyles.emptyTitle}>Budget first</Text>
          <Text style={nativeStyles.emptyText}>Set your targets in Settings, then come back to log spending.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={nativeStyles.screen}
    >
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[nativeStyles.content, styles.scrollContent]}>
        <View style={nativeStyles.heroCard}>
          <Text style={nativeStyles.heroEyebrow}>Quick Capture</Text>
          <Text style={nativeStyles.heroTitle}>Add a money move</Text>
          <Text style={nativeStyles.heroText}>Log the amount, merchant, tags, and category while the detail is still fresh.</Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>Type</Text>
          <View style={styles.segmented}>
            {(['expense', 'income'] as const).map((item) => {
              const active = type === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setTransactionType(item)}
                  disabled={loading}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {item === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>Money space</Text>
          <Text style={styles.accountHint}>Choose where this money should be recorded.</Text>
          <View style={styles.accountList}>
            <AccountOption label="Bank balance" balance={budget.bank_balance} currency={budget.currency} selected={accountId === 'bank'} onPress={() => setAccountId('bank')} />
            {envelopes.map((envelope) => <AccountOption key={envelope.id} label={envelope.name} balance={envelope.balance} currency={budget.currency} selected={accountId === envelope.id} onPress={() => setAccountId(envelope.id)} />)}
          </View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>Amount</Text>
          <View style={nativeStyles.inputShell}>
            <Text style={styles.currencyPrefix}>{budget.currency}</Text>
            <TextInput
              style={nativeStyles.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>Category</Text>
          <View style={styles.chipGrid}>
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[nativeStyles.chip, styles.categoryChip, active && nativeStyles.chipActive]}
                  onPress={() => setCategory(cat)}
                  disabled={loading}
                >
                  <Text style={[nativeStyles.chipText, active && nativeStyles.chipTextActive]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>Details</Text>
          <Field value={merchant} onChangeText={setMerchant} placeholder="Merchant, person, or source" editable={!loading} />
          {merchantSuggestions.length > 0 ? <View style={styles.suggestionWrap}><Text style={styles.suggestionLabel}>Recent merchants</Text><View style={styles.suggestionRow}>{merchantSuggestions.map((item) => <Pressable key={item} style={styles.suggestionChip} onPress={() => selectMerchant(item)}><Text style={styles.suggestionText}>{item}</Text></Pressable>)}</View></View> : null}
          <Field value={tags} onChangeText={setTags} placeholder="Tags separated by commas" editable={!loading} />
          <Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" editable={!loading} />
          <TextInput
            style={[styles.textArea]}
            placeholder="Add a note..."
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <Pressable
          style={[nativeStyles.primaryButton, loading && styles.disabledButton]}
          onPress={handleAddTransaction}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={nativeStyles.primaryButtonText}>Save Transaction</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AccountOption({ label, balance, currency, selected, onPress }: { label: string; balance: number; currency: string; selected: boolean; onPress: () => void }) {
  return <Pressable style={[styles.accountOption, selected && styles.accountOptionSelected]} onPress={onPress}><View style={styles.accountCopy}><Text style={styles.accountName}>{label}</Text><Text style={styles.accountBalance}>{formatMoney(balance, currency)} available</Text></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View></Pressable>;
}

function Field({
  value,
  onChangeText,
  placeholder,
  editable,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
}) {
  return (
    <View style={[nativeStyles.inputShell, styles.fieldSpacing]}>
      <TextInput
        style={nativeStyles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 118,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  emptyCard: {
    width: '100%',
  },
  segmented: {
    flexDirection: 'row',
    gap: 10,
    padding: 5,
    borderRadius: 18,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: nativeTheme.navy,
  },
  segmentText: {
    color: nativeTheme.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  currencyPrefix: {
    color: nativeTheme.ink,
    fontSize: 16,
    fontWeight: '900',
    marginRight: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  accountHint: {
    color: nativeTheme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -3,
    marginBottom: 12,
  },
  accountList: { gap: 8 },
  accountOption: {
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    backgroundColor: nativeTheme.surfaceMuted,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountOptionSelected: { borderColor: nativeTheme.primary, backgroundColor: '#e5f3ed' },
  accountCopy: { flex: 1 },
  accountName: { color: nativeTheme.ink, fontSize: 13, fontWeight: '900' },
  accountBalance: { color: nativeTheme.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#93aaa5', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: nativeTheme.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: nativeTheme.primary },
  categoryChip: {
    minWidth: '30%',
    alignItems: 'center',
  },
  fieldSpacing: {
    marginBottom: 10,
  },
  suggestionWrap: { marginTop: -1, marginBottom: 12 },
  suggestionLabel: { color: nativeTheme.subtle, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  suggestionChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#dff1eb' },
  suggestionText: { color: nativeTheme.primary, fontSize: 11, fontWeight: '800' },
  textArea: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    borderRadius: 16,
    backgroundColor: nativeTheme.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: nativeTheme.ink,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
