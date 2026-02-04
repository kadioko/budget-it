import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuthStore } from './src/store/auth';
import LoginScreen from './app/(auth)/login';
import SignupScreen from './app/(auth)/signup';
import DashboardScreen from './app/(app)/dashboard';
import SettingsScreen from './app/(app)/settings';
import AddTransactionScreen from './app/(app)/add-transaction';
import TransactionsScreen from './app/(app)/transactions';

type AppScreen = 'login' | 'signup' | 'dashboard' | 'settings' | 'add-transaction' | 'transactions';

export default function App() {
  const { user, loading, checkAuth, signOut } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading Budget It...</Text>
      </View>
    );
  }

  const handleNavigate = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentScreen('login');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        {currentScreen === 'login' ? (
          <LoginScreen />
        ) : (
          <SignupScreen />
        )}
        <View style={styles.switchContainer}>
          <TouchableOpacity onPress={() => setCurrentScreen(currentScreen === 'login' ? 'signup' : 'login')}>
            <Text style={styles.switchText}>
              {currentScreen === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentScreen === 'dashboard' && <DashboardScreen onNavigate={handleNavigate} />}
      {currentScreen === 'settings' && <SettingsScreen onNavigate={handleNavigate} onLogout={handleLogout} />}
      {currentScreen === 'add-transaction' && <AddTransactionScreen onNavigate={handleNavigate} />}
      {currentScreen === 'transactions' && <TransactionsScreen onNavigate={handleNavigate} />}
      
      {currentScreen !== 'dashboard' && user && (
        <TouchableOpacity style={styles.backButton} onPress={() => handleNavigate('dashboard')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
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
    marginTop: 16,
  },
  switchContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  switchText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
});
