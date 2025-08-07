import { Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch } from '@/store';
import { loginSuccess, logoutSuccess } from '@/store/slices/authSlice';
import { supabase } from '@/utils/supabase';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { setTheme, completeOnboarding } from '@/store/slices/uiSlice';
import {
  setMasterNotificationsEnabled,
  setDistanceMiles,
  setBucketListItems,
} from '@/store/slices/bucketListSlice';

// This is needed for OAuth redirects
WebBrowser.maybeCompleteAuthSession();

// Get Supabase URL from environment or fallback
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kskhzgbwvryiqemzaoye.supabase.co';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();
  const loadedUsers = useRef<Set<string>>(new Set());
  const isLoadingData = useRef<Set<string>>(new Set());

  const loadUserData = async (userId: string) => {
    // Prevent duplicate loading for the same user
    if (loadedUsers.current.has(userId)) {
      console.log('🔄 User data already loaded for:', userId);
      return;
    }

    // Prevent concurrent loading for the same user
    if (isLoadingData.current.has(userId)) {
      console.log('🔄 User data loading in progress for:', userId);
      return;
    }

    console.log('🔄 Loading user data from Supabase for user:', userId);
    isLoadingData.current.add(userId);

    try {
      // Load user profile
      const userProfile = await SupabaseDataService.loadUserProfile(userId);
      if (userProfile) {
        dispatch(loginSuccess(userProfile));
      } else {
        // Create basic profile if none exists
        const basicProfile = {
          id: userId,
          email: user?.email || '',
          displayName: user?.user_metadata?.full_name || user?.email || '',
          createdAt: user?.created_at ? new Date(user.created_at).getTime() : 0,
          lastLogin: Date.now(),
        };
        dispatch(loginSuccess(basicProfile));
      }

      // Load user preferences
      const preferences = await SupabaseDataService.loadUserPreferences(userId);
      if (preferences && Object.keys(preferences).length > 0) {
        if (preferences.theme) {
          dispatch(setTheme(preferences.theme));
        }
        if (preferences.onboardingCompleted !== undefined) {
          dispatch(completeOnboarding(preferences.onboardingCompleted));
        }
        if (preferences.masterNotificationsEnabled !== undefined) {
          dispatch(setMasterNotificationsEnabled(preferences.masterNotificationsEnabled));
        }
        if (preferences.distanceMiles !== undefined) {
          dispatch(setDistanceMiles(preferences.distanceMiles));
        }
      }

      // Load bucket list items
      const bucketListItems = await SupabaseDataService.loadBucketListItems(userId);
      if (bucketListItems.length > 0) {
        dispatch(setBucketListItems(bucketListItems));
      }

      loadedUsers.current.add(userId);
      console.log('✅ User data loaded successfully for:', userId);
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
    } finally {
      isLoadingData.current.delete(userId);
    }
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Dispatch Redux action based on session state
      if (session?.user) {
        dispatch(
          loginSuccess({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.full_name || session.user.email || '',
            createdAt: session.user.created_at ? new Date(session.user.created_at).getTime() : 0,
            lastLogin: Date.now(),
          })
        );

        // Load user data from Supabase
        await loadUserData(session.user.id);
      } else {
        dispatch(logoutSuccess());
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Dispatch Redux action based on auth state change
      if (session?.user) {
        dispatch(
          loginSuccess({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.full_name || session.user.email || '',
            createdAt: session.user.created_at ? new Date(session.user.created_at).getTime() : 0,
            lastLogin: Date.now(),
          })
        );

        // Load user data from Supabase
        await loadUserData(session.user.id);
      } else {
        dispatch(logoutSuccess());
        // Clear loaded users when logging out
        loadedUsers.current.clear();
        isLoadingData.current.clear();
      }

      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [dispatch]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        return { error };
      } else {
        // Mobile implementation
        let redirectUrl: string;

        // Check if we're in Expo Go or a standalone app
        const isExpoGo = Constants.appOwnership === 'expo';

        if (isExpoGo) {
          // For Expo Go, use the Supabase callback URL
          redirectUrl = `${supabaseUrl}/auth/v1/callback`;
        } else {
          // For standalone apps, use deep linking
          redirectUrl = Linking.createURL('auth-callback');
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.url) {
          throw new Error('No auth URL received');
        }

        if (isExpoGo) {
          // For Expo Go, use openBrowserAsync which will handle the auth flow
          await WebBrowser.openAuthSessionAsync(data.url);

          // After the browser closes, check if we have a session
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            return { error: null };
          } else {
            return { error: { message: 'Please complete the sign-in process in your browser' } };
          }
        } else {
          // For standalone apps, use openAuthSessionAsync
          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

          if (res.type === 'success') {
            // The deep link handler will process the authentication
            return { error: null };
          } else if (res.type === 'cancel') {
            return { error: { message: 'Authentication was cancelled' } };
          }

          return { error: { message: 'Authentication failed' } };
        }
      }
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
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
