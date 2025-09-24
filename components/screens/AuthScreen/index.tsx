import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
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
import { useThemeColors } from '@/hooks/useThemeColors';
import { SpinningButton } from '@/components/common/SpinningButton';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import {
  requestOnboardingPermissions,
  hasRequestedOnboardingPermissions,
} from '@/services/PermissionsService';
import { logger } from '@/utils/logger';

export function AuthScreen() {
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const {
    signIn,
    signUp,
    signInWithApple,
    user,
    isAuthenticated,
    createUserProfileIfNeeded,
  } = useAuth();
  const { isInitializing } = useAppInitialization();
  const router = useRouter();

  const logo = require('@/assets/images/splash-icon.png');

  logger.info(
    `[AuthScreen] Rendering with mode: ${mode}, isAuthenticated: ${isAuthenticated}, user: ${JSON.stringify(user, null, 2)}`,
  );

  const handleSubmit = async () => {
    logger.info(
      `[AuthScreen] Form submitted with mode: ${mode}, email: ${email}`,
    );

    if (!email || !password) {
      logger.info('[AuthScreen] Form validation failed - missing fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setEmailLoading(true);
    logger.info('[AuthScreen] Starting authentication process...');

    try {
      const result =
        mode === 'signIn'
          ? await signIn(email, password)
          : await signUp(email, password);

      logger.info('[AuthScreen] Authentication result:', result);

      if (result.error) {
        logger.info('[AuthScreen] Authentication error:', result.error.message);
        Alert.alert('Error', result.error.message || 'An error occurred');
      } else if (mode === 'signUp') {
        logger.info(
          '[AuthScreen] Signup successful, account created',
        );
        Alert.alert(
          'Success!',
          'Your account has been created! You can now sign in.',
        );
      } else {
        logger.info('[AuthScreen] Signin successful');
      }
    } catch (error: any) {
      logger.error('[AuthScreen] Authentication exception:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setEmailLoading(false);
      logger.info('[AuthScreen] Authentication process complete');
    }
  };

  const handleGoogleSignIn = async () => {
    logger.info('[AuthScreen] Google signin initiated');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      logger.info('[AuthScreen] Google signin result:', result);

      if (!result.success) {
        logger.info('[AuthScreen] Google signin failed:', result.error);
        Alert.alert('Sign In Failed', result.error || 'Unknown error');
      } else {
        logger.info('[AuthScreen] Google signin successful');
      }
    } catch (error: any) {
      logger.error('[AuthScreen] Google signin exception:', error);
      Alert.alert('Error', error.message);
    } finally {
      setGoogleLoading(false);
      logger.info('[AuthScreen] Google signin process complete');
    }
  };

  const handleAppleSignIn = async () => {
    logger.info('[AuthScreen] Apple signin initiated');
    setAppleLoading(true);
    try {
      const result = await signInWithApple();
      logger.info('[AuthScreen] Apple signin result:', result);

      if (result.error) {
        logger.info('[AuthScreen] Apple signin failed:', result.error);
        Alert.alert('Sign In Failed', result.error);
      } else {
        logger.info('[AuthScreen] Apple signin successful');
      }
    } catch (error: any) {
      logger.error('[AuthScreen] Apple signin exception:', error);
      Alert.alert('Error', error.message);
    } finally {
      setAppleLoading(false);
      logger.info('[AuthScreen] Apple signin process complete');
    }
  };

  const handleModeSwitch = () => {
    const newMode = mode === 'signIn' ? 'signUp' : 'signIn';
    logger.info(`[AuthScreen] Switching mode from ${mode} to ${newMode}`);
    setMode(newMode);
  };

  // Method to handle email confirmation and user profile creation
  const handleEmailConfirmation = async () => {
    logger.info('[AuthScreen] Handling email confirmation...');
    try {
      // Check if user is authenticated and confirmed
      if (user && user.email_confirmed_at) {
        logger.info(
          '[AuthScreen] User email confirmed, creating user profile...',
        );
        await createUserProfileIfNeeded(user);
      }
    } catch (error) {
      logger.error('[AuthScreen] Error handling email confirmation:', error);
    }
  };

  // Check for email confirmation on mount and when user changes
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      logger.info(
        '[AuthScreen] User email confirmed, triggering profile creation...',
      );
      handleEmailConfirmation();
    }
  }, [user]);

  // Request permissions during onboarding (after first authentication)
  useEffect(() => {
    const requestPermissionsIfNeeded = async () => {
      if (isAuthenticated && user) {
        // Check if we've already requested permissions during onboarding
        const alreadyRequested = await hasRequestedOnboardingPermissions();

        if (!alreadyRequested) {
          logger.info('[AuthScreen] First time authentication, requesting permissions...');

          // Small delay to let the UI settle after authentication
          setTimeout(async () => {
            const granted = await requestOnboardingPermissions();
            logger.info('[AuthScreen] Onboarding permissions result:', { granted });
          }, 1000);
        } else {
          logger.info('[AuthScreen] Onboarding permissions already requested, skipping');
        }
      }
    };

    requestPermissionsIfNeeded();
  }, [isAuthenticated, user]);

  const styles = createStyles(colors);

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
              placeholderTextColor={colors.grey3}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={
                !emailLoading &&
                !googleLoading &&
                !appleLoading &&
                !(isAuthenticated && isInitializing)
              }
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.grey3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={
                !emailLoading &&
                !googleLoading &&
                !appleLoading &&
                !(isAuthenticated && isInitializing)
              }
              accessibilityLabel="Password"
              accessibilityHint="Enter your password"
            />

            <SpinningButton
              title={mode === 'signIn' ? 'Sign In' : 'Sign Up'}
              onPress={handleSubmit}
              loading={emailLoading || (isAuthenticated && isInitializing)}
              disabled={googleLoading || appleLoading}
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
              disabled={emailLoading || appleLoading}
              variant="google"
              icon={{
                name: 'google',
                type: 'fontisto',
                size: 20,
              }}
            />

            {Platform.OS === 'ios' && (
              <SpinningButton
                title="Continue with Apple"
                onPress={handleAppleSignIn}
                loading={appleLoading || (isAuthenticated && isInitializing)}
                disabled={emailLoading || googleLoading}
                variant="apple"
                icon={{
                  name: 'apple',
                  type: 'fontisto',
                  size: 20,
                }}
              />
            )}

            <TouchableOpacity
              style={styles.switchMode}
              onPress={handleModeSwitch}
              disabled={
                emailLoading ||
                googleLoading ||
                appleLoading ||
                (isAuthenticated && isInitializing)
              }
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? "Switch to sign up" : "Switch to sign in"}
              accessibilityHint={mode === 'signIn' ? "Double tap to create a new account" : "Double tap to sign in to existing account"}
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
                disabled={
                  emailLoading ||
                  googleLoading ||
                  (isAuthenticated && isInitializing)
                }
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
                accessibilityHint="Double tap to reset your password"
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey5,
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
    color: colors.primary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: colors.grey2,
    marginTop: 8,
  },
  form: {
    backgroundColor: colors.background,
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
    borderColor: colors.grey4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  // Button styles moved to SpinningButton component
  switchMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 16,
  },
  forgotPassword: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: colors.primary,
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
    backgroundColor: colors.grey4,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.grey2,
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
    color: colors.grey2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
