import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabNavigationOptions } from 'expo-router/js-tabs';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { nativeTheme } from '@/ui/nativeTheme';

export default function AppLayout() {
  const tabScreenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarStyle: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 14,
      height: 76,
      paddingTop: 10,
      paddingBottom: 11,
      backgroundColor: nativeTheme.navy,
      borderTopColor: 'transparent',
      borderTopWidth: 1,
      borderRadius: 24,
      shadowColor: '#052026',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 22,
      elevation: 10,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '800',
    },
    tabBarActiveTintColor: '#ffffff',
    tabBarInactiveTintColor: '#90aaa9',
  };

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />,
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
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={21} color={color} />,
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

function AddTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.addTabIcon, focused && styles.addTabIconActive]}>
      <Ionicons name="add" size={25} color={nativeTheme.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  addTabIcon: {
    width: 48,
    height: 48,
    marginTop: -26,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nativeTheme.accent,
    borderWidth: 4,
    borderColor: nativeTheme.background,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  addTabIconActive: {
    backgroundColor: '#ffffff',
  },
});
