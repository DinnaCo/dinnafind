import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { foursquareService } from '@/api/foursquare';
import { type BucketListItem, type BucketListFilter } from '@/models/bucket-list';
import { RootState } from '@/store';

// Helper function to get user ID from state
const getUserId = (state: RootState): string => {
  const userId = state.auth.user?.id;
  if (!userId) {
    console.warn('No authenticated user found. Using mock user.');
    return 'mock-user-1'; // Fallback to mock user if no user is logged in
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
  console.log('Current items in state:', items);

  // Enhance items with venue details if needed
  const enhancedItems = await enhanceBucketListWithVenueDetails(items);
  console.log('Enhanced items with venue details:', enhancedItems);

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
        heroImageUrl: venue.heroImageUrl,
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
      notificationsEnabled: true, // Default to enabled
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
    const currentItem = state.bucketList.items.find(item => item.id === id);

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
    const item = state.bucketList.items.find(item => item.id === itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    // Make sure the user owns this item
    if (item.userId && item.userId !== userId) {
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
    const currentItem = state.bucketList.items.find(item => item.id === id);

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
      visitedAt: Date.now(),
      userRating: rating,
      review,
    };

    return updatedItem;
  }
);

/**
 * Bucket List Slice
 * Manages bucket list items, filtering, and loading states
 * Integrated with async thunks to replace saga functionality
 */
const bucketListSlice = createSlice({
  name: 'bucketList',
  initialState: {
    items: [],
    filteredItems: [],
    filters: {},
    loading: false,
    error: null,
    masterNotificationsEnabled: true,
    distanceMiles: 1.25, // Default radius for alerts (approx 2000 meters)
  },
  reducers: {
    // Filter actions
    setFilters: (state, action: PayloadAction<BucketListFilter>) => {
      state.filters = action.payload;
      state.filteredItems = applyFilters(state.items, action.payload);
    },
    clearFilters: state => {
      state.filters = {};
      state.filteredItems = state.items;
    },

    // Set master notifications toggle
    setMasterNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.masterNotificationsEnabled = action.payload;
    },

    // Enable or disable notifications for all items
    setAllNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.items = state.items.map(item => ({
        ...item,
        notificationsEnabled: action.payload,
      }));
      state.filteredItems = applyFilters(state.items, state.filters);
    },

    // Enable all notifications (used when master toggle is turned on)
    enableAllNotifications: state => {
      state.items = state.items.map(item => ({
        ...item,
        notificationsEnabled: true,
      }));
      state.filteredItems = applyFilters(state.items, state.filters);
    },

    // Enable or disable notifications for a single item
    setNotificationEnabled: (state, action: PayloadAction<{ id: string; enabled: boolean }>) => {
      const { id, enabled } = action.payload;
      console.log(`Setting notification for ${id} to ${enabled}`);
      const index = state.items.findIndex(item => item.id === id);
      if (index !== -1) {
        console.log(
          `Found item at index ${index}, current value: ${state.items[index].notificationsEnabled}`
        );
        state.items[index].notificationsEnabled = enabled;
        state.filteredItems = applyFilters(state.items, state.filters);
      }
    },
    setDistanceMiles: (state, action: PayloadAction<number>) => {
      state.distanceMiles = action.payload;
    },
  },
  extraReducers: builder => {
    // Fetch bucket list
    builder
      .addCase(fetchBucketList.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBucketList.fulfilled, (state, action) => {
        state.items = action.payload;
        state.filteredItems = applyFilters(action.payload, state.filters);
        state.loading = false;
      })
      .addCase(fetchBucketList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch bucket list';
      });

    // Add to bucket list
    builder
      .addCase(addToBucketList.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToBucketList.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.filteredItems = applyFilters(state.items, state.filters);
        state.loading = false;
      })
      .addCase(addToBucketList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add to bucket list';
      });

    // Update bucket list item
    builder
      .addCase(updateBucketListItem.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBucketListItem.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
          state.filteredItems = applyFilters(state.items, state.filters);
        }
        state.loading = false;
      })
      .addCase(updateBucketListItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update bucket list item';
      });

    // Remove from bucket list
    builder
      .addCase(removeFromBucketList.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromBucketList.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
        state.filteredItems = applyFilters(state.items, state.filters);
        state.loading = false;
      })
      .addCase(removeFromBucketList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to remove from bucket list';
      });

    // Mark as visited
    builder
      .addCase(markAsVisited.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAsVisited.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
          state.filteredItems = applyFilters(state.items, state.filters);
        }
        state.loading = false;
      })
      .addCase(markAsVisited.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to mark as visited';
      });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  setMasterNotificationsEnabled,
  setAllNotificationsEnabled,
  enableAllNotifications,
  setNotificationEnabled,
  setDistanceMiles,
} = bucketListSlice.actions;

// Export reducer
export default bucketListSlice.reducer;

// Selectors
export const selectBucketListItems = (state: RootState) => state.bucketList.items;
export const selectFilteredBucketListItems = (state: RootState) => state.bucketList.filteredItems;
export const selectBucketListLoading = (state: RootState) => state.bucketList.loading;
export const selectBucketListError = (state: RootState) => state.bucketList.error;
export const selectBucketListFilters = (state: RootState) => state.bucketList.filters;
export const selectMasterNotificationsEnabled = (state: RootState) =>
  state.bucketList.masterNotificationsEnabled;
export const selectDistanceMiles = (state: RootState) => state.bucketList.distanceMiles;
export const selectIsVenueInBucketList = (venueId: string) => (state: RootState) =>
  state.bucketList.items.some(item => item.venue.id === venueId || item.venueId === venueId);

/**
 * Migration Notes:
 *
 * This slice combines the original bucketListSlice with async thunks that replace the saga.
 *
 * 1. Replace the old bucketListSlice.ts with this file
 * 2. Update store/index.ts to use bucketListReducer from slices/bucketListSlice
 * 3. Remove bucketListSaga from rootSaga
 * 4. Update components to use the same action names (they're now thunks)
 *
 * The persistedReducer will work correctly with this setup since it maintains
 * the same state structure (items, filteredItems, filters, loading, error).
 */
