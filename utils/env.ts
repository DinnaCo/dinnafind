// Environment configuration that reads from actual environment variables
import Constants from 'expo-constants';

import { isNodeEnvironment } from './runtime';

// For web, import process
let processEnv: any = {};
if (typeof process !== 'undefined' && process.env) {
  processEnv = process.env;
}

// Debug logging
// console.log('🔍 DEBUG: Constants object:', Constants);
// console.log('🔍 DEBUG: Constants.expoConfig:', Constants.expoConfig);
// console.log('🔍 DEBUG: Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
// console.log('🔍 DEBUG: Constants.manifest:', Constants.manifest);
// console.log('🔍 DEBUG: Constants.manifest?.extra:', Constants.manifest?.extra);

// Read from Expo Constants (mobile) or process.env (web/tests)
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Try Expo Constants first (for mobile apps)
  if (Constants.expoConfig?.extra?.[key]) {
    console.log(`✅ Found ${key} in Constants.expoConfig.extra:`, Constants.expoConfig.extra[key]);
    return Constants.expoConfig.extra[key];
  }

  // Also try manifest for older Expo versions
  if (Constants.manifest?.extra?.[key]) {
    console.log(`✅ Found ${key} in Constants.manifest.extra:`, Constants.manifest.extra[key]);
    return Constants.manifest.extra[key];
  }

  // Try manifest2 for newer Expo versions
  if (Constants.manifest2?.extra?.expoClient?.extra?.[key]) {
    console.log(
      `✅ Found ${key} in Constants.manifest2:`,
      Constants.manifest2.extra.expoClient.extra[key]
    );
    return Constants.manifest2.extra.expoClient.extra[key];
  }

  // Try process.env (for web/tests)
  if (processEnv?.[key]) {
    console.log(`✅ Found ${key} in process.env:`, processEnv[key]);
    return processEnv[key];
  }

  // For web environment, also check window object
  if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV[key]) {
    console.log(`✅ Found ${key} in window.ENV:`, (window as any).ENV[key]);
    return (window as any).ENV[key];
  }

  // Return default

  return defaultValue;
};

export const FOURSQUARE_CLIENT_ID = getEnvVar('FOURSQUARE_CLIENT_ID', 'dev-client-id');
export const FOURSQUARE_CLIENT_SECRET = getEnvVar('FOURSQUARE_CLIENT_SECRET', 'dev-client-secret');
export const FOURSQUARE_API_KEY = getEnvVar('FOURSQUARE_API_KEY', 'dev-api-key');
export const FOURSQUARE_API_URL = 'https://api.foursquare.com/v3';

// Log the loaded values
console.log('📊 Loaded environment variables:');
console.log('  FOURSQUARE_CLIENT_ID:', FOURSQUARE_CLIENT_ID);
console.log('  FOURSQUARE_CLIENT_SECRET:', FOURSQUARE_CLIENT_SECRET);
console.log('  FOURSQUARE_API_KEY:', FOURSQUARE_API_KEY);

export const validateFoursquareConfig = () => {
  const hasApiKey = FOURSQUARE_API_KEY && FOURSQUARE_API_KEY !== 'dev-api-key';
  const hasClientId = FOURSQUARE_CLIENT_ID && FOURSQUARE_CLIENT_ID !== 'dev-client-id';

  if (!hasApiKey) {
    console.warn('⚠️ Using development API key - API calls will fail');
    console.warn('⚠️ Make sure you have:');
    console.warn('   1. Added API keys to app.json under expo.extra');
    console.warn('   2. Restarted Expo after changes (bun expo start -c)');
    return false;
  }

  console.log('✅ Foursquare API configuration loaded successfully');
  return true;
};

export default {
  FOURSQUARE_CLIENT_ID,
  FOURSQUARE_CLIENT_SECRET,
  FOURSQUARE_API_KEY,
  FOURSQUARE_API_URL,
  validateFoursquareConfig,
};
