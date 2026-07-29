import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBudgetStore } from '@/store/budget';
import { nativeStyles, nativeTheme } from '@/ui/nativeTheme';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction, loading } = useBudgetStore();
  const transaction = useMemo(() => transactions.find((item) => item.id === id), [id, transactions]);
  const [type, setType] = useState<'expense' | 'income'>(transaction && transaction.amount < 0 ? 'income' : 'expense');
  const [amount, setAmount] = useState(transaction ? Math.abs(transaction.amount).toString() : '');
  const [category, setCategory] = useState(transaction?.category || 'Food');
  const [merchant, setMerchant] = useState(transaction?.merchant || '');
  const [tags, setTags] = useState(transaction?.tags?.join(', ') || '');
  const [note, setNote] = useState(transaction?.note || '');
  const [date, setDate] = useState(transaction?.date || '');
  if (!transaction) return null;
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const save = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !date) return Alert.alert('Check the details', 'Add a valid amount and date before saving.');
    try {
      await updateTransaction(transaction.id, type === 'income' ? -Math.abs(parsed) : Math.abs(parsed), category, date, note || undefined, transaction.envelope_id || null, { merchant: merchant || undefined, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) });
      router.back();
    } catch (error: any) { Alert.alert('Could not save changes', error?.message || 'Please try again.'); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={nativeStyles.screen}><View style={nativeStyles.orbTop} /><View style={nativeStyles.orbBottom} /><ScrollView contentContainerStyle={[nativeStyles.content, styles.content]} showsVerticalScrollIndicator={false}>
    <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#ffffff" /><Text style={styles.backText}>Back to history</Text></Pressable>
    <View style={nativeStyles.heroCard}><Text style={nativeStyles.heroEyebrow}>QUICK CORRECTION</Text><Text style={nativeStyles.heroTitle}>Edit money move.</Text><Text style={nativeStyles.heroText}>Fix the details while the context is still fresh. Your budget totals update automatically.</Text></View>
    <View style={nativeStyles.card}><Text style={nativeStyles.label}>Type</Text><View style={styles.segmented}>{(['expense', 'income'] as const).map((item) => <Pressable key={item} style={[styles.segment, type === item && styles.active]} onPress={() => { setType(item); setCategory(item === 'expense' ? 'Food' : 'Salary'); }}><Text style={[styles.segmentText, type === item && styles.activeText]}>{item === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>)}</View>
      <Text style={[nativeStyles.label, styles.topLabel]}>Amount</Text><Field value={amount} onChangeText={setAmount} placeholder="0.00" numeric />
      <Text style={[nativeStyles.label, styles.topLabel]}>Category</Text><View style={styles.chips}>{categories.map((item) => <Pressable key={item} style={[nativeStyles.chip, category === item && nativeStyles.chipActive]} onPress={() => setCategory(item)}><Text style={[nativeStyles.chipText, category === item && nativeStyles.chipTextActive]}>{item}</Text></Pressable>)}</View>
    </View>
    <View style={nativeStyles.card}><Text style={nativeStyles.label}>Details</Text><Field value={merchant} onChangeText={setMerchant} placeholder="Merchant or person" /><Field value={tags} onChangeText={setTags} placeholder="Tags separated by commas" /><Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><View style={styles.note}><TextInput style={[nativeStyles.input, styles.noteInput]} value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor="#8ca19e" multiline /></View></View>
    <Pressable style={[nativeStyles.primaryButton, loading && styles.disabled]} disabled={loading} onPress={save}>{loading ? <ActivityIndicator color="#ffffff" /> : <Text style={nativeStyles.primaryButtonText}>Save changes</Text>}</Pressable>
  </ScrollView></KeyboardAvoidingView>;
}

function Field({ value, onChangeText, placeholder, numeric }: { value: string; onChangeText: (text: string) => void; placeholder: string; numeric?: boolean }) { return <View style={styles.field}><TextInput style={nativeStyles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8ca19e" keyboardType={numeric ? 'decimal-pad' : 'default'} /></View>; }

const styles = StyleSheet.create({ content: { paddingBottom: 50 }, back: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 14, paddingHorizontal: 13, backgroundColor: nativeTheme.navy, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, backText: { color: '#ffffff', fontSize: 12, fontWeight: '900' }, segmented: { flexDirection: 'row', padding: 5, backgroundColor: nativeTheme.surfaceMuted, borderRadius: 17, borderWidth: 1, borderColor: nativeTheme.border, gap: 8 }, segment: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, active: { backgroundColor: nativeTheme.navy }, segmentText: { color: nativeTheme.muted, fontSize: 13, fontWeight: '900' }, activeText: { color: '#ffffff' }, topLabel: { marginTop: 18 }, field: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: nativeTheme.border, backgroundColor: nativeTheme.surfaceMuted, paddingHorizontal: 13, marginBottom: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, note: { minHeight: 100, borderRadius: 15, borderWidth: 1, borderColor: nativeTheme.border, backgroundColor: nativeTheme.surfaceMuted, paddingHorizontal: 13 }, noteInput: { textAlignVertical: 'top' }, disabled: { opacity: 0.65 } });
