import { Icon } from '@rneui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/theme';

interface OTPScreenProps {
  email: string;
}

export function OTPScreen({ email }: OTPScreenProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const { verifyOTP, updatePassword, resetPassword, signInAfterPasswordReset } = useAuth();
  const router = useRouter();
  const inputRefs = useRef<TextInput[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(email, otpString);
      if (result.error) {
        Alert.alert('Error', result.error.message || 'Invalid OTP code');
      } else {
        setShowPasswordForm(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // First update the password
      const updateResult = await updatePassword(newPassword);
      if (updateResult.error) {
        Alert.alert('Error', updateResult.error.message || 'Failed to update password');
        return;
      }

      // Then sign in with the new password to establish a session
      const signInResult = await signInAfterPasswordReset(email, newPassword);
      if (signInResult.error) {
        Alert.alert('Error', signInResult.error.message || 'Failed to sign in with new password');
        return;
      }

      // Success - user is now authenticated and will be redirected automatically
      Alert.alert('Success', 'Password updated successfully. You are now signed in.', [
        {
          text: 'OK',
          onPress: () => router.replace('/'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.error) {
        Alert.alert('Error', result.error.message || 'Failed to resend OTP');
      } else {
        Alert.alert('Success', 'OTP has been resent to your email');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Icon name="arrow-back" type="ionicon" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {showPasswordForm
                ? 'Enter your new password'
                : 'Enter the 6-digit code sent to your email'}
            </Text>
          </View>

          {!showPasswordForm ? (
            <View style={styles.form}>
              <Text style={styles.emailText}>Code sent to: {email}</Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => {
                      if (ref) inputRefs.current[index] = ref;
                    }}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={value => handleOtpChange(value, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    editable={!loading}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={resendOTP} disabled={loading}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                editable={!loading}
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey2,
    marginTop: 8,
    textAlign: 'center',
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
  emailText: {
    fontSize: 14,
    color: theme.colors.grey2,
    textAlign: 'center',
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: theme.colors.grey4,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.grey4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
});
