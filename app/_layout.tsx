import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { nativeStyles } from '@/ui/nativeTheme';

export default function RootLayout() {
  const { loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={[nativeStyles.screen, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={nativeStyles.orbTop} />
        <View style={nativeStyles.orbBottom} />
        <View style={[nativeStyles.heroCard, { width: '100%', alignItems: 'center' }]}>
          <Text style={nativeStyles.heroEyebrow}>Budget It</Text>
          <Text style={[nativeStyles.heroTitle, { fontSize: 26 }]}>Getting your money ready</Text>
          <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 22 }} />
          <Text style={[nativeStyles.heroText, { textAlign: 'center' }]}>Syncing your budget, limits, and recent activity.</Text>
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
