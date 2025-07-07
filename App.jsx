import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24 }}>🚀 Solo AuthContext</Text>
      </View>
    </AuthProvider>
  );
}
