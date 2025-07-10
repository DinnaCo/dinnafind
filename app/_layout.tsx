import React from 'react';
import {} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { store, persistor } from '@/store';
import {
  useDeferredDeepLink,
  parseDeepLink,
} from '@/hooks/useDeferredDeepLink';
import { useSimpleDeferredLink } from '@/hooks/useSimpleDeferredLink';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { LoadingScreen } from '@/components/screens/LoadingScreen';
import * as Sentry from '@sentry/react-native';
import { logger } from '@/utils/logger';
import { branchService } from '@/services/BranchService';

Sentry.init({
  dsn: 'https://aae96325ff9d3847b0ffc49356543cb5@o4509926468747264.ingest.us.sentry.io/4509926483034112',

  // Disable PII collection for App Store privacy compliance
  // This prevents tracking while keeping crash reporting functionality
  sendDefaultPii: false,
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Configure notification handler at app startup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default Sentry.wrap(function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <ThemeProvider>
          <AuthProvider>
            <SafeAreaProvider>
              <AppErrorBoundary>
                <RootLayoutContent />
              </AppErrorBoundary>
            </SafeAreaProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
});

function RootLayoutContent() {
  // Initialize app (geofencing, permissions, etc.) - MUST be called at top level
  const { isInitializing, initializationStep } = useAppInitialization();
  const { isAuthenticated, user } = useAuth();

  const router = useRouter();

  // Initialize Branch SDK early in app lifecycle
  React.useEffect(() => {
    const initBranch = async () => {
      try {
        await branchService.initialize();
        logger.info('[Branch] Service initialized in root layout');
      } catch (error) {
        logger.error('[Branch] Failed to initialize in root layout:', error);
      }
    };

    initBranch();
  }, []);

  // Debug function to check notification permissions
  const checkNotificationPermissions = async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      logger.info('[Notifications] Current permissions:', permissions);

      if (permissions.status === 'granted') {
        logger.info('[Notifications] ✅ Notifications are enabled');
      } else {
        logger.warn(
          '[Notifications] ❌ Notifications are not enabled:',
          permissions.status,
        );
      }

      return permissions.status === 'granted';
    } catch (error) {
      logger.error('[Notifications] Error checking permissions:', error);
      return false;
    }
  };

  // Fallback timeout to prevent infinite loading
  React.useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (isInitializing) {
        logger.warn(
          '[AppLayout] Fallback timeout reached, forcing app to continue',
        );
        // Force the app to continue even if initialization is stuck
      }
    }, 10000); // 10 second fallback

    return () => clearTimeout(fallbackTimeout);
  }, [isInitializing]);

  // Helper function to store deep link for later processing
  const storeDeepLinkForLater = React.useCallback(async (url: string, source: 'standard' | 'branch' = 'standard') => {
    try {
      const deepLinkData = {
        url,
        timestamp: Date.now(),
        processed: false,
        source,
      };

      // Store in the appropriate key based on source
      const storageKey = source === 'branch'
        ? 'dinnafind_branch_deferred_link'
        : 'dinnafind_pending_deep_link';

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(deepLinkData),
      );
      logger.info(`[DeepLink] Stored pending ${source} deep link for later processing`);
    } catch (error) {
      logger.error('[DeepLink] Error storing pending deep link:', error);
    }
  }, []);

  // Handle deep links
  const handleDeepLink = React.useCallback(
    (url: string) => {
      logger.info('[DeepLink] Handling URL:', url);
      const parsed = parseDeepLink(url);

      if (!parsed) {
        logger.warn('[DeepLink] Failed to parse URL');
        return;
      }

      logger.info('[DeepLink] Parsed:', parsed);

      // Add delay to ensure navigation stack is ready
      setTimeout(() => {
        // Navigate based on the deep link
        if (parsed.isRestaurant && parsed.restaurantId) {
          logger.info(
            '[DeepLink] Navigating to restaurant:',
            parsed.restaurantId,
          );
          logger.info('[DeepLink] Query params:', parsed.queryParams);

          // Check if user is authenticated before allowing venue navigation
          if (!isAuthenticated || !user) {
            logger.warn(
              '[DeepLink] User not authenticated, redirecting to auth',
            );
            // Store the deep link for later processing after authentication
            storeDeepLinkForLater(url);
            router.push('/auth/index');
            return;
          }

          // Check if we should auto-save this venue
          const shouldAutoSave = parsed.queryParams?.autoSave === 'true';

          // Navigate with only venueId and autoSave (no minimal data)
          const detailUrl = `/detail?venueId=${parsed.restaurantId}${
            shouldAutoSave ? '&autoSave=true' : ''
          }` as const;

          logger.info('[DeepLink] Navigating to:', detailUrl);
          router.push(detailUrl);
        } else if (parsed.isBucketList) {
          logger.info('[DeepLink] Navigating to bucket list');
          router.push('/(tabs)/bucket-list');
        } else if (parsed.isAuth) {
          logger.info('[DeepLink] Navigating to auth callback');
          router.push('/auth-callback');
        }
      }, 2000);
    },
    [isAuthenticated, user, router, storeDeepLinkForLater],
  );

  // Process pending deep links after authentication (both standard and Branch)
  React.useEffect(() => {
    const processPendingDeepLink = async () => {
      if (isAuthenticated && user) {
        try {
          // Check for standard pending deep links
          const pendingDeepLinkData = await AsyncStorage.getItem(
            'dinnafind_pending_deep_link',
          );
          if (pendingDeepLinkData) {
            const data = JSON.parse(pendingDeepLinkData);
            const oneHourAgo = Date.now() - 60 * 60 * 1000;

            // Only process if the link is less than 1 hour old
            if (data.timestamp > oneHourAgo && !data.processed) {
              logger.info('[DeepLink] Processing pending deep link:', data.url);

              // Clear the pending deep link
              await AsyncStorage.removeItem('dinnafind_pending_deep_link');

              // Process the deep link
              handleDeepLink(data.url);
            } else {
              // Clear old pending deep link
              await AsyncStorage.removeItem('dinnafind_pending_deep_link');
            }
          }

          // Check for Branch deferred deep links
          const branchDeferredLinkData = await AsyncStorage.getItem(
            'dinnafind_branch_deferred_link',
          );
          if (branchDeferredLinkData) {
            const data = JSON.parse(branchDeferredLinkData);
            const oneHourAgo = Date.now() - 60 * 60 * 1000;

            // Only process if the link is less than 1 hour old and not processed
            if (data.timestamp > oneHourAgo && !data.processed) {
              logger.info('[Branch] Processing deferred Branch link:', data.url);

              // Mark as processed
              await AsyncStorage.setItem(
                'dinnafind_branch_deferred_link',
                JSON.stringify({ ...data, processed: true })
              );

              // Process the Branch deep link
              handleDeepLink(data.url);
            } else {
              // Clear old Branch deferred link
              await AsyncStorage.removeItem('dinnafind_branch_deferred_link');
            }
          }
        } catch (error) {
          logger.error('[DeepLink] Error processing pending deep link:', error);
        }
      }
    };

    processPendingDeepLink();
  }, [isAuthenticated, user, handleDeepLink]);

  // Set up deferred deep link handling
  useDeferredDeepLink(handleDeepLink);

  // Also check for simple deferred links (TestFlight testing)
  useSimpleDeferredLink(handleDeepLink);

  // Handle notification responses (user taps notification)
  // Navigates to the venue detail corresponding to the geofenced bucket list item
  React.useEffect(() => {
    // Check notification permissions on app start
    checkNotificationPermissions();

    const navigateFromGeofenceNotification = (data: any) => {
      try {
        const geofenceId = data?.geofenceId as string | undefined;
        if (!geofenceId) return;

        const state = store.getState();
        const items = state.bucketList?.items || [];
        const matchedItem = items.find((it: any) => it.id === geofenceId);

        // Prefer venueId from notification payload if provided; otherwise derive from store
        const rawVenueId =
          (data?.venueId as string | undefined) || matchedItem?.venue?.id;
        if (rawVenueId) {
          const venueId = String(rawVenueId).split('?')[0];
          router.push({ pathname: '/detail', params: { venueId } });
        } else {
          // Fallback to bucket list tab if we cannot resolve the venue
          router.push('/(tabs)/bucket-list');
        }
      } catch (error) {
        logger.error(
          '[Notifications] Error handling geofence notification response',
          error,
        );
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response?.notification?.request?.content?.data as any;
        navigateFromGeofenceNotification(data);
      },
    );

    // Handle cold start when the app is opened by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data as any;
      if (data) {
        navigateFromGeofenceNotification(data);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Show loading screen during initialization
  if (isInitializing) {
    return <LoadingScreen message={initializationStep} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="password-reset" />
        <Stack.Screen name="otp" />

        <Stack.Screen name="[...unmatched]" />
        <Stack.Screen
          name="detail"
          options={{
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}
