import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { budget, stats, loading, fetchBudget, fetchTransactions } =
    useBudgetStore();

  useEffect(() => {
    if (user) {
      fetchBudget(user.id);
      fetchTransactions(user.id);
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!budget) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Budget Set</Text>
          <Text style={styles.emptyText}>
            Let's set up your daily and monthly spending targets to get started.
          </Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => {
              console.log('Set Up Budget button pressed');
              Alert.alert('Budget Setup', 'Please go to Settings to set up your budget targets.');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.setupButtonText}>Set Up Budget</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  const getDailyMessage = () => {
    if (stats.isOverDailyBudget) {
      const overspend = stats.spentToday - budget.daily_target;
      return {
        text: `Over by ${overspend.toFixed(2)} ${budget.currency}`,
        color: '#e74c3c',
        bgColor: '#fadbd8',
      };
    }
    const remaining = stats.dailyRemaining;
    return {
      text: `Under by ${remaining.toFixed(2)} ${budget.currency}`,
      color: '#27ae60',
      bgColor: '#d5f4e6',
    };
  };

  const getMonthlyMessage = () => {
    if (stats.isOverMonthlyBudget) {
      const overspend = stats.spentMonthToDate - budget.monthly_target;
      return {
        text: `Over by ${overspend.toFixed(2)} ${budget.currency}`,
        color: '#e74c3c',
        bgColor: '#fadbd8',
      };
    }
    const remaining = stats.monthlyRemaining;
    return {
      text: `Under by ${remaining.toFixed(2)} ${budget.currency}`,
      color: '#27ae60',
      bgColor: '#d5f4e6',
    };
  };

  const dailyMsg = getDailyMessage();
  const monthlyMsg = getMonthlyMessage();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Spending</Text>
          <Text style={styles.amount}>
            {stats.spentToday.toFixed(2)} {budget.currency}
          </Text>
          <Text style={styles.target}>
            Target: {budget.daily_target.toFixed(2)} {budget.currency}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: dailyMsg.bgColor },
            ]}
          >
            <Text style={[styles.statusText, { color: dailyMsg.color }]}>
              {dailyMsg.text}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Month to Date</Text>
          <Text style={styles.amount}>
            {stats.spentMonthToDate.toFixed(2)} {budget.currency}
          </Text>
          <Text style={styles.target}>
            Target: {budget.monthly_target.toFixed(2)} {budget.currency}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: monthlyMsg.bgColor },
            ]}
          >
            <Text style={[styles.statusText, { color: monthlyMsg.color }]}>
              {monthlyMsg.text}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Projected End of Month</Text>
          <Text style={styles.amount}>
            {stats.projectedMonthEnd.toFixed(2)} {budget.currency}
          </Text>
          <Text style={styles.target}>
            Budget: {budget.monthly_target.toFixed(2)} {budget.currency}
          </Text>
          {stats.projectedMonthEnd > budget.monthly_target ? (
            <View style={[styles.statusBadge, { backgroundColor: '#fadbd8' }]}>
              <Text style={[styles.statusText, { color: '#e74c3c' }]}>
                Projected over budget
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: '#d5f4e6' }]}>
              <Text style={[styles.statusText, { color: '#27ae60' }]}>
                On track
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streak</Text>
          <Text style={styles.streakNumber}>{stats.streak}</Text>
          <Text style={styles.streakLabel}>
            {stats.streak === 1 ? 'day' : 'days'} under budget
          </Text>
          {stats.streak >= 7 && (
            <Text style={styles.praise}>🔥 Great job keeping it up!</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  target: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 12,
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
  },
  praise: {
    fontSize: 14,
    color: '#f39c12',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  setupButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
