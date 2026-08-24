import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { toDateKey } from '@/lib/budget-logic';
import { useLocalSearchParams } from 'expo-router';
import { formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';
import { useI18n } from '@/store/language';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

export default function AddTransactionScreen() {
  const { type: requestedType } = useLocalSearchParams<{ type?: 'expense' | 'income' }>();
  const { user } = useAuthStore();
  const { budget, envelopes, transactions, addTransaction, fetchEnvelopes, loading, isOffline } = useBudgetStore();
  const { language, t } = useI18n();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [merchant, setMerchant] = useState('');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));
  const [accountId, setAccountId] = useState<'bank' | string>('bank');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'offline' | 'error'; message: string } | null>(null);
  const locale = language === 'sw' ? 'sw-TZ' : 'en-US';

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

  useEffect(() => {
    if (requestedType === 'expense' || requestedType === 'income') {
      setTransactionType(requestedType);
    }
  // A dashboard quick action intentionally resets the entry type.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedType]);

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
      setFeedback({ tone: 'error', message: t('mobile.transactionForm.validAmount') });
      return;
    }

    if (!user || !budget) {
      setFeedback({ tone: 'error', message: t('mobile.transactionForm.setupBudget') });
      return;
    }

    try {
      setFeedback(null);
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
      setFeedback({
        tone: isOffline ? 'offline' : 'success',
        message: isOffline
          ? t('mobile.transactionForm.savedOffline')
          : type === 'income' ? t('mobile.transactionForm.incomeLogged') : t('mobile.transactionForm.expenseAdded'),
      });
      setAmount('');
      setMerchant('');
      setTags('');
      setNote('');
      setDate(toDateKey(new Date()));
      setAccountId('bank');
    } catch (err: any) {
      setFeedback({ tone: 'error', message: err.message || t('mobile.transactionForm.saveFailed') });
    }
  };

  if (!budget) {
    return (
      <View style={[nativeStyles.screen, styles.centered]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <View style={[nativeStyles.card, styles.emptyCard]}>
          <Text style={nativeStyles.emptyTitle}>{t('mobile.transactionForm.budgetFirst')}</Text>
          <Text style={nativeStyles.emptyText}>{t('mobile.transactionForm.budgetFirstBody')}</Text>
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={[nativeStyles.content, styles.scrollContent]} keyboardShouldPersistTaps="handled">
        <View style={nativeStyles.heroCard}>
          <Text style={nativeStyles.heroEyebrow}>{t('mobile.transactionForm.eyebrow')}</Text>
          <Text style={nativeStyles.heroTitle}>{t('mobile.transactionForm.title')}</Text>
          <Text style={nativeStyles.heroText}>{t('mobile.transactionForm.subtitle')}</Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>{t('mobile.transactionForm.type')}</Text>
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
                    {item === 'expense' ? t('mobile.transactionForm.expense') : t('mobile.transactionForm.income')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>{t('mobile.transactionForm.moneySpace')}</Text>
          <Text style={styles.accountHint}>{t('mobile.transactionForm.moneySpaceHint')}</Text>
          <View style={styles.accountList}>
            <AccountOption label={t('mobile.transactionForm.bankBalance')} balance={budget.bank_balance} currency={budget.currency} locale={locale} availableLabel={t('mobile.transactionForm.available')} selected={accountId === 'bank'} onPress={() => setAccountId('bank')} />
            {envelopes.map((envelope) => <AccountOption key={envelope.id} label={envelope.name} balance={envelope.balance} currency={budget.currency} locale={locale} availableLabel={t('mobile.transactionForm.available')} selected={accountId === envelope.id} onPress={() => setAccountId(envelope.id)} />)}
          </View>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>{t('mobile.transactionForm.amount')}</Text>
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
          <Text style={nativeStyles.label}>{t('mobile.transactionForm.category')}</Text>
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
          <Text style={nativeStyles.label}>{t('mobile.transactionForm.details')}</Text>
          <Field value={merchant} onChangeText={setMerchant} placeholder={t('mobile.transactionForm.merchantPlaceholder')} editable={!loading} />
          {merchantSuggestions.length > 0 ? <View style={styles.suggestionWrap}><Text style={styles.suggestionLabel}>{t('mobile.transactionForm.recentMerchants')}</Text><View style={styles.suggestionRow}>{merchantSuggestions.map((item) => <Pressable key={item} style={styles.suggestionChip} onPress={() => selectMerchant(item)}><Text style={styles.suggestionText}>{item}</Text></Pressable>)}</View></View> : null}
          <Field value={tags} onChangeText={setTags} placeholder={t('mobile.transactionForm.tagsPlaceholder')} editable={!loading} />
          <Field value={date} onChangeText={setDate} placeholder={t('mobile.transactionForm.datePlaceholder')} editable={!loading} />
          <TextInput
            style={[styles.textArea]}
            placeholder={t('mobile.transactionForm.notePlaceholder')}
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

      </ScrollView>
      <View style={styles.stickyAction}>
        {feedback ? (
          <View style={[styles.feedback, feedback.tone === 'error' ? styles.feedbackError : feedback.tone === 'offline' ? styles.feedbackOffline : styles.feedbackSuccess]}>
            <Ionicons name={feedback.tone === 'error' ? 'alert-circle-outline' : feedback.tone === 'offline' ? 'cloud-upload-outline' : 'checkmark-circle-outline'} size={16} color={feedback.tone === 'error' ? nativeTheme.danger : feedback.tone === 'offline' ? nativeTheme.warning : nativeTheme.success} />
            <Text style={[styles.feedbackText, feedback.tone === 'error' ? styles.feedbackErrorText : feedback.tone === 'offline' ? styles.feedbackOfflineText : styles.feedbackSuccessText]}>{feedback.message}</Text>
          </View>
        ) : null}
        <Pressable
          style={[nativeStyles.primaryButton, styles.saveButton, loading && styles.disabledButton]}
          onPress={handleAddTransaction}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={nativeStyles.primaryButtonText}>{type === 'income' ? t('mobile.transactionForm.saveIncome') : t('mobile.transactionForm.saveExpense')}</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function AccountOption({ label, balance, currency, locale, availableLabel, selected, onPress }: { label: string; balance: number; currency: string; locale: string; availableLabel: string; selected: boolean; onPress: () => void }) {
  return <Pressable style={[styles.accountOption, selected && styles.accountOptionSelected]} onPress={onPress}><View style={styles.accountCopy}><Text style={styles.accountName}>{label}</Text><Text style={styles.accountBalance}>{formatMoney(balance, currency, locale)} {availableLabel}</Text></View><View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View></Pressable>;
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
    paddingBottom: 190,
  },
  scrollView: { flex: 1 },
  stickyAction: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 94,
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(246,250,248,0.96)',
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  saveButton: { minHeight: 58 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  feedbackSuccess: { backgroundColor: nativeTheme.successSoft },
  feedbackOffline: { backgroundColor: nativeTheme.warningSoft },
  feedbackError: { backgroundColor: nativeTheme.dangerSoft },
  feedbackText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  feedbackSuccessText: { color: '#0c6a49' },
  feedbackOfflineText: { color: '#7d4c0a' },
  feedbackErrorText: { color: '#b91c1c' },
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
