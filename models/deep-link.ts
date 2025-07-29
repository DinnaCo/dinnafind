/**
 * Deep link related types
 */

/**
 * Deferred deep link data structure
 * Used for storing and retrieving deep links that need to be processed later
 */
export interface DeferredLinkData {
  url: string;
  timestamp: number;
  processed: boolean;
}

/**
 * Branch.io link data structure
 */
export interface BranchLinkData {
  venueId?: string;
  autoSave?: boolean;
  type?: 'restaurant' | 'bucket-list' | 'auth';
  [key: string]: string | boolean | undefined;
}

/**
 * Branch.io link properties for creating deep links
 */
export interface BranchLinkProperties {
  channel?: string;
  feature?: string;
  campaign?: string;
  tags?: string[];
  data?: BranchLinkData;
}
