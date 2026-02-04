import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/store/auth';
import LoginScreen from '../app/(auth)/login';
import DashboardScreen from '../app/(app)/dashboard';

export default function WebApp() {
  const { user, loading, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Budget It...</Text>
      </View>
    );
  }

  return user ? <DashboardScreen /> : <LoginScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#2c3e50',
  },
});
