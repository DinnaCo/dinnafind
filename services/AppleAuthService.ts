import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

// Helper function to retry network requests
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isNetworkError =
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('fetch') ||
        error.code === 'NETWORK_ERROR';

      if (i === maxRetries - 1 || !isNetworkError) {
        throw error;
      }

      logger.warn(`[AppleAuth] Network error, retrying (${i + 1}/${maxRetries})...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

export const signInWithApple = async () => {
  try {
    logger.info('[AppleAuth] Starting Apple Sign In process...');
    logger.info('[AppleAuth] Supabase URL configured:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
    logger.info('[AppleAuth] Supabase Key configured:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      logger.warn('[AppleAuth] Apple Sign In is not available on this device');
      return { success: false, error: 'Apple Sign In is not available on this device' };
    }

    logger.info('[AppleAuth] Requesting Apple ID credential...');

    // Request Apple ID credential
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    logger.info('[AppleAuth] Apple credential received:', {
      user: credential.user,
      email: credential.email,
      fullName: credential.fullName,
      hasIdentityToken: !!credential.identityToken,
    });

    if (!credential.identityToken) {
      logger.error('[AppleAuth] No identity token received from Apple');
      return { success: false, error: 'No identity token received from Apple' };
    }

    logger.info('[AppleAuth] Signing in to Supabase with Apple credential...');
    logger.info('[AppleAuth] Token length:', credential.identityToken.length);

    // Sign in to Supabase with Apple credential using ID token with retry logic
    const { data, error } = await retryWithBackoff(async () => {
      return await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      });
    });

    if (error) {
      logger.error('[AppleAuth] Supabase Apple sign in error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });

      // Provide more helpful error messages
      if (error.message?.toLowerCase().includes('network')) {
        return {
          success: false,
          error: 'Network error - please check your internet connection and try again'
        };
      }

      if (error.status === 400) {
        return {
          success: false,
          error: 'Invalid credentials - Apple Sign In may not be configured properly in Supabase'
        };
      }

      return { success: false, error: error.message };
    }

    if (data?.user) {
      logger.info('[AppleAuth] Apple sign in successful:', data.user.id);
      return { success: true, user: data.user };
    }

    logger.error('[AppleAuth] No user data received from Supabase');
    return { success: false, error: 'Authentication failed - no user data received' };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      logger.info('[AppleAuth] Apple sign in was cancelled by user');
      return { success: false, error: 'Sign in was cancelled' };
    }

    logger.error('[AppleAuth] Apple sign in error:', {
      message: error.message,
      code: error.code,
      name: error.name,
    });

    // Provide more specific error messages
    if (error.message?.toLowerCase().includes('network')) {
      return {
        success: false,
        error: 'Network connection failed - please check your internet and try again'
      };
    }

    return {
      success: false,
      error: error.message || 'Apple Sign In failed'
    };
  }
};

// Check if Apple Sign In is available (for conditional rendering)
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error('[AppleAuth] Error checking Apple Sign In availability:', error);
    return false;
  }
};
