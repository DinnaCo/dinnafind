import React from 'react';
import {} from 'react-native';
// Run once on app start

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { store, persistor } from '@/hooks/redux';
import { useDeepLinkOnce, parseDeepLink, storePendingDeepLink } from '@/hooks/useDeepLinkOnce';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { LoadingScreen } from '@/components/screens/LoadingScreen';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AuthProvider>
          <SafeAreaProvider>
            <AppErrorBoundary>
              <RootLayoutContent />
            </AppErrorBoundary>
          </SafeAreaProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

function RootLayoutContent() {
  // Initialize app (geofencing, permissions, etc.) - MUST be called at top level
  const { isInitializing, initializationStep } = useAppInitialization();
  const { isAuthenticated, user } = useAuth();

  const router = useRouter();

  // Track if we've already processed a pending link to avoid duplicates
  const pendingLinkProcessed = React.useRef(false);
  const waitingForInit = React.useRef<string | null>(null);

  // Immediately check for pending deep links when user becomes authenticated
  React.useEffect(() => {
    const processPendingLinkImmediately = async () => {
      // Only process if: authenticated, app initialized, and haven't processed yet
      if (isAuthenticated && user && !isInitializing && !pendingLinkProcessed.current) {
        try {
          // Check for any pending deep link from before authentication
          const pendingLink = await AsyncStorage.getItem('dinnafind_pending_deep_link');
          
          if (pendingLink) {
            pendingLinkProcessed.current = true;
            console.log('[DeepLink] User authenticated, processing pending link immediately:', pendingLink);
            
            // Clear it immediately
            await AsyncStorage.removeItem('dinnafind_pending_deep_link');
            
            // Process the link (either string or DeepLinkData)
            let url: string;
            try {
              const data = JSON.parse(pendingLink);
              url = data.url || pendingLink;
            } catch {
              url = pendingLink; // It's a plain string
            }
            
            // Navigate immediately without delay
            const parsed = parseDeepLink(url);
            
            if (parsed?.isRestaurant && parsed.restaurantId) {
              const shouldAutoSave = parsed.queryParams?.autoSave === 'true';
              const detailUrl = `/detail?venueId=${parsed.restaurantId}${
                shouldAutoSave ? '&autoSave=true' : ''
              }` as const;
              
              console.log('[DeepLink] Immediate navigation to restaurant:', detailUrl);
              router.push(detailUrl);
            } else if (parsed?.isBucketList) {
              console.log('[DeepLink] Immediate navigation to bucket list');
              router.push('/(tabs)/bucket-list');
            } else if (parsed?.isAuth) {
              console.log('[DeepLink] Immediate navigation to auth callback');
              router.push('/auth-callback');
            }
          }
        } catch (error) {
          console.error('[DeepLink] Error processing pending link:', error);
        }
      }
    };

    processPendingLinkImmediately();
  }, [isAuthenticated, user, isInitializing, router]);

  // Handle deep links - clean and simple
  const handleDeepLink = React.useCallback(
    (url: string) => {
      console.log('[DeepLink] Processing URL:', url);
      console.log('[DeepLink] Auth state:', { isAuthenticated, user: !!user, isInitializing });

      const parsed = parseDeepLink(url);
      if (!parsed) {
        console.log('[DeepLink] Failed to parse URL');
        return;
      }

      console.log('[DeepLink] Parsed:', parsed);

      // Don't process deep links while app is still initializing
      // This prevents incorrect auth redirects
      if (isInitializing) {
        console.log('[DeepLink] App still initializing, storing for later');
        waitingForInit.current = url;
        return;
      }

      // Minimal delay for navigation to ensure stack is ready
      const navigationDelay = 100;
      
      setTimeout(() => {
        // Navigate based on the deep link
        if (parsed.isRestaurant && parsed.restaurantId) {
          console.log('[DeepLink] Navigating to restaurant:', parsed.restaurantId);
          console.log('[DeepLink] Query params:', parsed.queryParams);

          // Check if user is authenticated before allowing venue navigation
          if (!isAuthenticated || !user) {
            console.log('[DeepLink] User not authenticated, redirecting to auth');
            // Store the deep link for later processing after authentication
            storePendingDeepLink(url);
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
      }, navigationDelay);
    },
    [isAuthenticated, user, router, isInitializing]
  );

  // Process deep link that was waiting for initialization
  React.useEffect(() => {
    if (!isInitializing && waitingForInit.current) {
      const url = waitingForInit.current;
      waitingForInit.current = null;
      console.log('[DeepLink] App initialized, processing waiting link:', url);
      // Small delay to ensure auth state is settled
      setTimeout(() => {
        handleDeepLink(url);
      }, 100);
    }
  }, [isInitializing, handleDeepLink]);

  // Use the simple deep link hook
  // Pass false if app is still initializing to prevent premature processing
  useDeepLinkOnce(handleDeepLink, !isInitializing);

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
