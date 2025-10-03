import { useEffect, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { branchService } from '@/services/BranchService';
import { logger } from '@/utils/logger';

const BRANCH_DEFERRED_LINK_KEY = 'dinnafind_branch_deferred_link';

/**
 * Hook to handle Branch deep linking integration
 * This integrates with the existing deep link handling system
 */
export function useBranchDeepLink(onDeepLink: (url: string) => void) {
  const [isBranchReady, setIsBranchReady] = useState(false);

  // Initialize Branch service
  useEffect(() => {
    const initBranch = async () => {
      try {
        await branchService.initialize();
        setIsBranchReady(branchService.isAvailable());
        logger.info('[Branch] Service initialized in hook');
      } catch (error) {
        logger.error('[Branch] Failed to initialize in hook:', error);
        setIsBranchReady(false);
      }
    };

    initBranch();
  }, []);

  // Check for Branch deferred links on mount
  useEffect(() => {
    const checkBranchDeferredLink = async () => {
      try {
        const deferredLinkData = await AsyncStorage.getItem(BRANCH_DEFERRED_LINK_KEY);

        if (deferredLinkData) {
          const data = JSON.parse(deferredLinkData);
          const oneHourAgo = Date.now() - 60 * 60 * 1000;

          // Only process if the link is less than 1 hour old and not processed
          if (data.timestamp > oneHourAgo && !data.processed) {
            logger.info('[Branch] Found deferred deep link:', data.url);

            // Mark as processed
            await AsyncStorage.setItem(
              BRANCH_DEFERRED_LINK_KEY,
              JSON.stringify({ ...data, processed: true })
            );

            // Handle the deferred link after a small delay
            setTimeout(() => {
              onDeepLink(data.url);
            }, 1500);
          } else {
            // Clear old deferred link
            await AsyncStorage.removeItem(BRANCH_DEFERRED_LINK_KEY);
          }
        }
      } catch (error) {
        logger.error('[Branch] Error checking deferred link:', error);
      }
    };

    checkBranchDeferredLink();
  }, [onDeepLink]);

  // Listen for Branch deep link events
  useEffect(() => {
    // Note: Branch deep links are handled through the Branch SDK in React Native
    // The browser-specific event listener is not needed and causes runtime errors

    return () => {
      // Cleanup not needed for React Native Branch SDK
    };
  }, [onDeepLink]);

  // Function to create and share a venue link
  const createAndShareVenueLink = useCallback(async (
    venueId: string,
    venueName?: string,
    properties?: any
  ) => {
    try {
      const link = await branchService.createVenueLink(venueId, venueName, properties);
      return link;
    } catch (error) {
      logger.error('[Branch] Error creating venue link:', error);
      // Re-throw error - never return dinnafind:// for sharing
      throw error;
    }
  }, []);

  // Function to create and share a bucket list link
  const createAndShareBucketListLink = useCallback(async (properties?: any) => {
    try {
      const link = await branchService.createBucketListLink(properties);
      return link;
    } catch (error) {
      logger.error('[Branch] Error creating bucket list link:', error);
      // Re-throw error - never return dinnafind:// for sharing
      throw error;
    }
  }, []);

  return {
    createAndShareVenueLink,
    createAndShareBucketListLink,
    isBranchAvailable: isBranchReady,
  };
}

/**
 * Clear Branch deferred deep link
 */
export async function clearBranchDeferredDeepLink() {
  try {
    await AsyncStorage.removeItem(BRANCH_DEFERRED_LINK_KEY);
    logger.info('[Branch] Deferred deep link cleared');
  } catch (error) {
    logger.error('[Branch] Error clearing deferred deep link:', error);
  }
}

/**
 * Store a Branch deferred deep link for testing
 */
export async function storeBranchDeferredLink(url: string) {
  try {
    const deferredLinkData = {
      url,
      timestamp: Date.now(),
      processed: false,
      source: 'branch',
    };

    await AsyncStorage.setItem(
      BRANCH_DEFERRED_LINK_KEY,
      JSON.stringify(deferredLinkData)
    );

    logger.info('[Branch] Stored deferred deep link for testing:', deferredLinkData);
  } catch (error) {
    logger.error('[Branch] Error storing deferred deep link:', error);
  }
}
