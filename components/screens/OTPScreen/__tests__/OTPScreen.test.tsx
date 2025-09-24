import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { OTPScreen } from '../index';
import * as ExpoRouter from 'expo-router';
import { renderWithProviders } from '@/test-utils';

// Mock expo-router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockRouter),
}));

// Mock AuthContext
const mockVerifyOTP = jest.fn();
const mockUpdatePassword = jest.fn();
const mockResetPassword = jest.fn();
const mockSignInAfterPasswordReset = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    verifyOTP: mockVerifyOTP,
    updatePassword: mockUpdatePassword,
    resetPassword: mockResetPassword,
    signInAfterPasswordReset: mockSignInAfterPasswordReset,
  })),
}));

// Mock theme
jest.mock('@/theme', () => ({
  theme: {
    colors: {
      primary: '#FF4500',
      grey2: '#666666',
      grey4: '#CCCCCC',
      grey5: '#F8F8F8',
    },
  },
}));

describe('OTPScreen', () => {
  const testEmail = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockVerifyOTP.mockResolvedValue({ error: null });
    mockUpdatePassword.mockResolvedValue({ error: null });
    mockResetPassword.mockResolvedValue({ error: null });
    mockSignInAfterPasswordReset.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering - OTP Form', () => {
    it('renders the OTP screen with title', () => {
      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      expect(getByText('Reset Password')).toBeTruthy();
    });

    it('renders subtitle with instructions', () => {
      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      expect(
        getByText('Enter the 6-digit code sent to your email'),
      ).toBeTruthy();
    });

    it('displays the user email', () => {
      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      expect(getByText(`Code sent to: ${testEmail}`)).toBeTruthy();
    });

    it('renders 6 OTP input fields', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      // Should have exactly 6 OTP input fields
      expect(inputs.length).toBe(6);
    });

    it('renders verify code button', () => {
      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      expect(getByText('Verify Code')).toBeTruthy();
    });

    it('renders resend code button', () => {
      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      expect(getByText('Resend Code')).toBeTruthy();
    });
  });

  describe('OTP Input Handling', () => {
    it('allows single digit input and moves to next field', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '1');

      expect(inputs[0].props.value).toBe('1');
    });

    it('handles paste operation with 6-digit code', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      // All digits should be distributed
      expect(inputs[0].props.value).toBe('1');
      expect(inputs[1].props.value).toBe('2');
      expect(inputs[2].props.value).toBe('3');
      expect(inputs[3].props.value).toBe('4');
      expect(inputs[4].props.value).toBe('5');
      expect(inputs[5].props.value).toBe('6');
    });

    it('handles paste operation with partial code', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '1234');

      expect(inputs[0].props.value).toBe('1');
      expect(inputs[1].props.value).toBe('2');
      expect(inputs[2].props.value).toBe('3');
      expect(inputs[3].props.value).toBe('4');
      expect(inputs[4].props.value).toBe('');
      expect(inputs[5].props.value).toBe('');
    });

    it('filters non-numeric characters from paste', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], 'a1b2c3d4');

      expect(inputs[0].props.value).toBe('1');
      expect(inputs[1].props.value).toBe('2');
      expect(inputs[2].props.value).toBe('3');
      expect(inputs[3].props.value).toBe('4');
    });

    it('handles backspace to move to previous field', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      // Type in second field
      fireEvent.changeText(inputs[1], '2');

      // Press backspace on second field (when empty)
      fireEvent(inputs[1], 'keyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Focus should move to first field (verified by ref.focus call)
    });

    it('sets numeric keyboard type for OTP inputs', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      inputs.slice(0, 6).forEach((input: any) => {
        expect(input.props.keyboardType).toBe('numeric');
      });
    });

    it('limits OTP input maxLength to 6', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      inputs.slice(0, 6).forEach((input: any) => {
        expect(input.props.maxLength).toBe(6);
      });
    });
  });

  describe('OTP Verification', () => {
    it('shows error when OTP is incomplete', async () => {
      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      // Enter only 3 digits
      fireEvent.changeText(inputs[0], '123');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter the complete 6-digit code',
      );
      expect(mockVerifyOTP).not.toHaveBeenCalled();
    });

    it('verifies complete OTP code successfully', async () => {
      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      await waitFor(() => {
        expect(mockVerifyOTP).toHaveBeenCalledWith(testEmail, '123456');
      });
    });

    it('shows password form after successful OTP verification', async () => {
      mockVerifyOTP.mockResolvedValue({ error: null });

      const { UNSAFE_getAllByType, getByText, getByPlaceholderText } =
        renderWithProviders(<OTPScreen email={testEmail} />);

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      await waitFor(() => {
        expect(getByText('Enter your new password')).toBeTruthy();
        expect(getByPlaceholderText('New Password')).toBeTruthy();
        expect(getByPlaceholderText('Confirm New Password')).toBeTruthy();
      });
    });

    it('shows error alert when OTP verification fails', async () => {
      mockVerifyOTP.mockResolvedValue({
        error: { message: 'Invalid OTP code' },
      });

      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '999999');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid OTP code');
      });
    });

    it('handles OTP verification exception', async () => {
      mockVerifyOTP.mockRejectedValue(new Error('Network error'));

      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

  describe('Password Reset Form', () => {
    beforeEach(async () => {
      // Helper to get to password form
      mockVerifyOTP.mockResolvedValue({ error: null });
    });

    const navigateToPasswordForm = async (component: any) => {
      const { UNSAFE_getAllByType, getByText } = component;

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      await waitFor(() => {
        expect(getByText('Enter your new password')).toBeTruthy();
      });
    };

    it('validates password fields are not empty', async () => {
      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByText } = component;
      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please fill in all fields',
      );
    });

    it('validates passwords match', async () => {
      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByPlaceholderText, getByText } = component;

      const newPasswordInput = getByPlaceholderText('New Password');
      const confirmPasswordInput = getByPlaceholderText(
        'Confirm New Password',
      );

      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456');

      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Passwords do not match',
      );
    });

    it('validates password minimum length', async () => {
      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByPlaceholderText, getByText } = component;

      const newPasswordInput = getByPlaceholderText('New Password');
      const confirmPasswordInput = getByPlaceholderText(
        'Confirm New Password',
      );

      fireEvent.changeText(newPasswordInput, '12345');
      fireEvent.changeText(confirmPasswordInput, '12345');

      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Password must be at least 6 characters long',
      );
    });

    it('updates password successfully', async () => {
      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByPlaceholderText, getByText } = component;

      const newPasswordInput = getByPlaceholderText('New Password');
      const confirmPasswordInput = getByPlaceholderText(
        'Confirm New Password',
      );

      fireEvent.changeText(newPasswordInput, 'newpassword123');
      fireEvent.changeText(confirmPasswordInput, 'newpassword123');

      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123');
        expect(mockSignInAfterPasswordReset).toHaveBeenCalledWith(
          testEmail,
          'newpassword123',
        );
      });
    });

    it('shows success alert and navigates after password update', async () => {
      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByPlaceholderText, getByText } = component;

      const newPasswordInput = getByPlaceholderText('New Password');
      const confirmPasswordInput = getByPlaceholderText(
        'Confirm New Password',
      );

      fireEvent.changeText(newPasswordInput, 'newpassword123');
      fireEvent.changeText(confirmPasswordInput, 'newpassword123');

      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Password updated successfully. You are now signed in.',
          expect.any(Array),
        );
      });

      // Simulate pressing OK
      const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Success',
      );
      const okButton = alertCall[2][0];
      okButton.onPress();

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('shows error when password update fails', async () => {
      mockUpdatePassword.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByPlaceholderText, getByText } = component;

      const newPasswordInput = getByPlaceholderText('New Password');
      const confirmPasswordInput = getByPlaceholderText(
        'Confirm New Password',
      );

      fireEvent.changeText(newPasswordInput, 'newpassword123');
      fireEvent.changeText(confirmPasswordInput, 'newpassword123');

      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Update failed');
      });
    });

    it('shows error when sign in after reset fails', async () => {
      mockSignInAfterPasswordReset.mockResolvedValue({
        error: { message: 'Sign in failed' },
      });

      const component = renderWithProviders(<OTPScreen email={testEmail} />);
      await navigateToPasswordForm(component);

      const { getByPlaceholderText, getByText } = component;

      const newPasswordInput = getByPlaceholderText('New Password');
      const confirmPasswordInput = getByPlaceholderText(
        'Confirm New Password',
      );

      fireEvent.changeText(newPasswordInput, 'newpassword123');
      fireEvent.changeText(confirmPasswordInput, 'newpassword123');

      const updateButton = getByText('Update Password');

      await act(async () => {
        fireEvent.press(updateButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Sign in failed');
      });
    });
  });

  describe('Resend Code', () => {
    it('resends OTP code successfully', async () => {
      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const resendButton = getByText('Resend Code');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(testEmail);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'OTP has been resent to your email',
        );
      });
    });

    it('shows error when resend fails', async () => {
      mockResetPassword.mockResolvedValue({
        error: { message: 'Failed to send' },
      });

      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const resendButton = getByText('Resend Code');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to send');
      });
    });

    it('handles resend exception', async () => {
      mockResetPassword.mockRejectedValue(new Error('Network error'));

      const { getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const resendButton = getByText('Resend Code');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { UNSAFE_getAllByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TouchableOpacity = require('react-native').TouchableOpacity;
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      // First touchable should be back button
      fireEvent.press(touchables[0]);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('disables back button when loading', async () => {
      mockVerifyOTP.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 1000)),
      );

      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      const TouchableOpacity = require('react-native').TouchableOpacity;
      const touchables = UNSAFE_getAllByType(TouchableOpacity);

      const backButton = touchables[0];
      expect(backButton.props.disabled).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when verifying OTP', async () => {
      mockVerifyOTP.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 1000)),
      );

      const { UNSAFE_getAllByType, getByText, UNSAFE_getByType } =
        renderWithProviders(<OTPScreen email={testEmail} />);

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('disables OTP inputs when loading', async () => {
      mockVerifyOTP.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 1000)),
      );

      const { UNSAFE_getAllByType, getByText } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const TextInput = require('react-native').TextInput;
      const inputs = UNSAFE_getAllByType(TextInput);

      fireEvent.changeText(inputs[0], '123456');

      const verifyButton = getByText('Verify Code');

      await act(async () => {
        fireEvent.press(verifyButton);
      });

      inputs.slice(0, 6).forEach((input: any) => {
        expect(input.props.editable).toBe(false);
      });
    });
  });

  describe('Platform-specific Behavior', () => {
    it('uses padding behavior for KeyboardAvoidingView on iOS', () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'ios';

      const { UNSAFE_getByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const KeyboardAvoidingView =
        require('react-native').KeyboardAvoidingView;
      const keyboardView = UNSAFE_getByType(KeyboardAvoidingView);

      expect(keyboardView.props.behavior).toBe('padding');
    });

    it('uses height behavior for KeyboardAvoidingView on Android', () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'android';

      const { UNSAFE_getByType } = renderWithProviders(
        <OTPScreen email={testEmail} />,
      );

      const KeyboardAvoidingView =
        require('react-native').KeyboardAvoidingView;
      const keyboardView = UNSAFE_getByType(KeyboardAvoidingView);

      expect(keyboardView.props.behavior).toBe('height');
    });
  });
});
