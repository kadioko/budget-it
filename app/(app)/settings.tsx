import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'TZS'];

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
  onLogout?: () => Promise<void>;
}

export default function SettingsScreen({ onNavigate, onLogout }: SettingsScreenProps) {
  const { user, signOut } = useAuthStore();
  const { budget, loading, createBudget, updateBudget } = useBudgetStore();

  const [dailyTarget, setDailyTarget] = useState(
    budget?.daily_target.toString() || ''
  );
  const [monthlyTarget, setMonthlyTarget] = useState(
    budget?.monthly_target.toString() || ''
  );
  const [currency, setCurrency] = useState(budget?.currency || 'USD');
  const [monthStartDay, setMonthStartDay] = useState(
    budget?.month_start_day.toString() || '1'
  );

  useEffect(() => {
    if (budget) {
      setDailyTarget(budget.daily_target.toString());
      setMonthlyTarget(budget.monthly_target.toString());
      setCurrency(budget.currency);
      setMonthStartDay(budget.month_start_day.toString());
    }
  }, [budget]);

  const handleSaveBudget = async () => {
    if (!dailyTarget || !monthlyTarget) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      const daily = parseFloat(dailyTarget);
      const monthly = parseFloat(monthlyTarget);
      const day = parseInt(monthStartDay);

      if (daily <= 0 || monthly <= 0 || day < 1 || day > 31) {
        Alert.alert('Error', 'Please enter valid values');
        return;
      }

      if (budget) {
        await updateBudget(budget.id, daily, monthly, currency, day);
        Alert.alert('Success', 'Budget updated');
      } else {
        await createBudget(user.id, daily, monthly, currency, day);
        Alert.alert('Success', 'Budget created');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save budget');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Sign Out',
        onPress: async () => {
          try {
            await signOut();
            onLogout?.();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to sign out');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Settings</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Daily Spending Target</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.currencySymbol}>{currency}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#bdc3c7"
                  value={dailyTarget}
                  onChangeText={setDailyTarget}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Monthly Spending Target</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.currencySymbol}>{currency}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#bdc3c7"
                  value={monthlyTarget}
                  onChangeText={setMonthlyTarget}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Currency</Text>
              <View style={styles.currencyGrid}>
                {CURRENCIES.map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.currencyButton,
                      currency === curr && styles.currencyButtonActive,
                    ]}
                    onPress={() => setCurrency(curr)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.currencyButtonText,
                        currency === curr && styles.currencyButtonTextActive,
                      ]}
                    >
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Month Start Day</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#bdc3c7"
                value={monthStartDay}
                onChangeText={setMonthStartDay}
                keyboardType="number-pad"
                editable={!loading}
              />
              <Text style={styles.helperText}>
                (1 = 1st of month, 15 = 15th of month, etc.)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveBudget}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Budget</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  helperText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 8,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    minWidth: '22%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  currencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emailText: {
    fontSize: 14,
    color: '#2c3e50',
    paddingVertical: 8,
  },
  signOutButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
