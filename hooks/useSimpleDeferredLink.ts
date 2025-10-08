import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const SIMPLE_DEFERRED_LINK_KEY = 'dinnafind_simple_deferred_link';

/**
 * Simplified deferred link handler for TestFlight testing
 * This doesn't require clipboard access
 */
export function useSimpleDeferredLink(onDeepLink: (url: string) => void) {
  useEffect(() => {
    const checkForStoredLink = async () => {
      try {
        const storedLink = await AsyncStorage.getItem(SIMPLE_DEFERRED_LINK_KEY);

        if (storedLink) {
          logger.info('[SimpleDeferredLink] Found stored link:', storedLink);

          // Clear the stored link
          await AsyncStorage.removeItem(SIMPLE_DEFERRED_LINK_KEY);

          // Handle the link after a small delay
          setTimeout(() => {
            onDeepLink(storedLink);
          }, 1500);
        }
      } catch (error) {
        logger.error('[SimpleDeferredLink] Error:', error);
      }
    };

    checkForStoredLink();
  }, [onDeepLink]);
}

/**
 * Store a deferred link for testing
 * Call this from your test screen or via a deep link parameter
 */
export async function storeTestDeepLink(url: string) {
  try {
    await AsyncStorage.setItem(SIMPLE_DEFERRED_LINK_KEY, url);
    logger.info('[SimpleDeferredLink] Stored test link:', url);
  } catch (error) {
    logger.error('[SimpleDeferredLink] Error storing link:', error);
  }
}
