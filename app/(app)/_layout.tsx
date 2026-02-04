import React from 'react';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';

export default function AppLayout() {
  const tabScreenOptions: BottomTabNavigationOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: '#f5f5f5',
    },
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#2c3e50',
    },
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopColor: '#e0e0e0',
      borderTopWidth: 1,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500',
    },
    tabBarActiveTintColor: '#3498db',
    tabBarInactiveTintColor: '#95a5a6',
  };

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="add-transaction"
        options={{
          title: 'Add Transaction',
          tabBarLabel: 'Add',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarLabel: 'History',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tabs>
  );
}
