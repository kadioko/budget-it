import React from 'react';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { nativeTheme } from '@/ui/nativeTheme';

export default function AppLayout() {
  const tabScreenOptions: BottomTabNavigationOptions = {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: nativeTheme.background,
    },
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: '900',
      color: nativeTheme.ink,
    },
    tabBarStyle: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 14,
      height: 72,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: '#ffffff',
      borderTopColor: 'transparent',
      borderTopWidth: 1,
      borderRadius: 24,
      shadowColor: nativeTheme.navy,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.13,
      shadowRadius: 22,
      elevation: 10,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '800',
    },
    tabBarActiveTintColor: nativeTheme.primary,
    tabBarInactiveTintColor: nativeTheme.subtle,
  };

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900', fontSize: 16 }}>B</Text>,
        }}
      />
      <Tabs.Screen
        name="add-transaction"
        options={{
          title: 'Add Money Move',
          tabBarLabel: 'Add',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900', fontSize: 18 }}>+</Text>,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900', fontSize: 16 }}>L</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontWeight: '900', fontSize: 16 }}>S</Text>,
        }}
      />
    </Tabs>
  );
}
