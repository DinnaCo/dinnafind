import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch } from '@/store';
import { loginSuccess, logoutSuccess } from '@/store/slices/authSlice';
import { setBucketListItems } from '@/store/slices/bucketListSlice';
import { setMasterNotificationsEnabled, setDistanceMiles } from '@/store/slices/uiSlice';
import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import GeofencingService from '@/services/GeofencingService';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { signInWithApple } from '@/services/AppleAuthService';
import type { User, Session } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
// This is needed for OAuth redirects
WebBrowser.maybeCompleteAuthSession();

// Get Supabase URL from environment or fallback
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://kskhzgbwvryiqemzaoye.supabase.co';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  signInAfterPasswordReset: (
    email: string,
    password: string,
  ) => Promise<{ error: any }>;
  createUserProfileIfNeeded: (user: User) => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    logger.info('[AuthContext] Initializing authentication provider...');

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.info('[AuthContext] Checking for existing session...');
      setSession(session);
      setUser(session?.user ?? null);

      // Dispatch Redux action based on session state
      if (session?.user) {
        logger.info(
          '[AuthContext] Found existing session for user:',
          session.user.id,
        );
        logger.info(
          '[AuthContext] Session user metadata:',
          session.user.user_metadata,
        );
        logger.info(
          '[AuthContext] Avatar URL from metadata:',
          session.user.user_metadata?.avatar_url,
        );
        logger.info(
          '[AuthContext] Picture from metadata:',
          session.user.user_metadata?.picture,
        );

        const photoUrl =
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture;

        const userProfile = {
          id: session.user.id,
          email: session.user.email || '',
          displayName:
            session.user.user_metadata?.full_name || session.user.email || '',
          photoUrl: photoUrl || undefined,
          createdAt: session.user.created_at
            ? new Date(session.user.created_at).getTime()
            : 0,
          lastLogin: Date.now(),
        };

        logger.info('[AuthContext] Created userProfile:', userProfile);

        // Store user profile in Supabase (only for confirmed users)
        if (session.user.email_confirmed_at) {
          const tryUserProfileCreation = async () => {
            try {
              logger.info(
                '[AuthContext] Creating user profile for confirmed user...',
              );
              const success =
                await SupabaseDataService.upsertUserProfile(userProfile);
              if (success) {
                logger.info(
                  '[AuthContext] User profile stored in Supabase successfully',
                );
              } else {
                logger.info(
                  '[AuthContext] Failed to store user profile in Supabase - this is non-critical',
                );
              }
            } catch (error) {
              logger.info(
                '[AuthContext] Error storing user profile (non-critical):',
                error,
              );
            }
          };

          // try user profile creation asynchronously (don't await it)
          tryUserProfileCreation();
        } else {
          logger.info(
            '[AuthContext] Skipping user profile creation - email not confirmed yet',
          );
        }

        logger.info('[AuthContext] Dispatching loginSuccess action...');
        dispatch(loginSuccess(userProfile));
        setIsAuthenticated(true);
        logger.info('[AuthContext] User authenticated successfully');
      } else {
        logger.info('[AuthContext] No existing session found');
        dispatch(logoutSuccess());
        setIsAuthenticated(false);
      }

      setLoading(false);
      logger.info('[AuthContext] Initial session check complete');
    });

    // Listen for auth changes
    logger.info('[AuthContext] Setting up auth state change listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info(
        `[AuthContext] Auth state changed: ${event}, User ID: ${session?.user?.id}`,
      );

      setSession(session);
      setUser(session?.user ?? null);

      // Dispatch Redux action based on auth state change
      if (session?.user) {
        logger.info(
          '[AuthContext] Processing authenticated user:',
          session.user.id,
        );
        logger.info(
          '[AuthContext] Session user metadata:',
          session.user.user_metadata,
        );
        logger.info(
          '[AuthContext] Avatar URL from metadata:',
          session.user.user_metadata?.avatar_url,
        );
        logger.info(
          '[AuthContext] Picture from metadata:',
          session.user.user_metadata?.picture,
        );

        const photoUrl =
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture;

        const userProfile = {
          id: session.user.id,
          email: session.user.email || '',
          displayName:
            session.user.user_metadata?.full_name || session.user.email || '',
          photoUrl: photoUrl || undefined,
          createdAt: session.user.created_at
            ? new Date(session.user.created_at).getTime()
            : 0,
          lastLogin: Date.now(),
        };

        logger.info('[AuthContext] Created userProfile:', userProfile);

        // Store user profile in Supabase (only for confirmed users)
        if (session.user.email_confirmed_at) {
          const tryUserProfileCreation = async () => {
            try {
              logger.info(
                '[AuthContext] Creating user profile for confirmed user...',
              );
              const success =
                await SupabaseDataService.upsertUserProfile(userProfile);
              if (success) {
                logger.info(
                  '[AuthContext] User profile stored in Supabase successfully',
                );
              } else {
                logger.info(
                  '[AuthContext] Failed to store user profile in Supabase - this is non-critical',
                );
              }
            } catch (error) {
              logger.info(
                '[AuthContext] Error storing user profile (non-critical):',
                error,
              );
            }
          };

          // try user profile creation asynchronously (don't await it)
          tryUserProfileCreation();
        } else {
          logger.info(
            '[AuthContext] Skipping user profile creation - email not confirmed yet',
          );
        }

        logger.info('[AuthContext] Dispatching loginSuccess action...');
        dispatch(loginSuccess(userProfile));
        setIsAuthenticated(true);
        logger.info('[AuthContext] User authenticated successfully');
      } else {
        logger.info('[AuthContext] Processing logout/unauthorized state');
        dispatch(logoutSuccess());
        setIsAuthenticated(false);
        logger.info('[AuthContext] User logged out successfully');
      }

      setLoading(false);
      logger.info('[AuthContext] Auth state change processing complete');
    });

    return () => {
      logger.info('[AuthContext] Cleaning up auth state change listener...');
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  const signUp = async (email: string, password: string) => {
    logger.info('[AuthContext] Starting signup process for email:', email);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        logger.error('[AuthContext] Signup error:', error);
        return { error };
      }

      logger.info('[AuthContext] Signup successful, user created');
      return { error: null };
    } catch (error: any) {
      logger.error('[AuthContext] Signup exception:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    logger.info('[AuthContext] Starting signin process for email:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('[AuthContext] Signin error:', error);
      } else {
        logger.info('[AuthContext] Signin successful');
      }

      return { error };
    } catch (error: any) {
      logger.error('[AuthContext] Signin exception:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    logger.info('[AuthContext] Starting Google signin process');
    try {
      if (Platform.OS === 'web') {
        logger.info('[AuthContext] Using web Google signin');
        // Web implementation
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'dinnafind://auth-callback', // Use app scheme instead of window.location.origin
          },
        });

        if (error) {
          logger.error('[AuthContext] Web Google signin error:', error);
        } else {
          logger.info('[AuthContext] Web Google signin initiated successfully');
        }

        return { error };
      } else {
        logger.info('[AuthContext] Using mobile Google signin');
        // Mobile implementation
        const redirectUrl = makeRedirectUri({
          scheme: 'dinnafind',
          path: 'auth-callback',
        });

        logger.info('[AuthContext] Redirect URL:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          logger.error('[AuthContext] Mobile Google signin error:', error);
          throw error;
        }

        if (!data?.url) {
          logger.error('[AuthContext] No auth URL received from Google signin');
          throw new Error('No auth URL received');
        }

        logger.info('[AuthContext] Opening auth session for Google signin');
        // For standalone apps, use openAuthSessionAsync
        const res = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        logger.info('[AuthContext] Auth session result:', res.type);

        if (res.type === 'success') {
          logger.info('[AuthContext] Google signin successful');
          // The deep link handler will process the authentication
          return { error: null };
        } else if (res.type === 'cancel') {
          logger.info('[AuthContext] Google signin cancelled by user');
          return { error: { message: 'Authentication was cancelled' } };
        }

        logger.error('[AuthContext] Google signin failed');
        return { error: { message: 'Authentication failed' } };
      }
    } catch (error: any) {
      logger.error('[AuthContext] Google signin exception:', error);
      return { error };
    }
  };

  const signInWithAppleHandler = async () => {
    logger.info('[AuthContext] Starting Apple signin process');
    try {
      const result = await signInWithApple();

      if (result.error) {
        logger.error('[AuthContext] Apple signin error:', result.error);
        return { error: result.error };
      }

      logger.info('[AuthContext] Apple signin successful');
      return { error: null };
    } catch (error: any) {
      logger.error('[AuthContext] Apple signin exception:', error);
      return { error: error.message || 'Apple Sign In failed' };
    }
  };

  const signOut = async () => {
    logger.info('[AuthContext] Starting signout process');
    try {
      await supabase.auth.signOut();
      logger.info('[AuthContext] Supabase signout successful');

      await GeofencingService.clearAllGeofences();
      logger.info('[AuthContext] Geofences cleared successfully');

      // Clear bucket list data on logout
      dispatch(setBucketListItems([]));
      logger.info('[AuthContext] Bucket list cleared successfully');

      logger.info('[AuthContext] Signout process complete');
    } catch (error) {
      logger.error('[AuthContext] Signout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    logger.info('[AuthContext] Starting password reset for email:', email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${supabaseUrl}/auth/callback`,
      });

      if (error) {
        logger.error('[AuthContext] Password reset error:', error);
      } else {
        logger.info('[AuthContext] Password reset email sent successfully');
      }

      return { error };
    } catch (error: any) {
      logger.error('[AuthContext] Password reset exception:', error);
      return { error };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    logger.info('[AuthContext] Starting OTP verification for email:', email);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (error) {
        logger.error('[AuthContext] OTP verification error:', error);
      } else {
        logger.info('[AuthContext] OTP verification successful');
      }

      return { error };
    } catch (error: any) {
      logger.error('[AuthContext] OTP verification exception:', error);
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    logger.info('[AuthContext] Starting password update');
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        logger.error('[AuthContext] Password update error:', error);
      } else {
        logger.info('[AuthContext] Password update successful');
      }

      return { error };
    } catch (error: any) {
      logger.error('[AuthContext] Password update exception:', error);
      return { error };
    }
  };

  const signInAfterPasswordReset = async (email: string, password: string) => {
    logger.info(
      '[AuthContext] Starting signin after password reset for email:',
      email,
    );
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('[AuthContext] Signin after password reset error:', error);
      } else {
        logger.info('[AuthContext] Signin after password reset successful');
      }

      return { error };
    } catch (error: any) {
      logger.error(
        '[AuthContext] Signin after password reset exception:',
        error,
      );
      return { error };
    }
  };

  // Method to handle delayed user profile creation
  const createUserProfileIfNeeded = async (user: User) => {
    logger.info(
      '[AuthContext] Checking if user profile needs to be created for user:',
      user.id,
    );

    try {
      // Only create profile if user is confirmed
      if (!user.email_confirmed_at) {
        logger.info(
          '[AuthContext] User email not confirmed, skipping profile creation',
        );
        return;
      }

      const userProfile = {
        id: user.id,
        email: user.email || '',
        displayName: user.user_metadata?.full_name || user.email || '',
        photoUrl:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          undefined,
        createdAt: user.created_at ? new Date(user.created_at).getTime() : 0,
        lastLogin: Date.now(),
      };

      logger.info(
        '[AuthContext] Creating user profile for confirmed user:',
        userProfile,
      );
      const success = await SupabaseDataService.upsertUserProfile(userProfile);

      if (success) {
        logger.info('[AuthContext] User profile created successfully');
      } else {
        logger.info(
          '[AuthContext] Failed to create user profile - will retry later',
        );
      }
    } catch (error) {
      logger.error('[AuthContext] Error in createUserProfileIfNeeded:', error);
    }
  };

  const deleteAccount = async () => {
    try {
      logger.info('[AuthContext] Starting account deletion process...');

      if (!user) {
        logger.info('[AuthContext] No user to delete');
        return { error: new Error('No user logged in') };
      }

      // Delete user data from Supabase tables first
      logger.info('[AuthContext] Deleting user data from database...');

      // Delete from bucket_list_items table
      const { error: bucketListError } = await supabase
        .from('bucket_list_items')
        .delete()
        .eq('user_id', user.id);

      if (bucketListError) {
        logger.info(
          '[AuthContext] Error deleting bucket list items:',
          bucketListError,
        );
      }

      // Delete from user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        logger.info('[AuthContext] Error deleting user profile:', profileError);
      }

      // Delete from geofence_alerts table if it exists
      const { error: geofenceError } = await supabase
        .from('geofence_alerts')
        .delete()
        .eq('user_id', user.id);

      if (geofenceError) {
        logger.info(
          '[AuthContext] Error deleting geofence alerts:',
          geofenceError,
        );
      }

      logger.info('[AuthContext] User data deleted successfully from database');

      // Clear ALL Redux persisted state before signing out
      logger.info('[AuthContext] Clearing all user data from local storage...');
      dispatch(setBucketListItems([]));
      dispatch(setMasterNotificationsEnabled(false));
      dispatch(setDistanceMiles(1.25));

      // Clear geofences
      await GeofencingService.clearAllGeofences();
      logger.info('[AuthContext] Local data cleared successfully');

      // Delete the auth account itself using Supabase Admin API
      // This ensures the user cannot log back in with the same account
      try {
        logger.info('[AuthContext] Attempting to delete auth account...');
        const { error: deleteError } = await supabase.rpc('delete_user');

        if (deleteError) {
          logger.error('[AuthContext] Error deleting auth account:', deleteError);
          // Continue with sign out even if auth deletion fails
          // The user data is already deleted from the database
        } else {
          logger.info('[AuthContext] Auth account deleted successfully');
        }
      } catch (error) {
        logger.error('[AuthContext] Exception deleting auth account:', error);
        // Continue with sign out even if auth deletion fails
      }

      // Sign out the user after successful deletion
      logger.info('[AuthContext] Signing out user...');
      await signOut();

      logger.info('[AuthContext] Account deletion process completed');
      return { error: null };
    } catch (error: any) {
      logger.error('[AuthContext] Account deletion error:', error.message);
      return { error };
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
        signInWithApple: signInWithAppleHandler,
        signOut,
        resetPassword,
        verifyOTP,
        updatePassword,
        signInAfterPasswordReset,
        createUserProfileIfNeeded,
        deleteAccount,
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
