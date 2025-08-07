import { ActivityIndicator, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { AuthProvider } from '@/contexts/AuthContext';
import { store } from '@/hooks/redux';
import { useDeferredDeepLink, parseDeepLink } from '@/hooks/useDeferredDeepLink';
import { useSimpleDeferredLink } from '@/hooks/useSimpleDeferredLink';
import { useAppInitialization } from '@/hooks/useAppInitialization';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SafeAreaProvider>
          <RootLayoutContent />
        </SafeAreaProvider>
      </AuthProvider>
    </Provider>
  );
}

function RootLayoutContent() {
  const router = useRouter();

  // Initialize app (geofencing, permissions, etc.)
  useAppInitialization();

  // Handle deep links
  const handleDeepLink = (url: string) => {
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
  };

  // Set up deferred deep link handling
  useDeferredDeepLink(handleDeepLink);

  // Also check for simple deferred links (TestFlight testing)
  useSimpleDeferredLink(handleDeepLink);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="password-reset" />
        <Stack.Screen name="otp" />
        <Stack.Screen
          name="test-deferred-link"
          options={{ headerShown: true, title: 'Test Deep Links' }}
        />
        <Stack.Screen
          name="test-venue-deep-links"
          options={{ headerShown: true, title: 'Test Venue Deep Links' }}
        />
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
