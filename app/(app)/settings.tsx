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
import { useLanguageStore } from '@/store/language';
import { nativeStyles, nativeTheme } from '@/ui/nativeTheme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'TZS', 'KES', 'CAD', 'AUD', 'JPY'];
const CATEGORY_LIMITS = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const {
    budget,
    categoryBudgets,
    loading,
    createBudget,
    updateBudget,
    saveCategoryBudgets,
  } = useBudgetStore();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const [dailyTarget, setDailyTarget] = useState(budget?.daily_target.toString() || '');
  const [monthlyTarget, setMonthlyTarget] = useState(budget?.monthly_target.toString() || '');
  const [currency, setCurrency] = useState(budget?.currency || 'USD');
  const [monthStartDay, setMonthStartDay] = useState(budget?.month_start_day.toString() || '1');
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (budget) {
      setDailyTarget(budget.daily_target.toString());
      setMonthlyTarget(budget.monthly_target.toString());
      setCurrency(budget.currency);
      setMonthStartDay(budget.month_start_day.toString());
    }
  }, [budget]);

  useEffect(() => {
    const source = budget?.category_budgets && Object.keys(budget.category_budgets).length > 0
      ? budget.category_budgets
      : categoryBudgets;
    setLimitDrafts(
      Object.fromEntries(CATEGORY_LIMITS.map((category) => [category, source?.[category]?.toString() || '']))
    );
  }, [budget?.category_budgets, categoryBudgets]);

  const hasBudget = Boolean(budget);
  const userEmail = user?.email || 'Signed in';
  const selectedLanguageLabel = language === 'sw' ? 'Swahili' : 'English';

  const handleSaveBudget = async () => {
    if (!dailyTarget || !monthlyTarget) {
      Alert.alert('Missing values', 'Please fill in daily and monthly targets.');
      return;
    }

    if (!user) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    try {
      const daily = parseFloat(dailyTarget);
      const monthly = parseFloat(monthlyTarget);
      const day = parseInt(monthStartDay, 10);

      if (daily <= 0 || monthly <= 0 || day < 1 || day > 31) {
        Alert.alert('Check values', 'Targets must be positive and cycle day must be 1 to 31.');
        return;
      }

      if (budget) {
        await updateBudget(budget.id, daily, monthly, currency, day);
        Alert.alert('Saved', 'Budget settings updated.');
      } else {
        await createBudget(user.id, daily, monthly, currency, day);
        Alert.alert('Saved', 'Budget created.');
      }
    } catch (err: any) {
      Alert.alert('Could not save', err.message || 'Failed to save budget.');
    }
  };

  const parsedCategoryLimits = useMemo(() => {
    return Object.fromEntries(
      Object.entries(limitDrafts)
        .map(([category, amount]) => [category, parseFloat(amount)] as const)
        .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
    );
  }, [limitDrafts]);

  const handleSaveCategoryLimits = async () => {
    if (!budget) {
      Alert.alert('Budget needed', 'Create your budget before adding category limits.');
      return;
    }

    try {
      await saveCategoryBudgets(budget.id, parsedCategoryLimits);
      Alert.alert('Saved', 'Category limits synced.');
    } catch (err: any) {
      Alert.alert('Could not save limits', err.message || 'Failed to save category limits.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to leave Budget It?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          try {
            await signOut();
          } catch (err: any) {
            Alert.alert('Could not sign out', err.message || 'Failed to sign out.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={nativeStyles.screen}
    >
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[nativeStyles.content, styles.scrollContent]}>
        <View style={nativeStyles.heroCard}>
          <Text style={nativeStyles.heroEyebrow}>Control Center</Text>
          <Text style={nativeStyles.heroTitle}>Settings</Text>
          <Text style={nativeStyles.heroText}>
            Tune your budget cycle, language, currency, category limits, and account access.
          </Text>
        </View>

        <View style={nativeStyles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={nativeStyles.sectionEyebrow}>Preferences</Text>
              <Text style={nativeStyles.sectionTitle}>Language</Text>
            </View>
            <Text style={styles.subtlePill}>{selectedLanguageLabel}</Text>
          </View>
          <View style={styles.segmented}>
            {(['en', 'sw'] as const).map((item) => {
              const active = language === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setLanguage(item)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {item === 'en' ? 'English' : 'Swahili'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>More native screen translations will continue to fill in as we polish the mobile app.</Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>Budget Targets</Text>
          <Text style={nativeStyles.sectionTitle}>{hasBudget ? 'Update your plan' : 'Create your plan'}</Text>

          <FormField
            label="Daily spending target"
            prefix={currency}
            value={dailyTarget}
            onChangeText={setDailyTarget}
            keyboardType="decimal-pad"
            editable={!loading}
          />
          <FormField
            label="Monthly spending target"
            prefix={currency}
            value={monthlyTarget}
            onChangeText={setMonthlyTarget}
            keyboardType="decimal-pad"
            editable={!loading}
          />
          <FormField
            label="Budget cycle start day"
            value={monthStartDay}
            onChangeText={setMonthStartDay}
            keyboardType="number-pad"
            editable={!loading}
            helper="Use 1 for the 1st, 15 for mid-month cycles, and so on."
          />

          <Text style={[nativeStyles.label, styles.currencyLabel]}>Currency</Text>
          <View style={styles.chipGrid}>
            {CURRENCIES.map((item) => {
              const active = currency === item;
              return (
                <Pressable
                  key={item}
                  style={[nativeStyles.chip, styles.currencyChip, active && nativeStyles.chipActive]}
                  onPress={() => setCurrency(item)}
                  disabled={loading}
                >
                  <Text style={[nativeStyles.chipText, active && nativeStyles.chipTextActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[nativeStyles.primaryButton, styles.saveButton, loading && styles.disabledButton]} onPress={handleSaveBudget} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={nativeStyles.primaryButtonText}>Save Budget</Text>}
          </Pressable>
        </View>

        <View style={nativeStyles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={nativeStyles.sectionEyebrow}>Category Limits</Text>
              <Text style={nativeStyles.sectionTitle}>Monthly guardrails</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            These sync through Supabase and power dashboard warnings across devices.
          </Text>

          {CATEGORY_LIMITS.map((category) => (
            <FormField
              key={category}
              label={category}
              prefix={currency}
              value={limitDrafts[category] || ''}
              onChangeText={(value) => setLimitDrafts((current) => ({ ...current, [category]: value }))}
              keyboardType="decimal-pad"
              editable={!loading && hasBudget}
            />
          ))}

          <Pressable
            style={[nativeStyles.ghostButton, (!hasBudget || loading) && styles.disabledButton]}
            onPress={handleSaveCategoryLimits}
            disabled={!hasBudget || loading}
          >
            <Text style={nativeStyles.ghostButtonText}>Save Category Limits</Text>
          </Pressable>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>Account</Text>
          <Text style={nativeStyles.sectionTitle}>Signed in</Text>
          <Text style={styles.accountEmail}>{userEmail}</Text>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  editable,
  keyboardType,
  prefix,
  helper,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  prefix?: string;
  helper?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={nativeStyles.label}>{label}</Text>
      <View style={nativeStyles.inputShell}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={nativeStyles.input}
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          editable={editable}
        />
      </View>
      {helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 118,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  subtlePill: {
    color: nativeTheme.primary,
    backgroundColor: '#dff1eb',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    fontSize: 12,
    fontWeight: '900',
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
  fieldBlock: {
    marginTop: 15,
  },
  prefix: {
    color: nativeTheme.ink,
    fontSize: 15,
    fontWeight: '900',
    marginRight: 10,
  },
  helperText: {
    color: nativeTheme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  currencyLabel: {
    marginTop: 18,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  currencyChip: {
    minWidth: '22%',
    alignItems: 'center',
  },
  saveButton: {
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.6,
  },
  accountEmail: {
    color: nativeTheme.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 16,
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: nativeTheme.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: nativeTheme.danger,
    fontSize: 14,
    fontWeight: '900',
  },
});
