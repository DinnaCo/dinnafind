import { supabase } from '@/utils/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

// This ensures the browser dismisses properly after auth
WebBrowser.maybeCompleteAuthSession();

export const signInWithGoogle = async () => {
  try {
    // Create redirect URI that works for both Expo Go and standalone builds
    const isExpoGo = Constants.appOwnership === 'expo';
    const redirectUrl = isExpoGo
      ? AuthSession.makeRedirectUri()
      : AuthSession.makeRedirectUri({ scheme: 'dinnafind', path: 'auth-callback' });

    // Request OAuth URL from Supabase
    const response = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
          scope: 'openid email profile',
        },
        skipBrowserRedirect: true,
      },
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    if (!response.data?.url) {
      return {
        success: false,
        error:
          'No authentication URL received. Please ensure Google OAuth is configured in Supabase.',
      };
    }

    // Open auth session
    const authSession = await WebBrowser.openAuthSessionAsync(response.data.url, redirectUrl, {
      showInRecents: true,
    });

    if (authSession.type === 'success' && authSession.url) {
      const url = authSession.url;
      // Try modern PKCE code exchange first (query param ?code=...)
      const query = url.split('?')[1] || '';
      const queryParams = new URLSearchParams(query);
      const code = queryParams.get('code');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          return { success: false, error: error.message };
        }
        if (data?.session) {
          return { success: true, user: data.session.user };
        }
      }

      // Fallback: implicit grant tokens in hash fragment
      if (url.includes('#')) {
        const fragment = url.split('#')[1];
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) return { success: false, error: error.message };
          if (data?.session) return { success: true, user: data.session.user };
        }
      }

      // As last resort, small delay then ask client for session
      await new Promise(resolve => setTimeout(resolve, 1500));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return { success: true, user: session.user };
      return {
        success: false,
        error: 'Authentication completed but no session was created. Please try again.',
      };
    } else if (authSession.type === 'cancel') {
      return { success: false, error: 'Authentication was cancelled' };
    } else {
      return { success: false, error: 'Authentication failed' };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
};

// Sign out function
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign out failed',
    };
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    return null;
  }
};
