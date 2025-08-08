import React from 'react';
import {} from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { store } from '@/hooks/redux';
import { useDeferredDeepLink, parseDeepLink } from '@/hooks/useDeferredDeepLink';
import { useSimpleDeferredLink } from '@/hooks/useSimpleDeferredLink';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import LoadingScreen from '@/components/screens/LoadingScreen';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SafeAreaProvider>
          <AppErrorBoundary>
            <RootLayoutContent />
          </AppErrorBoundary>
        </SafeAreaProvider>
      </AuthProvider>
    </Provider>
  );
}

function RootLayoutContent() {
  // Initialize app (geofencing, permissions, etc.) - MUST be called at top level
  const { isInitializing, initializationStep } = useAppInitialization();
  const { isAuthenticated, user } = useAuth();

  const router = useRouter();

  // Helper function to store deep link for later processing
  const storeDeepLinkForLater = React.useCallback(async (url: string) => {
    try {
      const deepLinkData = {
        url,
        timestamp: Date.now(),
        processed: false,
      };
      await AsyncStorage.setItem('dinnafind_pending_deep_link', JSON.stringify(deepLinkData));
      console.log('[DeepLink] Stored pending deep link for later processing');
    } catch (error) {
      console.error('[DeepLink] Error storing pending deep link:', error);
    }
  }, []);

  // Handle deep links
  const handleDeepLink = React.useCallback(
    (url: string) => {
      console.log('[DeepLink] Handling URL:', url);
      const parsed = parseDeepLink(url);

      if (!parsed) {
        console.log('[DeepLink] Failed to parse URL');
        return;
      }

      console.log('[DeepLink] Parsed:', parsed);

      // Add delay to ensure navigation stack is ready
      setTimeout(() => {
        // Navigate based on the deep link
        if (parsed.isRestaurant && parsed.restaurantId) {
          console.log('[DeepLink] Navigating to restaurant:', parsed.restaurantId);
          console.log('[DeepLink] Query params:', parsed.queryParams);

          // Check if user is authenticated before allowing venue navigation
          if (!isAuthenticated || !user) {
            console.log('[DeepLink] User not authenticated, redirecting to auth');
            // Store the deep link for later processing after authentication
            storeDeepLinkForLater(url);
            router.push('/auth');
            return;
          }

          // Check if we should auto-save this venue
          const shouldAutoSave = parsed.queryParams?.autoSave === 'true';

          // Navigate with only venueId and autoSave (no minimal data)
          const detailUrl = `/detail?venueId=${parsed.restaurantId}${
            shouldAutoSave ? '&autoSave=true' : ''
          }` as const;

          console.log('[DeepLink] Navigating to:', detailUrl);
          router.push(detailUrl);
        } else if (parsed.isBucketList) {
          console.log('[DeepLink] Navigating to bucket list');
          router.push('/(tabs)/bucket-list');
        } else if (parsed.isAuth) {
          console.log('[DeepLink] Navigating to auth callback');
          router.push('/auth-callback');
        }
      }, 2000);
    },
    [isAuthenticated, user, router, storeDeepLinkForLater]
  );

  // Process pending deep links after authentication
  React.useEffect(() => {
    const processPendingDeepLink = async () => {
      if (isAuthenticated && user) {
        try {
          const pendingDeepLinkData = await AsyncStorage.getItem('dinnafind_pending_deep_link');
          if (pendingDeepLinkData) {
            const data = JSON.parse(pendingDeepLinkData);
            const oneHourAgo = Date.now() - 60 * 60 * 1000;

            // Only process if the link is less than 1 hour old
            if (data.timestamp > oneHourAgo && !data.processed) {
              console.log('[DeepLink] Processing pending deep link:', data.url);

              // Clear the pending deep link
              await AsyncStorage.removeItem('dinnafind_pending_deep_link');

              // Process the deep link
              handleDeepLink(data.url);
            } else {
              // Clear old pending deep link
              await AsyncStorage.removeItem('dinnafind_pending_deep_link');
            }
          }
        } catch (error) {
          console.error('[DeepLink] Error processing pending deep link:', error);
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
    const navigateFromGeofenceNotification = (data: any) => {
      try {
        const geofenceId = data?.geofenceId as string | undefined;
        if (!geofenceId) return;

        const state = store.getState();
        const items = state.bucketList?.items || [];
        const matchedItem = items.find((it: any) => it.id === geofenceId);

        // Prefer venueId from notification payload if provided; otherwise derive from store
        const rawVenueId = (data?.venueId as string | undefined) || matchedItem?.venue?.id;
        if (rawVenueId) {
          const venueId = String(rawVenueId).split('?')[0];
          router.push({ pathname: '/detail', params: { venueId } });
        } else {
          // Fallback to bucket list tab if we cannot resolve the venue
          router.push('/(tabs)/bucket-list');
        }
      } catch (error) {
        console.error('[Notifications] Error handling geofence notification response', error);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response?.notification?.request?.content?.data as any;
      navigateFromGeofenceNotification(data);
    });

    // Handle cold start when the app is opened by tapping a notification
    Notifications.getLastNotificationResponseAsync().then(response => {
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
