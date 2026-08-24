import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';
import { BottomTabNavigationOptions } from 'expo-router/js-tabs';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { nativeTheme } from '@/ui/nativeTheme';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budget';

export default function AppLayout() {
  const { user } = useAuthStore();
  const { processRecurringTransactions } = useBudgetStore();

  React.useEffect(() => {
    if (user) void processRecurringTransactions(user.id);
  }, [processRecurringTransactions, user]);

  if (!user) return <Redirect href="/(auth)/login" />;

  const tabScreenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 12,
      height: 80,
      paddingTop: 8,
      paddingBottom: 9,
      backgroundColor: nativeTheme.navy,
      borderTopColor: '#1f5960',
      borderTopWidth: 1,
      borderRadius: 26,
      shadowColor: '#052026',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 12,
    },
    tabBarItemStyle: {
      borderRadius: 16,
      paddingHorizontal: 1,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '800',
      marginTop: 2,
      letterSpacing: 0.1,
    },
    tabBarActiveTintColor: '#ffffff',
    tabBarInactiveTintColor: '#9bb6b5',
  };

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="add-transaction"
        options={{
          title: 'Add Money Move',
          tabBarLabel: 'Add',
          tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'pulse' : 'pulse-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen name="transfer-funds" options={{ href: null }} />
      <Tabs.Screen name="help-guides" options={{ href: null }} />
      <Tabs.Screen name="money-spaces" options={{ href: null }} />
      <Tabs.Screen name="edit-transaction" options={{ href: null }} />
      <Tabs.Screen name="alerts" options={{ href: null }} />
      <Tabs.Screen name="routines" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ name, color, focused }: { name: React.ComponentProps<typeof Ionicons>['name']; color: ColorValue; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

function AddTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.addTabIcon, focused && styles.addTabIconActive]}>
      <Ionicons name="add" size={25} color={nativeTheme.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 34,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: '#1b4b52',
  },
  addTabIcon: {
    width: 52,
    height: 52,
    marginTop: -28,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nativeTheme.accent,
    borderWidth: 5,
    borderColor: nativeTheme.background,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 10,
  },
  addTabIconActive: {
    backgroundColor: '#fff4d6',
  },
});
