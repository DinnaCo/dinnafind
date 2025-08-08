import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const PENDING_DEEP_LINK_KEY = 'dinnafind_pending_deep_link';
const BRANCH_PENDING_KEY = 'dinnafind_branch_pending_link';

// Session-based tracking to prevent duplicate processing
let processedUrls = new Set<string>();
let handledUrls = new Set<string>(); // URLs that have been passed to handler

// Global flag to track if we've checked the initial URL
// This prevents getInitialURL from being called multiple times
let globalInitialUrlChecked = false;

// Deep link source types for analytics
export enum DeepLinkSource {
  DIRECT = 'direct',
  BRANCH = 'branch',
  NOTIFICATION = 'notification',
  QR_CODE = 'qr_code',
  SOCIAL = 'social',
}

export interface DeepLinkData {
  url: string;
  source: DeepLinkSource;
  metadata?: Record<string, any>; // Branch.io params, campaign data, etc.
  timestamp?: number;
}

/**
 * Configuration for deep link handling
 */
export interface DeepLinkConfig {
  /** Whether the app is ready to handle deep links (e.g., user authenticated, app initialized) */
  isReady: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether to require authentication for certain link types */
  requireAuth?: boolean;
  /** Enable Branch.io integration */
  useBranch?: boolean;
  /** Branch.io instance (will be added when you integrate Branch) */
  branch?: any; // Will be typed properly with Branch SDK
}

/**
 * Reset the processed URLs set (useful for testing or app refresh)
 */
export function resetProcessedUrls() {
  processedUrls.clear();
  console.log('[DeepLink] Reset processed URLs');
}

/**
 * Clear all pending deep links from storage
 */
export async function clearAllPendingDeepLinks() {
  try {
    await AsyncStorage.multiRemove([PENDING_DEEP_LINK_KEY, BRANCH_PENDING_KEY]);
    console.log('[DeepLink] Cleared all pending deep links');
  } catch (error) {
    console.error('[DeepLink] Error clearing pending deep links:', error);
  }
}

/**
 * Store a deep link for later processing
 */
export async function storePendingDeepLink(
  data: DeepLinkData | string,
  isBranch: boolean = false
) {
  try {
    const key = isBranch ? BRANCH_PENDING_KEY : PENDING_DEEP_LINK_KEY;
    const linkData: DeepLinkData = typeof data === 'string'
      ? { url: data, source: DeepLinkSource.DIRECT, timestamp: Date.now() }
      : { ...data, timestamp: Date.now() };

    await AsyncStorage.setItem(key, JSON.stringify(linkData));
    console.log(`[DeepLink] Stored pending ${isBranch ? 'Branch' : 'direct'} link:`, linkData.url);
  } catch (error) {
    console.error('[DeepLink] Error storing pending deep link:', error);
  }
}

/**
 * Get and clear pending deep link
 */
export async function getPendingDeepLink(isBranch: boolean = false): Promise<DeepLinkData | null> {
  try {
    const key = isBranch ? BRANCH_PENDING_KEY : PENDING_DEEP_LINK_KEY;
    const data = await AsyncStorage.getItem(key);

    if (data) {
      // Clear it immediately after reading
      await AsyncStorage.removeItem(key);
      const linkData = JSON.parse(data) as DeepLinkData;
      console.log(`[DeepLink] Retrieved and cleared pending ${isBranch ? 'Branch' : 'direct'} link:`, linkData.url);
      return linkData;
    }
    return null;
  } catch (error) {
    console.error('[DeepLink] Error getting pending deep link:', error);
    return null;
  }
}

/**
 * Simple hook that handles deep links exactly once
 * 
 * @param onDeepLink - Callback to handle the deep link
 * @param isReady - Whether the app is ready to handle deep links (e.g., user authenticated)
 */
export function useDeepLinkOnce(
  onDeepLink: (url: string) => void,
  isReady: boolean = true
) {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    if (!isReady) {
      console.log('[DeepLink] Not ready to process links yet');
      return;
    }

    // Check for pending deep link (from when user wasn't authenticated)
    getPendingDeepLink(false).then(data => {
      if (data && !processedUrls.has(data.url) && !handledUrls.has(data.url)) {
        console.log('[DeepLink] Processing pending link:', data.url);
        processedUrls.add(data.url);
        handledUrls.add(data.url); // Mark as handled
        onDeepLink(data.url);
      }
    });
  }, [isReady, onDeepLink]);

  useEffect(() => {
    // Only check initial URL once globally, not per component mount
    if (!globalInitialUrlChecked) {
      globalInitialUrlChecked = true;
      
      console.log('[DeepLink] Checking initial URL (first time only)');
      Linking.getInitialURL().then(url => {
        if (url && !processedUrls.has(url) && !handledUrls.has(url)) {
          console.log('[DeepLink] App INITIALLY opened with URL:', url);
          
          // Mark as processed and handled immediately
          processedUrls.add(url);
          handledUrls.add(url);
          
          if (isReady) {
            onDeepLink(url);
          } else {
            // Store for later if not ready
            storePendingDeepLink(url);
          }
        }
      });
    }

    // Listen for new deep links while app is open
    // This handles ALL deep links when the app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] New URL event while app is open:', url);

      if (!processedUrls.has(url) && !handledUrls.has(url)) {
        console.log('[DeepLink] Processing new deep link:', url);
        
        // Mark as processed and handled immediately
        processedUrls.add(url);
        handledUrls.add(url);
        
        if (isReady) {
          onDeepLink(url);
        } else {
          // Store for later if not ready
          storePendingDeepLink(url);
        }
      } else {
        console.log('[DeepLink] Ignoring already processed URL:', url);
      }
    });

    return () => subscription.remove();
  }, [onDeepLink, isReady]);
}

/**
 * Enhanced hook that handles deep links with Branch.io preparation
 * (Keep for backward compatibility and future Branch integration)
 */
export function useDeepLinkOnceEnhanced(
  onDeepLink: (data: DeepLinkData) => void,
  config: DeepLinkConfig
) {
  const wrappedHandler = (url: string) => {
    onDeepLink({
      url,
      source: DeepLinkSource.DIRECT,
      timestamp: Date.now()
    });
  };

  useDeepLinkOnce(wrappedHandler, config.isReady && (!config.requireAuth || config.isAuthenticated));
}

/**
 * Parse deep link URL and extract parameters
 * This remains the same but can be extended for Branch.io URLs
 */
export function parseDeepLink(url: string, metadata?: Record<string, any>) {
  try {
    console.log('[DeepLink] Parsing URL:', url);

    // Check if this is a Branch.io link (when integrated)
    if (metadata?.['~feature'] || metadata?.['~campaign']) {
      console.log('[DeepLink] Branch.io metadata:', metadata);
    }

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
          queryParams: { ...queryParams, ...metadata }, // Merge Branch metadata
        };
      } else if (firstPart === 'bucket-list') {
        return {
          path: pathPart,
          isRestaurant: false,
          restaurantId: null,
          isAuth: false,
          isBucketList: true,
          queryParams: metadata || {},
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
          queryParams: { ...queryParams, ...metadata },
        };
      }
    }

    // Handle Branch.io web links (when integrated)
    if (url.includes('.app.link') || url.includes('.test-app.link')) {
      return {
        path: url,
        isBranch: true,
        queryParams: metadata || {},
        isRestaurant: false,
        restaurantId: null,
        isAuth: false,
        isBucketList: false,
      };
    }

    // Fallback to Expo's parser for other URL formats
    const { hostname, path, queryParams } = Linking.parse(url);

    return {
      hostname,
      path,
      queryParams: { ...queryParams, ...metadata },
      isRestaurant: false,
      restaurantId: null,
      isAuth: false,
      isBucketList: false,
    };
  } catch (error) {
    console.error('[DeepLink] Error parsing deep link:', error);
    return null;
  }
}