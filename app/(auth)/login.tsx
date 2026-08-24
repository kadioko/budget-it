import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { nativeStyles, nativeTheme } from '@/ui/nativeTheme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle, resetPasswordForEmail, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    try {
      await signIn(email, password);
    } catch (err: any) {
      Alert.alert('Login failed', err.message || 'Check your credentials and try again.');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Email needed', 'Enter your email first, then tap reset password again.');
      return;
    }

    try {
      await resetPasswordForEmail(email);
      Alert.alert('Check your email', 'We sent password reset instructions if this email is registered.');
    } catch (err: any) {
      Alert.alert('Reset failed', err.message || 'Could not send password reset instructions.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google sign-in failed', err.message || 'Please try again.');
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
          <View style={styles.brandRow}>
            <Image source={require('../../assets/icon.png')} style={styles.brandLogo} />
            <Text style={nativeStyles.heroEyebrow}>BUDGET IT</Text>
          </View>
          <Text style={nativeStyles.heroTitle}>Budget with clarity.</Text>
          <Text style={nativeStyles.heroText}>
            Sign in to track balances, category limits, safe daily spend, and your latest money moves.
          </Text>
        </View>

        <View style={nativeStyles.card}>
          <Text style={nativeStyles.sectionEyebrow}>Welcome back</Text>
          <Text style={nativeStyles.sectionTitle}>Sign in</Text>

          <Field
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            keyboardType="email-address"
            secureTextEntry={false}
            editable={!loading}
          />
          <Field
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[nativeStyles.primaryButton, styles.submitButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: loading }}
            accessibilityLabel="Sign in"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={nativeStyles.primaryButtonText}>Sign In</Text>}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading} accessibilityRole="button" accessibilityState={{ disabled: loading }} accessibilityLabel="Continue with Google">
            <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
            <Ionicons name="arrow-forward" size={18} color={nativeTheme.primary} />
          </Pressable>

          <Pressable style={styles.textButton} onPress={handleResetPassword} disabled={loading} accessibilityRole="button" accessibilityState={{ disabled: loading }} accessibilityLabel="Reset forgotten password">
            <Text style={styles.textButtonLabel}>Forgot password?</Text>
          </Pressable>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>New to Budget It?</Text>
          <Pressable onPress={() => router.push('/(auth)/signup')} style={styles.footerLinkButton} accessibilityRole="link" accessibilityLabel="Create an account">
            <Text style={styles.footerLink}>Create an account</Text>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 3,
  },
  brandLogo: {
    width: 27,
    height: 27,
    borderRadius: 8,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: nativeTheme.border,
  },
  dividerText: {
    color: nativeTheme.subtle,
    fontSize: 11,
    fontWeight: '800',
  },
  googleButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: nativeTheme.surfaceMuted,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  googleMark: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: nativeTheme.border,
  },
  googleMarkText: {
    color: '#4285f4',
    fontSize: 14,
    fontWeight: '900',
  },
  googleButtonText: {
    flex: 1,
    color: nativeTheme.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  textButtonLabel: {
    color: nativeTheme.primary,
    fontSize: 13,
    fontWeight: '900',
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
