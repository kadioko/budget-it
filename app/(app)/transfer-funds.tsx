import React, { useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { toDateKey } from '@/lib/budget-logic';
import { formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';

type AccountOption = { id: 'bank' | string; name: string; balance: number; icon: string };

export default function TransferFundsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { budget, envelopes, createTransfer, loading } = useBudgetStore();
  const accounts = useMemo<AccountOption[]>(
    () => [
      { id: 'bank', name: 'Bank balance', balance: budget?.bank_balance || 0, icon: 'business-outline' },
      ...envelopes.map((envelope) => ({ id: envelope.id, name: envelope.name, balance: envelope.balance, icon: 'wallet-outline' })),
    ],
    [budget?.bank_balance, envelopes]
  );
  const [fromAccountId, setFromAccountId] = useState<'bank' | string>('bank');
  const [toAccountId, setToAccountId] = useState<'bank' | string>(envelopes[0]?.id || 'bank');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const moveDirection = () => {
    const source = accounts.find((account) => account.id === fromAccountId)?.name || 'source';
    const target = accounts.find((account) => account.id === toAccountId)?.name || 'destination';
    return `${source} to ${target}`;
  };

  const submitTransfer = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Amount needed', 'Enter an amount greater than zero.');
      return;
    }
    if (fromAccountId === toAccountId) {
      Alert.alert('Choose two accounts', 'Pick a different destination for this transfer.');
      return;
    }
    if (!user || !budget) return;

    try {
      await createTransfer(user.id, parsedAmount, fromAccountId, toAccountId, toDateKey(new Date()), note || undefined);
      Alert.alert('Money moved', `${formatMoney(parsedAmount, budget.currency)} moved from ${moveDirection()}.`);
      router.back();
    } catch (error: any) {
      Alert.alert('Transfer could not be completed', error?.message || 'Try again when you are online.');
    }
  };

  if (!budget) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={nativeStyles.screen}>
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <ScrollView contentContainerStyle={[nativeStyles.content, styles.content]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerLabel}>ENVELOPE TRANSFER</Text>
        </View>

        <View style={nativeStyles.heroCard}>
          <Text style={nativeStyles.heroTitle}>Move money with purpose.</Text>
          <Text style={nativeStyles.heroText}>Transfers update account balances without being counted as spending.</Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>From</Text>
          <AccountPicker accounts={accounts} selectedId={fromAccountId} onSelect={setFromAccountId} currency={budget.currency} />

          <View style={styles.swapLine}>
            <View style={styles.line} />
            <View style={styles.swapIcon}><Ionicons name="swap-vertical" size={18} color={nativeTheme.primary} /></View>
            <View style={styles.line} />
          </View>

          <Text style={nativeStyles.sectionEyebrow}>To</Text>
          <AccountPicker accounts={accounts} selectedId={toAccountId} onSelect={setToAccountId} currency={budget.currency} />
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.label}>Amount</Text>
          <View style={nativeStyles.inputShell}>
            <Text style={styles.currency}>{budget.currency}</Text>
            <TextInput
              style={nativeStyles.input}
              placeholder="0.00"
              placeholderTextColor="#8ca19e"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <Text style={[nativeStyles.label, styles.noteLabel]}>Note (optional)</Text>
          <View style={nativeStyles.inputShell}>
            <TextInput style={nativeStyles.input} placeholder="What is this move for?" placeholderTextColor="#8ca19e" value={note} onChangeText={setNote} />
          </View>
        </View>

      </ScrollView>
      <View style={styles.stickyAction}>
        <Pressable style={[nativeStyles.primaryButton, styles.saveButton, loading && styles.disabled]} onPress={submitTransfer} disabled={loading} accessibilityRole="button" accessibilityState={{ busy: loading, disabled: loading }} accessibilityLabel="Move money">
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={nativeStyles.primaryButtonText}>Move money</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function AccountPicker({ accounts, selectedId, onSelect, currency }: { accounts: AccountOption[]; selectedId: string; onSelect: (id: string) => void; currency: string }) {
  return (
    <View style={styles.accountList}>
      {accounts.map((account) => {
        const active = account.id === selectedId;
        return (
          <Pressable key={account.id} style={[styles.accountRow, active && styles.accountRowActive]} onPress={() => onSelect(account.id)} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${account.name}, ${formatMoney(account.balance, currency)} available`}>
            <View style={[styles.accountIcon, active && styles.accountIconActive]}><Ionicons name={account.icon as any} size={19} color={active ? '#ffffff' : nativeTheme.primary} /></View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountBalance}>{formatMoney(account.balance, currency)} available</Text>
            </View>
            <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={21} color={active ? nativeTheme.primary : '#93aaa5'} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 156 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: nativeTheme.navy, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: nativeTheme.primary, fontWeight: '900', letterSpacing: 1, fontSize: 11 },
  accountList: { gap: 8, marginTop: 8 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: nativeTheme.border, borderRadius: 17, backgroundColor: nativeTheme.surfaceMuted },
  accountRowActive: { borderColor: nativeTheme.primary, backgroundColor: '#e5f3ed' },
  accountIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#d7eee5', alignItems: 'center', justifyContent: 'center' },
  accountIconActive: { backgroundColor: nativeTheme.primary },
  accountCopy: { flex: 1 },
  accountName: { color: nativeTheme.ink, fontSize: 14, fontWeight: '900' },
  accountBalance: { color: nativeTheme.muted, fontSize: 12, marginTop: 3, fontWeight: '700' },
  swapLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: nativeTheme.border },
  swapIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: nativeTheme.accentSoft, alignItems: 'center', justifyContent: 'center' },
  currency: { color: nativeTheme.primary, fontWeight: '900', marginRight: 10 },
  noteLabel: { marginTop: 16 },
  stickyAction: { position: 'absolute', left: 18, right: 18, bottom: 94, padding: 8, borderRadius: 24, backgroundColor: 'rgba(246,250,248,0.96)', borderWidth: 1, borderColor: nativeTheme.border },
  saveButton: { minHeight: 58 },
  disabled: { opacity: 0.65 },
});
