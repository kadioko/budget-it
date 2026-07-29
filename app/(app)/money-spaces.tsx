import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';
import { formatMoney, nativeStyles, nativeTheme } from '@/ui/nativeTheme';

export default function MoneySpacesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { budget, envelopes, savingsGoals, loading, fetchEnvelopes, fetchSavingsGoals, createEnvelope, addSavingsGoal } = useBudgetStore();
  const [showEnvelopeForm, setShowEnvelopeForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [envelopeName, setEnvelopeName] = useState('');
  const [envelopeBalance, setEnvelopeBalance] = useState('0');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDate, setGoalDate] = useState('');

  useEffect(() => { if (user) { fetchEnvelopes(user.id); fetchSavingsGoals(user.id); } }, [user, fetchEnvelopes, fetchSavingsGoals]);
  if (!budget) return null;
  const currency = budget.currency;

  const addEnvelope = async () => {
    const balance = Number(envelopeBalance);
    if (!user || !envelopeName.trim() || !Number.isFinite(balance) || balance < 0) return Alert.alert('Check this space', 'Give the envelope a name and a valid opening balance.');
    try { await createEnvelope(user.id, envelopeName.trim(), 'wallet', balance, currency); setEnvelopeName(''); setEnvelopeBalance('0'); setShowEnvelopeForm(false); } catch (error: any) { Alert.alert('Could not create envelope', error?.message || 'Try again.'); }
  };
  const addGoal = async () => {
    const target = Number(goalTarget); const current = Number(goalCurrent);
    if (!user || !goalName.trim() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(goalDate)) return Alert.alert('Check this goal', 'Add a name, amounts, and a target date in YYYY-MM-DD format.');
    try { await addSavingsGoal(user.id, goalName.trim(), target, current, goalDate); setGoalName(''); setGoalTarget(''); setGoalCurrent('0'); setGoalDate(''); setShowGoalForm(false); } catch (error: any) { Alert.alert('Could not create goal', error?.message || 'Try again.'); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={nativeStyles.screen}>
    <View style={nativeStyles.orbTop} /><View style={nativeStyles.orbBottom} />
    <ScrollView contentContainerStyle={[nativeStyles.content, styles.content]} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#ffffff" /><Text style={styles.backText}>Back to settings</Text></Pressable>
      <View style={nativeStyles.heroCard}><Text style={nativeStyles.heroEyebrow}>MONEY SPACES</Text><Text style={nativeStyles.heroTitle}>Give every dollar a job.</Text><Text style={nativeStyles.heroText}>Organize money into envelopes, build goals, and move funds without losing the bigger picture.</Text></View>
      <View style={nativeStyles.card}><View style={styles.sectionHead}><View><Text style={nativeStyles.sectionEyebrow}>Accounts</Text><Text style={nativeStyles.sectionTitle}>Your spaces</Text></View><Pressable style={styles.addPill} onPress={() => setShowEnvelopeForm(!showEnvelopeForm)}><Ionicons name="add" size={16} color="#ffffff" /><Text style={styles.addPillText}>Envelope</Text></Pressable></View>
        <View style={styles.bankRow}><View style={styles.iconBox}><Ionicons name="business-outline" size={20} color={nativeTheme.primary} /></View><View style={styles.flex}><Text style={styles.itemTitle}>Bank balance</Text><Text style={styles.itemMeta}>Available to allocate</Text></View><Text style={styles.itemAmount}>{formatMoney(budget.bank_balance, currency)}</Text></View>
        {envelopes.map((item) => <View key={item.id} style={styles.bankRow}><View style={styles.iconBox}><Ionicons name="wallet-outline" size={20} color={nativeTheme.primary} /></View><View style={styles.flex}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.itemMeta}>{item.is_default ? 'Default envelope' : 'Budget space'}</Text></View><Text style={styles.itemAmount}>{formatMoney(item.balance, currency)}</Text></View>)}
        <Pressable style={styles.transferButton} onPress={() => router.push('/(app)/transfer-funds')}><Ionicons name="swap-horizontal" size={18} color={nativeTheme.primary} /><Text style={styles.transferText}>Move money between spaces</Text></Pressable>
        {showEnvelopeForm && <View style={styles.form}><Field value={envelopeName} onChangeText={setEnvelopeName} placeholder="Envelope name" /><Field value={envelopeBalance} onChangeText={setEnvelopeBalance} placeholder="Opening balance" numeric /><Pressable style={nativeStyles.primaryButton} disabled={loading} onPress={addEnvelope}>{loading ? <ActivityIndicator color="#ffffff" /> : <Text style={nativeStyles.primaryButtonText}>Create envelope</Text>}</Pressable></View>}
      </View>
      <View style={nativeStyles.card}><View style={styles.sectionHead}><View><Text style={nativeStyles.sectionEyebrow}>Savings</Text><Text style={nativeStyles.sectionTitle}>Goals in progress</Text></View><Pressable style={styles.addPill} onPress={() => setShowGoalForm(!showGoalForm)}><Ionicons name="add" size={16} color="#ffffff" /><Text style={styles.addPillText}>Goal</Text></Pressable></View>
        {savingsGoals.length === 0 ? <Text style={styles.empty}>Start with one meaningful goal: an emergency fund, travel, school fees, or a major purchase.</Text> : savingsGoals.map((goal) => { const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)); return <View key={goal.id} style={styles.goal}><View style={styles.goalTop}><View><Text style={styles.itemTitle}>{goal.name}</Text><Text style={styles.itemMeta}>Target {goal.target_date}</Text></View><Text style={styles.goalPercent}>{progress}%</Text></View><Text style={styles.goalMoney}>{formatMoney(goal.current_amount, currency)} of {formatMoney(goal.target_amount, currency)}</Text><View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View></View>; })}
        {showGoalForm && <View style={styles.form}><Field value={goalName} onChangeText={setGoalName} placeholder="Goal name" /><Field value={goalTarget} onChangeText={setGoalTarget} placeholder="Target amount" numeric /><Field value={goalCurrent} onChangeText={setGoalCurrent} placeholder="Already saved" numeric /><Field value={goalDate} onChangeText={setGoalDate} placeholder="Target date (YYYY-MM-DD)" /><Pressable style={nativeStyles.primaryButton} disabled={loading} onPress={addGoal}>{loading ? <ActivityIndicator color="#ffffff" /> : <Text style={nativeStyles.primaryButtonText}>Create goal</Text>}</Pressable></View>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field({ value, onChangeText, placeholder, numeric }: { value: string; onChangeText: (text: string) => void; placeholder: string; numeric?: boolean }) { return <View style={styles.field}><TextInput style={nativeStyles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8ca19e" keyboardType={numeric ? 'decimal-pad' : 'default'} /></View>; }

const styles = StyleSheet.create({
  content: { paddingBottom: 50 }, back: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 14, paddingHorizontal: 13, backgroundColor: nativeTheme.navy, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, backText: { color: '#ffffff', fontSize: 12, fontWeight: '900' }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }, addPill: { minHeight: 34, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: nativeTheme.primary }, addPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' }, bankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: nativeTheme.border }, iconBox: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#dff1eb', alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, itemTitle: { color: nativeTheme.ink, fontSize: 14, fontWeight: '900' }, itemMeta: { color: nativeTheme.subtle, fontSize: 11, fontWeight: '700', marginTop: 3 }, itemAmount: { color: nativeTheme.ink, fontSize: 13, fontWeight: '900' }, transferButton: { marginTop: 14, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: nativeTheme.border, backgroundColor: nativeTheme.surfaceMuted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, transferText: { color: nativeTheme.primary, fontSize: 12, fontWeight: '900' }, form: { gap: 9, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: nativeTheme.border }, field: { minHeight: 50, backgroundColor: nativeTheme.surfaceMuted, borderWidth: 1, borderColor: nativeTheme.border, borderRadius: 15, paddingHorizontal: 13 }, empty: { color: nativeTheme.muted, fontSize: 13, lineHeight: 20 }, goal: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: nativeTheme.border }, goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, goalPercent: { color: nativeTheme.primary, fontWeight: '900', fontSize: 13 }, goalMoney: { color: nativeTheme.muted, fontSize: 12, fontWeight: '700', marginTop: 8 }, track: { height: 8, borderRadius: 99, backgroundColor: '#e6f2ee', overflow: 'hidden', marginTop: 9 }, fill: { height: '100%', backgroundColor: nativeTheme.primary, borderRadius: 99 },
});
