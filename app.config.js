// app.config.js - FIXED VERSION
export default ({ config }) => {
  // Determine environment based on EAS build profile
  const appVariant = process.env.APP_VARIANT || 'development';
  const isProduction = appVariant === 'production';
  const isPreview = appVariant === 'preview';
  const isTestflight = appVariant === 'testflight';
  const isDevelopment = appVariant === 'development';

  console.log('🔧 Building app configuration for variant:', appVariant);

  // Helper to get environment variables
  const getEnvVar = (key) => {
    const publicKey = key.startsWith('EXPO_PUBLIC_')
      ? key
      : `EXPO_PUBLIC_${key}`;
    const value = process.env[publicKey] || process.env[key];
    if (value) {
      console.log(`✅ Found ${key}`);
    } else {
      console.warn(`⚠️ Missing ${key}`);
    }
    return value || '';
  };

  // Use the same bundle ID for all builds - focus on main DinnaFind app only
  const getBundleIdentifier = () => {
    // Always use the main production bundle ID
    // All builds (production, development) will go to the same app in App Store Connect
    return 'com.dinnafind.app';
  };

  // App name based on environment (visual distinction only)
  const getAppName = () => {
    if (isProduction) return 'DinnaFind';
    if (isDevelopment) return 'DinnaFind Dev';
    // For any other variant, add suffix
    return `DinnaFind ${appVariant.charAt(0).toUpperCase() + appVariant.slice(1)}`;
  };

  return {
    ...config,
    name: getAppName(),
    slug: 'dinnafind',
    scheme: 'dinnafind',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon-dinnafind-iOS-Default-1024x1024@2x.png',
    userInterfaceStyle: 'automatic',

    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
      dark: {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#4A4A4A', // Match dark mode theme
      },
    },

    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleIdentifier(), // This will now return the correct ID
      // Remove buildNumber - it's managed by EAS autoIncrement
      infoPlist: {
        // REQUIRED for App Store submission
        ITSAppUsesNonExemptEncryption: false,

        // Location permissions
        NSLocationWhenInUseUsageDescription:
          'DinnaFind needs your location to find restaurants near you.',
        NSLocationAlwaysUsageDescription:
          "DinnaFind uses your the more battery efficient Geofencing API to locate the restaurants you don't want to miss while running in the background.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'DinnaFind uses your location to find restaurants and send notifications about dinner findss nearby.',

        // Notification permissions
        NSUserNotificationUsageDescription:
          'DinnaFind sends notifications when you are near saved recommended restaurants.',

        // Optional permissions
        NSCameraUsageDescription:
          'DinnaFind needs camera access to take photos of all your dinner finds.',
        NSPhotoLibraryUsageDescription:
          'DinnaFind needs photo library access to save and share all your photos of your mighty fine dinna finds.',
        NSPhotoLibraryAddUsageDescription:
          'DinnaFind needs permission to save photos to your photo library.',

        // Background modes
        UIBackgroundModes: ['location', 'fetch', 'remote-notification'],

        // Branch.io configuration
        branch_key: {
          live: getEnvVar('BRANCH_KEY'),
          test: getEnvVar('BRANCH_KEY_TEST'),
        },
        branch_universal_link_domains: [
          'dinnafind.app.link',
          'dinnafind-alternate.app.link',
        ],
      },
      associatedDomains: [
        'applinks:dinnafind.app.link',
        'applinks:dinnafind-alternate.app.link',
        'applinks:dinnafind.test-app.link',
        'applinks:dinnafind-alternate.test-app.link',
      ],
    },

    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/splash-icon.png',
        backgroundColor: '#ffffff',
      },
      package: getBundleIdentifier(),
      versionCode: 1,
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
      ],
    },

    web: {
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },

    plugins: [
      'expo-router',
      'expo-location',
      'expo-secure-store',
      'expo-dev-client',
      'expo-apple-authentication',
      '@sentry/react-native',
      'expo-font',
      'expo-web-browser',

      [
        'expo-notifications',
        {
          icon: './assets/images/icon-dinnafind-iOS-Default-1024x1024@2x.png',
          color: '#ffffff',
        },
      ],
      [
        'expo-updates',
        {
          username: 'evanmeeks',
        },
      ],
    ],

    // Pass environment variables to the app
    extra: {
      // API Keys
      EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: getEnvVar('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'),

      // Supabase
      EXPO_PUBLIC_SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
        getEnvVar('EXPO_PUBLIC_SUPABASE_KEY'),

      // Branch Keys
      EXPO_PUBLIC_BRANCH_KEY: getEnvVar('BRANCH_KEY'),
      EXPO_PUBLIC_BRANCH_KEY_TEST: getEnvVar('BRANCH_KEY_TEST'),

      // App configuration
      APP_VARIANT: appVariant,
      EXPO_PUBLIC_ENV: getEnvVar('EXPO_PUBLIC_ENV') || appVariant,

      // Feature flags
      EXPO_PUBLIC_ENABLE_ANALYTICS:
        getEnvVar('EXPO_PUBLIC_ENABLE_ANALYTICS') || 'false',
      EXPO_PUBLIC_ENABLE_CRASH_REPORTING:
        getEnvVar('EXPO_PUBLIC_ENABLE_CRASH_REPORTING') || 'false',
      EXPO_PUBLIC_DEBUG_MODE: isDevelopment ? 'true' : 'false',

      // EAS configuration
      eas: {
        projectId: 'd1c32541-63ec-4e09-a186-72d013b4ec64', // Your actual project ID
      },

      // Router configuration
      router: {
        origin: false,
      },

      // Additional metadata
      buildTime: new Date().toISOString(),
      buildNumber: process.env.EAS_BUILD_ID || 'local',
    },

    // EAS Update configuration
    updates: {
      enabled: !isDevelopment,
      fallbackToCacheTimeout: 30000,
      url: 'https://u.expo.dev/d1c32541-63ec-4e09-a186-72d013b4ec64', // Your actual project ID
      checkAutomatically: isProduction ? 'ON_LOAD' : 'ON_ERROR_RECOVERY',
    },

    // Development tools
    experiments: {
      typedRoutes: true,
    },

    // Ownership
    owner: 'dinnafind',
  };
};
