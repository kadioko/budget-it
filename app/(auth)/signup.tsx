import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { nativeStyles, nativeTheme } from '@/ui/nativeTheme';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your password confirmation.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    try {
      await signUp(email, password);
      Alert.alert('Account created', 'Check your email to verify your account, then sign in.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Signup failed', err.message || 'Could not create your account.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={nativeStyles.screen}
    >
      <View style={nativeStyles.orbTop} />
      <View style={nativeStyles.orbBottom} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[nativeStyles.content, styles.content]}>
        <View style={nativeStyles.heroCard}>
          <Text style={nativeStyles.heroEyebrow}>Start fresh</Text>
          <Text style={nativeStyles.heroTitle}>Create your budget hub.</Text>
          <Text style={nativeStyles.heroText}>
            Your targets, category limits, and transaction history sync securely across devices.
          </Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>New account</Text>
          <Text style={nativeStyles.sectionTitle}>Sign up free</Text>

          <Field value={email} onChangeText={setEmail} placeholder="Email address" editable={!loading} keyboardType="email-address" />
          <Field value={password} onChangeText={setPassword} placeholder="Password" editable={!loading} secureTextEntry />
          <Field value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" editable={!loading} secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[nativeStyles.primaryButton, styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: loading }}
            accessibilityLabel="Create account"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={nativeStyles.primaryButtonText}>Create Account</Text>}
          </Pressable>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.footerLinkButton} accessibilityRole="link" accessibilityLabel="Sign in instead">
            <Text style={styles.footerLink}>Sign in instead</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
  editable,
  secureTextEntry,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={[nativeStyles.inputShell, styles.field]}>
      <TextInput
        style={nativeStyles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        secureTextEntry={secureTextEntry}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  field: {
    marginTop: 14,
  },
  error: {
    color: nativeTheme.danger,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  submitButton: {
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.65,
  },
  footerCard: {
    alignItems: 'center',
    marginTop: 6,
  },
  footerText: {
    color: nativeTheme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  footerLink: {
    color: nativeTheme.primary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
  },
  footerLinkButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
