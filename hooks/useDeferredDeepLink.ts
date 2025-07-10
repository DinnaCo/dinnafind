import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

const DEFERRED_LINK_KEY = 'dinnafind_deferred_deeplink';

export interface DeferredLinkData {
  url: string;
  timestamp: number;
  processed: boolean;
}

/**
 * Hook to handle deferred deep links
 */
export function useDeferredDeepLink(onDeepLink: (url: string) => void) {
  useEffect(() => {
    const checkForDeferredLink = async () => {
      try {
        const deferredLinkData = await AsyncStorage.getItem(DEFERRED_LINK_KEY);

        if (deferredLinkData) {
          const data: DeferredLinkData = JSON.parse(deferredLinkData);

          // Check if link is less than 1 hour old and not processed
          const oneHourAgo = Date.now() - 60 * 60 * 1000;

          if (data.timestamp > oneHourAgo && !data.processed) {
            console.log('Found deferred deep link:', data.url);

            // Mark as processed
            await AsyncStorage.setItem(
              DEFERRED_LINK_KEY,
              JSON.stringify({ ...data, processed: true })
            );

            // Handle the deferred link
            onDeepLink(data.url);
          } else {
            // Clear old deferred link
            await AsyncStorage.removeItem(DEFERRED_LINK_KEY);
          }
        }
      } catch (error) {
        console.error('Error checking deferred link:', error);
      }
    };
    checkForDeferredLink();

    // Listen for incoming links while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Received deep link:', url);
      onDeepLink(url);
    });

    // Check if app was opened with a link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with URL:', url);
        onDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, [onDeepLink]);
}

/**
 * Simulate storing a deferred deep link (for testing)
 * In production, this would be handled by your backend or a service like Branch
 */
export async function simulateDeferredDeepLink(url: string) {
  const deferredLinkData: DeferredLinkData = {
    url,
    timestamp: Date.now(),
    processed: false,
  };

  await AsyncStorage.setItem(DEFERRED_LINK_KEY, JSON.stringify(deferredLinkData));
  console.log('Deferred deep link stored:', url);
}

/**
 * Clear any stored deferred links
 */
export async function clearDeferredDeepLink() {
  await AsyncStorage.removeItem(DEFERRED_LINK_KEY);
  console.log('Deferred deep link cleared');
}

/**
 * Parse deep link URL and extract parameters
 */
export function parseDeepLink(url: string) {
  try {
    console.log('[DeepLink] Parsing URL:', url);

    // For custom scheme URLs like dinnafind://restaurant/123
    // Expo's Linking.parse treats the first part after :// as hostname
    // So we need to handle this differently

    if (url.startsWith('dinnafind://')) {
      const pathPart = url.replace('dinnafind://', '');
      const [firstPart, ...restParts] = pathPart.split('/');

      // Handle different URL patterns
      if ((firstPart === 'restaurant' || firstPart === 'restauraunt') && restParts.length > 0) {
        // Parse query params if any
        const queryStart = pathPart.indexOf('?');
        const queryParams: Record<string, string> = {};
        let cleanRestaurantId = restParts[0];

        if (queryStart > -1) {
          const queryString = pathPart.substring(queryStart + 1);
          const pairs = queryString.split('&');
          pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) queryParams[key] = decodeURIComponent(value || '');
          });

          // Clean the restaurant ID by removing query parameters
          const idQueryStart = cleanRestaurantId.indexOf('?');
          if (idQueryStart > -1) {
            cleanRestaurantId = cleanRestaurantId.substring(0, idQueryStart);
          }
        }

        return {
          path: pathPart,
          isRestaurant: true,
          restaurantId: cleanRestaurantId,
          isAuth: false,
          isBucketList: false,
          queryParams,
        };
      } else if (firstPart === 'bucket-list') {
        return {
          path: pathPart,
          isRestaurant: false,
          restaurantId: null,
          isAuth: false,
          isBucketList: true,
          queryParams: {},
        };
      } else if (firstPart === 'auth-callback') {
        // Parse query params if any
        const queryStart = pathPart.indexOf('?');
        const queryParams: Record<string, string> = {};
        if (queryStart > -1) {
          const queryString = pathPart.substring(queryStart + 1);
          const pairs = queryString.split('&');
          pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) queryParams[key] = decodeURIComponent(value || '');
          });
        }
        return {
          path: pathPart,
          isRestaurant: false,
          restaurantId: null,
          isAuth: true,
          isBucketList: false,
          queryParams,
        };
      }
    }

    // Fallback to Expo's parser for other URL formats
    const { hostname, path, queryParams } = Linking.parse(url);

    return {
      hostname,
      path,
      queryParams,
      isRestaurant: false,
      restaurantId: null,
      isAuth: false,
      isBucketList: false,
    };
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
}
