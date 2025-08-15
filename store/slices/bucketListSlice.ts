import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { type BucketListItem, type BucketListFilter } from '@/models/bucket-list';
import { RootState } from '@/store';
import { logger } from '@/utils/logger';

// Helper function to get user ID from state
const getUserId = (state: RootState): string => {
  const userId = state.auth.user?.id;
  if (!userId) {
    logger.warn('No authenticated user found. Using mock user.');
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
// NOTE: We only work with persisted data and don't re-fetch details
// to avoid unnecessary API calls and preserve saved venue information.
const enhanceBucketListWithVenueDetails = async (
  items: BucketListItem[]
): Promise<BucketListItem[]> => {
  // Simply return items as-is. Any items in the bucket list already have
  // the venue data they were saved with. We don't attempt to re-fetch
  // to preserve the exact data that was saved and avoid API quota usage.
  logger.info(`Returning ${items.length} bucket list items without enhancement`);
  return items;
};

// Async thunk for fetching bucket list
export const fetchBucketList = createAsyncThunk('bucketList/fetch', async (_, { getState }) => {
  logger.info('Fetching bucket list...');
  const state = getState() as RootState;
  const userId = getUserId(state);
  logger.info('Current user ID:', userId);

  // Since we're using redux-persist, the items are already in state
  // We just need to enhance them with venue details if needed
  const items = state.bucketList.items;


  // Enhance items with venue details if needed
  const enhancedItems = await enhanceBucketListWithVenueDetails(items);


  return enhancedItems;
});

// Async thunk for adding to bucket list
export const addToBucketList = createAsyncThunk(
  'bucketList/add',
  async (venue: any, { getState }) => {
    logger.info('Adding to bucket list, venue:', venue);
    const state = getState() as RootState;
    const userId = getUserId(state);
    logger.info('Current user ID:', userId);

    // Create bucket list item
    const venueId = venue.id ?? venue.fsq_id;
    const newItem: BucketListItem = {
      id: venueId, // Use the venue ID directly
      venueId: venueId,
      userId,
      venue: {
        ...venue, // <-- preserves iconUrl and all other fields
        id: venueId, // (optional: to ensure id is always present/normalized)
      },
      addedAt: Date.now(),
      notes: '',
      tags: [],
      priority: 'medium',
      notificationsEnabled: true, // Default to enabled
    };

    logger.info('Created new bucket list item:', newItem);

    // Check if item already exists
    const existingItem = state.bucketList.items.find(
      (item: BucketListItem) =>
        item.venue.id === newItem.venue.id || item.venueId === newItem.venue.id
    );

    if (existingItem) {
      logger.info('Item already exists for this venue, not adding duplicate');
      throw new Error('Item already exists in bucket list');
    }

    return newItem;
  }
);

// Async thunk for updating bucket list item
export const updateBucketListItem = createAsyncThunk(
  'bucketList/update',
  async ({ id, updates }: { id: string; updates: Partial<BucketListItem> }, { getState }) => {
    logger.info('Updating bucket list item:', { id, updates });
    const state = getState() as RootState;
    const userId = getUserId(state);

    // Get current item from state
    const currentItem = state.bucketList.items.find((item: BucketListItem) => item.id === id);

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
    logger.info('Removing from bucket list, item ID:', itemId);
    const state = getState() as RootState;
    const userId = getUserId(state);

    // Get the item to check ownership
    const item = state.bucketList.items.find((item: BucketListItem) => item.id === itemId);

    if (!item) {
      throw new Error('Item not found');
    }

    // Make sure the user owns this item
    if (item.userId && item.userId !== userId) {
      throw new Error('Cannot remove an item that belongs to another user');
    }

    // Return both itemId and venue information for the middleware
    return {
      itemId,
      venueId: item.venueId || item.venue?.id,
      venueName: item.venue?.name
    };
  }
);

// Async thunk for marking as visited
export const markAsVisited = createAsyncThunk(
  'bucketList/markAsVisited',
  async (
    { id, rating, review }: { id: string; rating?: number; review?: string },
    { getState }
  ) => {
    logger.info('Marking as visited:', { id, rating, review });
    const state = getState() as RootState;
    const userId = getUserId(state);

    // Get current item from state
    const currentItem = state.bucketList.items.find((item: BucketListItem) => item.id === id);

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
    items: [] as BucketListItem[],
    filteredItems: [] as BucketListItem[],
    filters: {} as BucketListFilter,
    loading: false,
    error: null as string | null,
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
      logger.info(`Setting notification for ${id} to ${enabled}`);
      const index = state.items.findIndex(item => item.id === id);
      if (index !== -1) {
        logger.info(
          `Found item at index ${index}, current value: ${state.items[index].notificationsEnabled}`
        );
        state.items[index].notificationsEnabled = enabled;
        state.filteredItems = applyFilters(state.items, state.filters);
      }
    },

    // Set notification distance for a single item
    setNotificationDistance: (state, action: PayloadAction<{ id: string; distance: number }>) => {
      const { id, distance } = action.payload;
      logger.info(`Setting notification distance for ${id} to ${distance} miles`);
      const index = state.items.findIndex(item => item.id === id);
      if (index !== -1) {
        state.items[index].notificationDistance = distance;
        state.filteredItems = applyFilters(state.items, state.filters);
      }
    },

    // Migrate all restaurants without notificationDistance to use a specific distance
    migrateNotificationDistances: (state, action: PayloadAction<number>) => {
      const globalDistance = action.payload;
      let migratedCount = 0;

      state.items = state.items.map(item => {
        // Migrate from old alertDistance property or set new value
        if (item.notificationDistance === undefined) {
          migratedCount++;
          return {
            ...item,
            notificationDistance: item.alertDistance ?? globalDistance,
            alertDistance: undefined, // Remove deprecated property
          };
        }
        return item;
      });

      state.filteredItems = applyFilters(state.items, state.filters);
      logger.info(`Migrated ${migratedCount} restaurants to use notification distance of ${globalDistance} miles`);
    },

    // Set bucket list items from Supabase (for data loading)
    setBucketListItems: (state, action: PayloadAction<BucketListItem[]>) => {
      state.items = action.payload;
      state.filteredItems = applyFilters(action.payload, state.filters);
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
        state.items = state.items.filter(item => item.id !== action.payload.itemId);
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
  setAllNotificationsEnabled,
  enableAllNotifications,
  setNotificationEnabled,
  setNotificationDistance,
  migrateNotificationDistances,
  setBucketListItems,
} = bucketListSlice.actions;

// Export reducer
export default bucketListSlice.reducer;

// Selectors
export const selectBucketListItems = (state: RootState) => state.bucketList.items;
export const selectFilteredBucketListItems = (state: RootState) => state.bucketList.filteredItems;
export const selectBucketListLoading = (state: RootState) => state.bucketList.loading;
export const selectBucketListError = (state: RootState) => state.bucketList.error;
export const selectBucketListFilters = (state: RootState) => state.bucketList.filters;
export const selectMasterNotificationsEnabled = (state: RootState) => state.ui.masterNotificationsEnabled;
export const selectDistanceMiles = (state: RootState) => state.ui.distanceMiles;
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
