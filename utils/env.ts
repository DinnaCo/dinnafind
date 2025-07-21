import Constants from 'expo-constants';
import { logger } from '@/utils/logger';

// Define the app variant type
export type AppVariant = 'development' | 'preview' | 'testflight' | 'production';

// Get the app variant with fallback
export const APP_VARIANT: AppVariant =
  (process.env.APP_VARIANT as AppVariant) ||
  (Constants.expoConfig?.extra?.APP_VARIANT as AppVariant) ||
  'development';

// Supabase Configuration
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.SUPABASE_URL ||
  '';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ||
  '';

// Debug logging (only in development)
if (__DEV__ || APP_VARIANT !== 'production') {
  logger.info('🔧 Environment Configuration:');
  logger.info('  APP_VARIANT:', APP_VARIANT);
  logger.info('  SUPABASE_URL:', SUPABASE_URL ? '✅ Found' : '❌ Missing');
  logger.info('  SUPABASE_ANON_KEY length:', SUPABASE_ANON_KEY?.length || 0);
}

// Validation function
export const validateEnvironment = () => {
  const errors: string[] = [];

  if (!SUPABASE_URL) {
    errors.push('SUPABASE_URL is missing');
  }

  if (!SUPABASE_ANON_KEY) {
    errors.push('SUPABASE_ANON_KEY is missing');
  }

  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:', errors);
    return false;
  }

  logger.info('✅ Environment validation passed');
  return true;
};