import { type Coordinates } from './venue';

/**
 * Simplified venue model for bucket list items
 */
export interface BucketListVenue {
  id: string;
  name: string;
  category: string;
  address: string;
  coordinates?: Coordinates;
  photo?: string;
  heroImageUrl?: string;
  rating?: number;
}

/**
 * User-specific bucket list item with additional metadata
 */
export interface BucketListItem {
  id: string;
  fsq_id?: string;
  venue: BucketListVenue;
  venueId?: string; // Foursquare venue ID
  userId?: string; // User ID for ownership
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  addedAt: number;
  plannedVisitDate?: number;
  visitedAt?: number;
  userRating?: number;
  review?: string;
  notificationsEnabled?: boolean; // Whether notifications are enabled for this restaurant
}

/**
 * Filter options for bucket list
 */
export interface BucketListFilter {
  tags?: string[];
  priority?: ('low' | 'medium' | 'high')[];
  visited?: boolean;
  searchTerm?: string;
  sortBy?: 'dateAdded' | 'name' | 'priority' | 'plannedDate';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Bucket list state in the redux store
 */
export interface BucketListState {
  items: BucketListItem[];
  filteredItems: BucketListItem[];
  filters: BucketListFilter;
  loading: boolean;
  error: string | null;
  masterNotificationsEnabled: boolean;
  distanceMiles: number; // User-selected alert radius in miles
}
