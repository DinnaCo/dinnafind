import { makeRedirectUri } from 'expo-auth-session';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch } from '@/store';
import { loginSuccess, logoutSuccess } from '@/store/slices/authSlice';
import GeofencingService from '@/services/GeofencingService';
import { supabase } from '@/utils/supabase';
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
        setIsAuthenticated(true);
      } else {
        dispatch(logoutSuccess());
        setIsAuthenticated(false);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
        setIsAuthenticated(true);
      } else {
        dispatch(logoutSuccess());
        setIsAuthenticated(false);
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
        const redirectUrl = makeRedirectUri({
          scheme: 'dinnafind',
          path: 'auth-callback',
        });

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
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await GeofencingService.clearAllGeofences();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${supabaseUrl}/auth/callback`,
    });
    return { error };
  };

  const verifyOTP = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error };
  };

  const signInAfterPasswordReset = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
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
