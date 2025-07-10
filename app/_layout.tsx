import { ActivityIndicator, Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { AuthProvider } from '@/contexts/AuthContext';
import { store, persistor } from '@/hooks/redux';
import { useDeferredDeepLink, parseDeepLink } from '@/hooks/useDeferredDeepLink';
import { useSimpleDeferredLink } from '@/hooks/useSimpleDeferredLink';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#FF4500" size="large" />
            <Text style={{ marginTop: 10 }}>Loading...</Text>
          </View>
        }
        persistor={persistor}
      >
        <AuthProvider>
          <SafeAreaProvider>
            <RootLayoutContent />
          </SafeAreaProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

function RootLayoutContent() {
  const router = useRouter();

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

        // For deep links, create minimal venue data
        const minimalVenueData = {
          id: parsed.restaurantId,
          name: `Restaurant ${parsed.restaurantId}`,
          categories: [{ name: 'Restaurant' }],
          location: {
            formattedAddress: 'Loading address...',
          },
        };

        const encodedData = encodeURIComponent(JSON.stringify(minimalVenueData));

        // Check if we should auto-save this venue
        const shouldAutoSave = parsed.queryParams?.save === 'true';

        // Navigate with both ID and encoded minimal data, plus auto-save flag
        const detailUrl = `/detail?venueId=${parsed.restaurantId}&data=${encodedData}${
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
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth-callback" />
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
