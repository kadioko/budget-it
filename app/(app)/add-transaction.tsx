import React, { useState } from 'react';
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
import { nativeStyles, nativeTheme } from '@/ui/nativeTheme';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

export default function AddTransactionScreen() {
  const { user } = useAuthStore();
  const { budget, addTransaction, loading } = useBudgetStore();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [merchant, setMerchant] = useState('');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const setTransactionType = (nextType: 'expense' | 'income') => {
    setType(nextType);
    setCategory(nextType === 'expense' ? 'Food' : 'Salary');
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
        undefined,
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
  categoryChip: {
    minWidth: '30%',
    alignItems: 'center',
  },
  fieldSpacing: {
    marginBottom: 10,
  },
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
