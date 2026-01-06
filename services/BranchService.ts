import { NativeModules } from 'react-native';
import { logger } from '@/utils/logger';
import type {
  BranchLinkData,
  BranchLinkProperties,
  DeferredLinkData,
} from '@/models/deep-link';

// Check if Branch native module is available before importing
const isBranchAvailable = !!NativeModules.RNBranch;

// Lazy import Branch to avoid native module initialization errors
let Branch: any;
let BranchEvent: any;

if (isBranchAvailable) {
  try {
    const branchModule = require('react-native-branch');
    Branch = branchModule.default || branchModule.Branch;
    BranchEvent = branchModule.BranchEvent;
    logger.info('[Branch] Module loaded successfully');
  } catch (error) {
    logger.error('[Branch] Failed to load react-native-branch module:', error);
    // Create dummy implementations
    Branch = createDummyBranch();
    BranchEvent = createDummyBranchEvent();
  }
} else {
  logger.warn(
    '[Branch] Native module not available. Branch features will be disabled.',
  );
  Branch = createDummyBranch();
  BranchEvent = createDummyBranchEvent();
}

function createDummyBranch() {
  return {
    subscribe: () => () => {},
    createBranchUniversalObject: () =>
      Promise.reject(new Error('Branch not available')),
    getLatestReferringParams: () => Promise.resolve(null),
  };
}

function createDummyBranchEvent() {
  return class {
    constructor() {}
    logEvent() {
      return Promise.resolve();
    }
  };
}

class BranchService {
  private isInitialized = false;

  /**
   * Initialize Branch SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Enable debug mode for testing (remove in production)
      if (Branch.setDebug) {
        Branch.setDebug(__DEV__);
        logger.info('[Branch] Debug mode enabled:', __DEV__);
      }

      // Disable tracking for App Store privacy compliance
      // This prevents Branch from tracking user behavior while still allowing deep linking
      if (Branch.setTrackingDisabled) {
        Branch.setTrackingDisabled(true);
        logger.info('[Branch] Tracking disabled for privacy compliance');
      }

      // Subscribe to Branch events
      Branch.subscribe(
        ({ error, params }: { error: any; params: any; uri?: string }) => {
          if (error) {
            logger.error('[Branch] Error:', error);
            return;
          }

          if (params && !params['+clicked_branch_link']) {
            // This is a deferred deep link - app was opened via Branch link
            logger.info('[Branch] Deferred deep link received:', params);
            this.handleDeferredDeepLink(params);
          } else if (params && params['+clicked_branch_link']) {
            // This is a direct deep link - app was already open
            logger.info('[Branch] Direct deep link received:', params);
            this.handleDirectDeepLink(params);
          }
        },
      );

      this.isInitialized = true;
      logger.info('[Branch] Initialized successfully');
    } catch (error) {
      logger.error('[Branch] Initialization error:', error);
    }
  }

  /**
   * Create a deep link for sharing a venue
   * Returns a Branch universal link (https://dinnafind.app.link/...) or throws an error
   * NEVER returns dinnafind:// scheme URLs as those only work when app is installed
   */
  async createVenueLink(
    venueId: string,
    venueName?: string,
    properties?: BranchLinkProperties,
  ): Promise<string> {
    // If Branch is not available or not initialized, throw error
    if (!isBranchAvailable || !this.isInitialized) {
      const error = 'Branch is not available - cannot create shareable link';
      logger.error('[Branch]', error);
      throw new Error(error);
    }

    try {
      // Create Branch Universal Object
      const branchUniversalObject = await Branch.createBranchUniversalObject(
        'venue',
        {
          locallyIndex: true,
          title: venueName || 'Restaurant',
          contentDescription: `Check out this restaurant on DinnaFind!`,
          contentMetadata: {
            customMetadata: {
              venueId,
              type: 'restaurant',
              autoSave: 'true',
              ...(properties?.data
                ? Object.fromEntries(
                    Object.entries(properties.data).map(([key, value]) => [
                      key,
                      String(value),
                    ]),
                  )
                : {}),
            },
          },
        },
      );

      // Create link properties
      const linkProperties = {
        channel: properties?.channel,
        feature: properties?.feature,
        campaign: properties?.campaign,
        tags: properties?.tags,
      };

      // Generate the link
      const { url } =
        await branchUniversalObject.generateShortUrl(linkProperties);

      logger.info('[Branch] Created venue link:', url);

      return url;
    } catch (error) {
      logger.error('[Branch] Error creating venue link:', error);
      // Re-throw the error - never fall back to dinnafind:// for sharing
      throw new Error('Failed to create Branch link for sharing');
    }
  }

  /**
   * Create a deep link for bucket list
   * Returns a Branch universal link (https://dinnafind.app.link/...) or throws an error
   * NEVER returns dinnafind:// scheme URLs as those only work when app is installed
   */
  async createBucketListLink(
    properties?: BranchLinkProperties,
  ): Promise<string> {
    // If Branch is not available or not initialized, throw error
    if (!isBranchAvailable || !this.isInitialized) {
      const error = 'Branch is not available - cannot create shareable link';
      logger.error('[Branch]', error);
      throw new Error(error);
    }

    try {
      // Create Branch Universal Object
      const branchUniversalObject = await Branch.createBranchUniversalObject(
        'bucket-list',
        {
          locallyIndex: true,
          title: 'My Bucket List',
          contentDescription: `Check out my restaurant bucket list on DinnaFind!`,
          contentMetadata: {
            customMetadata: {
              type: 'bucket-list',
              ...(properties?.data
                ? Object.fromEntries(
                    Object.entries(properties.data).map(([key, value]) => [
                      key,
                      String(value),
                    ]),
                  )
                : {}),
            },
          },
        },
      );

      // Create link properties
      const linkProperties = {
        channel: properties?.channel,
        feature: properties?.feature,
        campaign: properties?.campaign,
        tags: properties?.tags,
      };

      // Generate the link
      const { url } =
        await branchUniversalObject.generateShortUrl(linkProperties);

      logger.info('[Branch] Created bucket list link:', url);

      return url;
    } catch (error) {
      logger.error('[Branch] Error creating bucket list link:', error);
      // Re-throw the error - never fall back to dinnafind:// for sharing
      throw new Error('Failed to create Branch link for sharing');
    }
  }

  /**
   * Handle deferred deep links (app opened via Branch link)
   */
  private handleDeferredDeepLink(params: any): void {
    try {
      const data = params as BranchLinkData;
      logger.info('[Branch] Processing deferred deep link data:', data);

      // Store the deferred link data for processing after app initialization
      this.storeDeferredLinkData(data);
    } catch (error) {
      logger.error('[Branch] Error handling deferred deep link:', error);
    }
  }

  /**
   * Handle direct deep links (app already open)
   */
  private handleDirectDeepLink(params: any): void {
    try {
      const data = params as BranchLinkData;
      logger.info('[Branch] Processing direct deep link data:', data);

      // Process the link immediately since app is already open
      this.processBranchLinkData(data);
    } catch (error) {
      logger.error('[Branch] Error handling direct deep link:', error);
    }
  }

  /**
   * Store deferred link data for later processing
   */
  private async storeDeferredLinkData(data: BranchLinkData): Promise<void> {
    try {
      const deferredLinkData = {
        url: this.convertBranchDataToUrl(data),
        timestamp: Date.now(),
        processed: false,
        source: 'branch',
      };

      // Store in AsyncStorage for later processing
      // Use require to support tests running without experimental-vm-modules
      const AsyncStorageModule = require('@react-native-async-storage/async-storage');
      const AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;

      await AsyncStorage.setItem(
        'dinnafind_branch_deferred_link',
        JSON.stringify(deferredLinkData),
      );

      logger.info('[Branch] Stored deferred link data:', deferredLinkData);
    } catch (error) {
      logger.error('[Branch] Error storing deferred link data:', error);
    }
  }

  /**
   * Process Branch link data and navigate accordingly
   */
  private processBranchLinkData(data: BranchLinkData): void {
    try {
      const url = this.convertBranchDataToUrl(data);
      logger.info('[Branch] Processing link data, converted to URL:', url);

      // Note: In React Native, Branch deep links are handled through the SDK
      // The browser-specific event dispatch is not needed and causes runtime errors
      // The deep link will be processed through the Branch SDK's built-in mechanisms
    } catch (error) {
      logger.error('[Branch] Error processing link data:', error);
    }
  }

  /**
   * Convert Branch data to app URL format
   */
  private convertBranchDataToUrl(data: BranchLinkData): string {
    if (data.type === 'restaurant' && data.venueId) {
      const params = new URLSearchParams();
      if (data.autoSave) {
        params.append('autoSave', 'true');
      }
      return `dinnafind://restaurant/${data.venueId}?${params.toString()}`;
    } else if (data.type === 'bucket-list') {
      return 'dinnafind://bucket-list';
    } else if (data.type === 'auth') {
      return 'dinnafind://auth-callback';
    }

    // Fallback to custom scheme format
    return `dinnafind://restaurant/${data.venueId || 'unknown'}?autoSave=true`;
  }

  /**
   * Get the last referring params (for analytics)
   */
  async getLastReferringParams(): Promise<any> {
    try {
      const params = await Branch.getLatestReferringParams();
      return params;
    } catch (error) {
      logger.error('[Branch] Error getting last referring params:', error);
      return null;
    }
  }

  /**
   * Track custom events
   */
  async trackEvent(eventName: string, eventData?: any): Promise<void> {
    // Skip tracking if Branch is not available or not initialized
    if (!isBranchAvailable || !this.isInitialized) {
      logger.debug(
        `[Branch] Skipping event tracking (not available): ${eventName}`,
      );
      return;
    }

    try {
      const event = new BranchEvent(eventName, eventData);
      await event.logEvent();
      logger.info(`[Branch] Tracked event: ${eventName}`, eventData);
    } catch (error) {
      logger.error('[Branch] Error tracking event:', error);
    }
  }

  /**
   * Check if Branch is available
   */
  isAvailable(): boolean {
    return isBranchAvailable && this.isInitialized;
  }
}

// Export singleton instance
export const branchService = new BranchService();
export default branchService;
