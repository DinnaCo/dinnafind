import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch } from '@/store';
import { loginSuccess, logoutSuccess } from '@/store/slices/authSlice';
import { setBucketListItems } from '@/store/slices/bucketListSlice';
import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import GeofencingService from '@/services/GeofencingService';
import { SupabaseDataService } from '@/services/supabaseDataService';
import type { User, Session } from '@supabase/supabase-js';
// This is needed for OAuth redirects
WebBrowser.maybeCompleteAuthSession();

// Get Supabase URL from environment or fallback
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kskhzgbwvryiqemzaoye.supabase.co';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  signInAfterPasswordReset: (email: string, password: string) => Promise<{ error: any }>;
  createUserProfileIfNeeded: (user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log('[AuthContext] Initializing authentication provider...');

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] Checking for existing session...');
      setSession(session);
      setUser(session?.user ?? null);

      // Dispatch Redux action based on session state
      if (session?.user) {
        console.log('[AuthContext] Found existing session for user:', session.user.id);
        console.log('[AuthContext] Session user metadata:', session.user.user_metadata);
        console.log(
          '[AuthContext] Avatar URL from metadata:',
          session.user.user_metadata?.avatar_url
        );
        console.log('[AuthContext] Picture from metadata:', session.user.user_metadata?.picture);

        const photoUrl =
          session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;

        const userProfile = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.full_name || session.user.email || '',
          photoUrl: photoUrl || undefined,
          createdAt: session.user.created_at ? new Date(session.user.created_at).getTime() : 0,
          lastLogin: Date.now(),
        };

        console.log('[AuthContext] Created userProfile:', userProfile);

        // Store user profile in Supabase (only for confirmed users)
        if (session.user.email_confirmed_at) {
          const tryUserProfileCreation = async () => {
            try {
              console.log('[AuthContext] Creating user profile for confirmed user...');
              const success = await SupabaseDataService.upsertUserProfile(userProfile);
              if (success) {
                console.log('[AuthContext] User profile stored in Supabase successfully');
              } else {
                console.log(
                  '[AuthContext] Failed to store user profile in Supabase - this is non-critical'
                );
              }
            } catch (error) {
              console.log('[AuthContext] Error storing user profile (non-critical):', error);
            }
          };

          // try user profile creation asynchronously (don't await it)
          tryUserProfileCreation();
        } else {
          console.log('[AuthContext] Skipping user profile creation - email not confirmed yet');
        }

        console.log('[AuthContext] Dispatching loginSuccess action...');
        dispatch(loginSuccess(userProfile));
        setIsAuthenticated(true);
        console.log('[AuthContext] User authenticated successfully');
      } else {
        console.log('[AuthContext] No existing session found');
        dispatch(logoutSuccess());
        setIsAuthenticated(false);
      }

      setLoading(false);
      console.log('[AuthContext] Initial session check complete');
    });

    // Listen for auth changes
    console.log('[AuthContext] Setting up auth state change listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', event, 'User ID:', session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      // Dispatch Redux action based on auth state change
      if (session?.user) {
        console.log('[AuthContext] Processing authenticated user:', session.user.id);
        console.log('[AuthContext] Session user metadata:', session.user.user_metadata);
        console.log(
          '[AuthContext] Avatar URL from metadata:',
          session.user.user_metadata?.avatar_url
        );
        console.log('[AuthContext] Picture from metadata:', session.user.user_metadata?.picture);

        const photoUrl =
          session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;

        const userProfile = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.full_name || session.user.email || '',
          photoUrl: photoUrl || undefined,
          createdAt: session.user.created_at ? new Date(session.user.created_at).getTime() : 0,
          lastLogin: Date.now(),
        };

        console.log('[AuthContext] Created userProfile:', userProfile);

        // Store user profile in Supabase (only for confirmed users)
        if (session.user.email_confirmed_at) {
          const tryUserProfileCreation = async () => {
            try {
              console.log('[AuthContext] Creating user profile for confirmed user...');
              const success = await SupabaseDataService.upsertUserProfile(userProfile);
              if (success) {
                console.log('[AuthContext] User profile stored in Supabase successfully');
              } else {
                console.log(
                  '[AuthContext] Failed to store user profile in Supabase - this is non-critical'
                );
              }
            } catch (error) {
              console.log('[AuthContext] Error storing user profile (non-critical):', error);
            }
          };

          // try user profile creation asynchronously (don't await it)
          tryUserProfileCreation();
        } else {
          console.log('[AuthContext] Skipping user profile creation - email not confirmed yet');
        }

        console.log('[AuthContext] Dispatching loginSuccess action...');
        dispatch(loginSuccess(userProfile));
        setIsAuthenticated(true);
        console.log('[AuthContext] User authenticated successfully');
      } else {
        console.log('[AuthContext] Processing logout/unauthorized state');
        dispatch(logoutSuccess());
        setIsAuthenticated(false);
        console.log('[AuthContext] User logged out successfully');
      }

      setLoading(false);
      console.log('[AuthContext] Auth state change processing complete');
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth state change listener...');
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  const signUp = async (email: string, password: string) => {
    console.log('[AuthContext] Starting signup process for email:', email);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Signup error:', error);
        return { error };
      }

      console.log('[AuthContext] Signup successful, user created');
      return { error: null };
    } catch (error: any) {
      console.error('[AuthContext] Signup exception:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Starting signin process for email:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Signin error:', error);
      } else {
        console.log('[AuthContext] Signin successful');
      }

      return { error };
    } catch (error: any) {
      console.error('[AuthContext] Signin exception:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] Starting Google signin process');
    try {
      if (Platform.OS === 'web') {
        console.log('[AuthContext] Using web Google signin');
        // Web implementation
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error) {
          console.error('[AuthContext] Web Google signin error:', error);
        } else {
          console.log('[AuthContext] Web Google signin initiated successfully');
        }

        return { error };
      } else {
        console.log('[AuthContext] Using mobile Google signin');
        // Mobile implementation
        const redirectUrl = makeRedirectUri({
          scheme: 'dinnafind',
          path: 'auth-callback',
        });

        console.log('[AuthContext] Redirect URL:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          console.error('[AuthContext] Mobile Google signin error:', error);
          throw error;
        }

        if (!data?.url) {
          console.error('[AuthContext] No auth URL received from Google signin');
          throw new Error('No auth URL received');
        }

        console.log('[AuthContext] Opening auth session for Google signin');
        // For standalone apps, use openAuthSessionAsync
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        console.log('[AuthContext] Auth session result:', res.type);

        if (res.type === 'success') {
          console.log('[AuthContext] Google signin successful');
          // The deep link handler will process the authentication
          return { error: null };
        } else if (res.type === 'cancel') {
          console.log('[AuthContext] Google signin cancelled by user');
          return { error: { message: 'Authentication was cancelled' } };
        }

        console.error('[AuthContext] Google signin failed');
        return { error: { message: 'Authentication failed' } };
      }
    } catch (error: any) {
      console.error('[AuthContext] Google signin exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Starting signout process');
    try {
      await supabase.auth.signOut();
      console.log('[AuthContext] Supabase signout successful');

      await GeofencingService.clearAllGeofences();
      console.log('[AuthContext] Geofences cleared successfully');

 
      // Clear bucket list data on logout
      dispatch(setBucketListItems([]));
      console.log('[AuthContext] Bucket list cleared successfully');

 
      console.log('[AuthContext] Signout process complete');
    } catch (error) {
      console.error('[AuthContext] Signout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    console.log('[AuthContext] Starting password reset for email:', email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${supabaseUrl}/auth/callback`,
      });

      if (error) {
        console.error('[AuthContext] Password reset error:', error);
      } else {
        console.log('[AuthContext] Password reset email sent successfully');
      }

      return { error };
    } catch (error: any) {
      console.error('[AuthContext] Password reset exception:', error);
      return { error };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    console.log('[AuthContext] Starting OTP verification for email:', email);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (error) {
        console.error('[AuthContext] OTP verification error:', error);
      } else {
        console.log('[AuthContext] OTP verification successful');
      }

      return { error };
    } catch (error: any) {
      console.error('[AuthContext] OTP verification exception:', error);
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    console.log('[AuthContext] Starting password update');
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('[AuthContext] Password update error:', error);
      } else {
        console.log('[AuthContext] Password update successful');
      }

      return { error };
    } catch (error: any) {
      console.error('[AuthContext] Password update exception:', error);
      return { error };
    }
  };

  const signInAfterPasswordReset = async (email: string, password: string) => {
    console.log('[AuthContext] Starting signin after password reset for email:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Signin after password reset error:', error);
      } else {
        console.log('[AuthContext] Signin after password reset successful');
      }

      return { error };
    } catch (error: any) {
      console.error('[AuthContext] Signin after password reset exception:', error);
      return { error };
    }
  };

  // Method to handle delayed user profile creation
  const createUserProfileIfNeeded = async (user: User) => {
    console.log('[AuthContext] Checking if user profile needs to be created for user:', user.id);

    try {
      // Only create profile if user is confirmed
      if (!user.email_confirmed_at) {
        console.log('[AuthContext] User email not confirmed, skipping profile creation');
        return;
      }

      const userProfile = {
        id: user.id,
        email: user.email || '',
        displayName: user.user_metadata?.full_name || user.email || '',
        photoUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined,
        createdAt: user.created_at ? new Date(user.created_at).getTime() : 0,
        lastLogin: Date.now(),
      };

      console.log('[AuthContext] Creating user profile for confirmed user:', userProfile);
      const success = await SupabaseDataService.upsertUserProfile(userProfile);

      if (success) {
        console.log('[AuthContext] User profile created successfully');
      } else {
        console.log('[AuthContext] Failed to create user profile - will retry later');
      }
    } catch (error) {
      console.error('[AuthContext] Error in createUserProfileIfNeeded:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        verifyOTP,
        updatePassword,
        signInAfterPasswordReset,
        createUserProfileIfNeeded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
