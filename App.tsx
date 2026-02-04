import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginBottom: 16 }}>Budget It</Text>
      <Text style={{ fontSize: 16, color: '#7f8c8d' }}>Loading app...</Text>
    </View>
  );
}
