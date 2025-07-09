import { createAsyncThunk } from '@reduxjs/toolkit';
import { foursquareService } from '@/api/foursquare';
import { type BucketListFilter, type BucketListItem } from '@/models/bucket-list';
import { type RootState } from '@/store';

// Default mock user ID for development
const MOCK_USER_ID = 'mock-user-1';

// Helper function to get user ID from state
const getUserId = (state: RootState): string => {
  const userId = state.auth.user?.id;
  if (!userId) {
    console.warn('No authenticated user found. Using mock user.');
    return MOCK_USER_ID;
  }
  return userId;
};

// Helper function to apply filters to bucket list items
const applyFilters = (items: BucketListItem[], filters: BucketListFilter): BucketListItem[] => {
  let result = [...items];

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(item => item.tags && item.tags.some(tag => filters.tags!.includes(tag)));
  }

  // Filter by priority
  if (filters.priority && filters.priority.length > 0) {
    result = result.filter(item => item.priority && filters.priority!.includes(item.priority));
  }

  // Filter by visited status
  if (filters.visited !== undefined) {
    result = result.filter(item => (filters.visited ? !!item.visitedAt : !item.visitedAt));
  }

  // Filter by search term
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(
      item =>
        item.venue.name.toLowerCase().includes(term) ||
        (item.notes && item.notes.toLowerCase().includes(term))
    );
  }

  // Sort results
  if (filters.sortBy) {
    result.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'dateAdded':
          comparison = a.addedAt - b.addedAt;
          break;
        case 'name':
          comparison = a.venue.name.localeCompare(b.venue.name);
          break;
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = a.priority ? priorityOrder[a.priority] : 3;
          const bPriority = b.priority ? priorityOrder[b.priority] : 3;
          comparison = aPriority - bPriority;
          break;
        case 'plannedDate':
          const aDate = a.plannedVisitDate ?? Number.MAX_SAFE_INTEGER;
          const bDate = b.plannedVisitDate ?? Number.MAX_SAFE_INTEGER;
          comparison = aDate - bDate;
          break;
        default:
          break;
      }

      // Apply sort direction
      return filters.sortDirection === 'desc' ? -comparison : comparison;
    });
  }

  return result;
};

// Async thunk to enhance bucket list items with venue details
const enhanceBucketListWithVenueDetails = async (
  items: BucketListItem[]
): Promise<BucketListItem[]> => {
  const enhancedItems: BucketListItem[] = [];

  for (const item of items) {
    // If venue is missing or incomplete, fetch venue details
    if (!item.venue || Object.keys(item.venue).length === 0) {
      try {
        const venueId = item.venueId || item.venue?.id || item.fsq_id;
        if (venueId) {
          const response = await foursquareService.getVenueDetails(venueId);
          enhancedItems.push({
            ...item,
            venue: response.venue,
          });
        } else {
          // Include item without venue details if no ID available
          enhancedItems.push(item);
        }
      } catch (error) {
        console.error(`Failed to fetch venue details for ${item.venueId}:`, error);
        // Still include the item even without venue details
        enhancedItems.push(item);
      }
    } else {
      enhancedItems.push(item);
    }
  }

  return enhancedItems;
};

// Async thunk for fetching bucket list
export const fetchBucketList = createAsyncThunk('bucketList/fetch', async (_, { getState }) => {
  console.log('Fetching bucket list...');
  const state = getState() as RootState;
  const userId = getUserId(state);
  console.log('Current user ID:', userId);

  // Since we're using redux-persist, the items are already in state
  // We just need to enhance them with venue details if needed
  const items = state.bucketList.items;
  console.log('Current items in state:', JSON.stringify(items, null, 4));

  // Enhance items with venue details if needed
  const enhancedItems = await enhanceBucketListWithVenueDetails(items);
  console.log('Enhanced items with venue details:', JSON.stringify(enhancedItems, null, 4));

  return enhancedItems;
});

// Async thunk for adding to bucket list
export const addToBucketList = createAsyncThunk(
  'bucketList/add',
  async (venue: any, { getState }) => {
    console.log('Adding to bucket list, venue:', venue);
    const state = getState() as RootState;
    const userId = getUserId(state);
    console.log('Current user ID:', userId);

    // Create bucket list item
    const venueId = venue.id ?? venue.fsq_id;
    const newItem: BucketListItem = {
      id: venueId, // Use the venue ID directly
      venueId: venueId,
      userId,
      venue: {
        id: venueId,
        name: venue.name,
        category:
          venue.categories && venue.categories.length > 0 ? venue.categories[0].name : 'Restaurant',
        address: venue.location
          ? venue.location.formatted_address ??
            venue.location.formattedAddress ??
            [venue.location.address, venue.location.locality, venue.location.region]
              .filter(Boolean)
              .join(', ')
          : venue.address ?? '',
        coordinates: venue.geocodes?.main
          ? {
              latitude: venue.geocodes.main.latitude,
              longitude: venue.geocodes.main.longitude,
            }
          : venue.location?.lat && venue.location?.lng
          ? {
              latitude: venue.location.lat,
              longitude: venue.location.lng,
            }
          : venue.coordinates ?? undefined,
        photo:
          venue.photos && venue.photos.length > 0
            ? `${venue.photos[0].prefix}original${venue.photos[0].suffix}`
            : venue.photo ?? undefined,
        rating: venue.rating,
      },
      addedAt: Date.now(),
      notes: '',
      tags: [],
      priority: 'medium',
    };

    console.log('Created new bucket list item:', newItem);

    // Check if item already exists
    const existingItem = state.bucketList.items.find(
      (item: BucketListItem) =>
        item.venue.id === newItem.venue.id || item.venueId === newItem.venue.id
    );

    if (existingItem) {
      console.log('Item already exists for this venue, not adding duplicate');
      throw new Error('Item already exists in bucket list');
    }

    return newItem;
  }
);

// Async thunk for updating bucket list item
export const updateBucketListItem = createAsyncThunk(
  'bucketList/update',
  async ({ id, updates }: { id: string; updates: Partial<BucketListItem> }, { getState }) => {
    console.log('Updating bucket list item:', { id, updates });
    const state = getState() as RootState;
    const userId = getUserId(state);

    // Get current item from state
    const currentItem = state.bucketList.items.find((item: BucketListItem) => item.id === id) as
      | BucketListItem
      | undefined;

    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Make sure the user owns this item
    if (currentItem.userId && currentItem.userId !== userId) {
      throw new Error('Cannot update an item that belongs to another user');
    }

    // Create updated item
    const updatedItem: BucketListItem = {
      ...currentItem,
      ...updates,
      userId, // Ensure userId is set
    };

    return updatedItem;
  }
);

// Async thunk for removing from bucket list
export const removeFromBucketList = createAsyncThunk(
  'bucketList/remove',
  async (itemId: string, { getState }) => {
    console.log('Removing from bucket list, item ID:', itemId);
    const state = getState() as RootState;
    const userId = getUserId(state);

    // Get the item to check ownership
    const item = state.bucketList.items.find((item: BucketListItem) => item.id === itemId) as
      | BucketListItem
      | undefined;

    if (!item) {
      throw new Error('Item not found');
    }

    // Make sure the user owns this item
    if ('userId' in item && item.userId && item.userId !== userId) {
      throw new Error('Cannot remove an item that belongs to another user');
    }

    return itemId;
  }
);

// Async thunk for marking as visited
export const markAsVisited = createAsyncThunk(
  'bucketList/markAsVisited',
  async (
    { id, rating, review }: { id: string; rating?: number; review?: string },
    { getState }
  ) => {
    console.log('Marking as visited:', { id, rating, review });
    const state = getState() as RootState;
    const userId = getUserId(state);

    // Get current item from state
    const currentItem = state.bucketList.items.find((item: BucketListItem) => item.id === id) as
      | BucketListItem
      | undefined;

    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Make sure the user owns this item
    if ('userId' in currentItem && currentItem.userId && currentItem.userId !== userId) {
      throw new Error('Cannot update an item that belongs to another user');
    }

    // Create updated item
    const updatedItem: BucketListItem = {
      ...currentItem,
      visitedAt: Date.now(),
      userRating: rating,
      review,
    };

    return updatedItem;
  }
);
