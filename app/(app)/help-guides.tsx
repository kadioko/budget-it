import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { nativeStyles, nativeTheme } from '@/ui/nativeTheme';

const guides = [
  { icon: 'rocket-outline', title: 'Get started', body: 'Set a daily target, monthly target, currency, and cycle start day in Settings. Then log your first transaction.' },
  { icon: 'swap-horizontal-outline', title: 'Move money', body: 'Use Move money when cash moves between your bank balance and envelopes. Transfers update balances without inflating spending.' },
  { icon: 'pie-chart-outline', title: 'Read your insights', body: 'Insights follows your real budget-cycle dates, compares the last cycle, and highlights the categories changing most.' },
  { icon: 'pricetags-outline', title: 'Use details well', body: 'Add a merchant and a few tags while logging a transaction. That context makes your history far easier to scan later.' },
  { icon: 'notifications-outline', title: 'Stay ahead', body: 'Turn on overspend, recurring, and weekly-summary preferences in Settings to keep important budget signals in view.' },
];

export default function HelpGuidesScreen() {
  const router = useRouter();
  return (
    <View style={nativeStyles.screen}>
      <View style={nativeStyles.orbTop} /><View style={nativeStyles.orbBottom} />
      <ScrollView contentContainerStyle={[nativeStyles.content, styles.content]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#ffffff" /><Text style={styles.backText}>Back to settings</Text></Pressable>
        <View style={nativeStyles.heroCard}><Text style={nativeStyles.heroEyebrow}>QUICK GUIDES</Text><Text style={nativeStyles.heroTitle}>Questions, answered.</Text><Text style={nativeStyles.heroText}>Short, practical help for the parts of Budget It you will use most.</Text></View>
        {guides.map((guide, index) => <View key={guide.title} style={styles.guideCard}><View style={styles.guideNumber}><Text style={styles.guideNumberText}>{index + 1}</Text></View><View style={styles.guideIcon}><Ionicons name={guide.icon as any} size={22} color={nativeTheme.primary} /></View><View style={styles.guideCopy}><Text style={styles.guideTitle}>{guide.title}</Text><Text style={styles.guideBody}>{guide.body}</Text></View></View>)}
        <View style={styles.tip}><Ionicons name="bulb-outline" size={22} color="#9a6510" /><View style={styles.tipCopy}><Text style={styles.tipTitle}>A useful habit</Text><Text style={styles.tipText}>Open the app for thirty seconds a day. Logging while the detail is fresh gives you better insights than trying to catch up at month end.</Text></View></View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 50 }, backButton: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 14, paddingHorizontal: 13, backgroundColor: nativeTheme.navy, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, backText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  guideCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: nativeTheme.border, borderRadius: 21, padding: 16, marginBottom: 11, flexDirection: 'row', gap: 11, shadowColor: '#0a272e', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 2 }, guideNumber: { width: 23, height: 23, borderRadius: 8, backgroundColor: nativeTheme.navy, alignItems: 'center', justifyContent: 'center' }, guideNumberText: { color: '#ffffff', fontSize: 11, fontWeight: '900' }, guideIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#dff1eb', justifyContent: 'center', alignItems: 'center' }, guideCopy: { flex: 1 }, guideTitle: { color: nativeTheme.ink, fontSize: 15, fontWeight: '900', textTransform: 'capitalize' }, guideBody: { color: nativeTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  tip: { marginTop: 5, borderRadius: 21, padding: 17, backgroundColor: nativeTheme.accentSoft, flexDirection: 'row', gap: 12 }, tipCopy: { flex: 1 }, tipTitle: { color: nativeTheme.ink, fontSize: 14, fontWeight: '900' }, tipText: { color: nativeTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
