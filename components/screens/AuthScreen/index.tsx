import { Icon } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/services/GoogleAuthNoSession';
import { theme } from '@/theme';
import { SpinningButton } from '@/components/common/SpinningButton';
import { useAppInitialization } from '@/hooks/useAppInitialization';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const { signIn, signUp, user, isAuthenticated } = useAuth();
  const { isInitializing } = useAppInitialization();
  const router = useRouter();

  const logo = require('@/assets/images/splash-icon.png');

  // Add debug log

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [router, user]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setEmailLoading(true);
    try {
      const result =
        mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);

      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else if (mode === 'signUp') {
        Alert.alert('Success!', 'Please check your email to verify your account.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        Alert.alert('Sign In Failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>DinnaFind</Text>
            <Text style={styles.subtitle}>
              {mode === 'signIn' ? 'Welcome back!' : 'Create your account'}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!emailLoading && !googleLoading && !(isAuthenticated && isInitializing)}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!emailLoading && !googleLoading && !(isAuthenticated && isInitializing)}
            />

            <SpinningButton
              title={mode === 'signIn' ? 'Sign In' : 'Sign Up'}
              onPress={handleSubmit}
              loading={emailLoading || (isAuthenticated && isInitializing)}
              disabled={googleLoading}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <SpinningButton
              title="Continue with Google"
              onPress={handleGoogleSignIn}
              loading={googleLoading || (isAuthenticated && isInitializing)}
              disabled={emailLoading}
              variant="google"
              icon={{ name: 'google', type: 'fontisto', size: 20, color: 'white' }}
            />

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              disabled={emailLoading || googleLoading || (isAuthenticated && isInitializing)}
            >
              <Text style={styles.switchModeText}>
                {mode === 'signIn'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            {mode === 'signIn' && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/password-reset')}
                disabled={emailLoading || googleLoading || (isAuthenticated && isInitializing)}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.grey5,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.grey2,
    marginTop: 8,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.grey4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  // Button styles moved to SpinningButton component
  switchMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
  forgotPassword: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.grey4,
  },
  dividerText: {
    marginHorizontal: 12,
    color: theme.colors.grey2,
    fontSize: 14,
  },
  // Google button styles moved to SpinningButton component
  debugButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugLog: {
    fontSize: 11,
    marginVertical: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
  },
  checkSessionButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
  },
  devNote: {
    marginTop: 12,
    fontSize: 12,
    color: theme.colors.grey2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
