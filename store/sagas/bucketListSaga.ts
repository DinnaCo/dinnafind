import AsyncStorage from '@react-native-async-storage/async-storage';
import { type PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeLatest, select, delay, take, all, fork } from 'redux-saga/effects';

import { unifiedSearchService } from '@/api/unifiedSearch';
import { type BucketListItem } from '@/models/bucket-list';
import { type RootState } from '@/store';
import {
  fetchBucketList,
  addToBucketList,
  updateBucketListItem,
  removeFromBucketList,
  markAsVisited,
  setNotificationEnabled,
  setAllNotificationsEnabled,
} from '@/store/slices/bucketListSlice';
import { selectVenue } from '@/store/slices/venuesSlice';
import { selectUser } from '@/store/slices/authSlice';
import GeofencingService from '@/services/GeofencingService';
import { logger } from '@/utils/logger';

/**
 * BucketList Saga
 * Handles async operations for the bucket list feature
 */

// Helper function to get storage key for a user
const getStorageKey = (userId: string) => `bucketList_${userId}`;

// Helper function to get current user ID from state
function* getCurrentUserId(): Generator<any, string, any> {
  const user = yield select(selectUser);
  if (!user?.id) {
    logger.warn('No authenticated user found. Using mock user.');
    return 'mock-user-1'; // Fallback to mock user if no user is logged in
  }
  return user.id;
}

/**
 * Handle fetch bucket list
 * Fetches the user's bucket list from the backend/Firebase
 */
function* handleFetchBucketList(): Generator<any, void, any> {
  try {
    logger.info('Fetching bucket list...');
    const userId: string = yield* getCurrentUserId();
    logger.info('Current user ID:', userId);

    // Call API to get user's bucket list
    // In a real app, this would be a call to your backend API
    // or a service like Firebase
    const items = yield call(fetchBucketListFromStorage, userId);
    logger.info('Fetched items from storage:', items);

    // Enhance items with venue details if needed
  yield call(enhanceBucketListWithVenueDetails, items);


    // Since we're using async thunks now, we don't need to dispatch actions here
    // The thunk will handle the state updates
    logger.info('Bucket list fetched successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bucket list';
    logger.error('Failed to fetch bucket list:', error);
    // Since we're using async thunks, errors are handled by the thunk
  }
}

// Mock function to fetch bucket list from AsyncStorage
async function fetchBucketListFromStorage(userId: string): Promise<BucketListItem[]> {
  try {
    logger.info(`Fetching items from AsyncStorage for user ${userId}`);
    // Get items from AsyncStorage
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    logger.info('Raw stored items:', storedItems);
    if (storedItems) {
      return JSON.parse(storedItems);
    }
  } catch (error) {
    logger.error('Error reading from AsyncStorage:', error);
  }

  // Return empty array if nothing found or error
  return [];
}

// Helper function to enhance bucket list items with venue details
function* enhanceBucketListWithVenueDetails(
  items: BucketListItem[]
): Generator<any, BucketListItem[], any> {
  // For each item, ensure we have complete venue details
  const enhancedItems: BucketListItem[] = [];

  for (const item of items) {
    // If venue is missing or incomplete, fetch venue details
    if (!item.venue || Object.keys(item.venue).length === 0) {
      try {
        const venueId = item.venueId || item.venue.id || item.fsq_id;
        if (venueId) {
          const response: any = yield call(
            unifiedSearchService.getVenueDetails.bind(unifiedSearchService),
            venueId
          );

          if (response) {
            enhancedItems.push({
              ...item,
              venue: response,
            });
          } else {
            enhancedItems.push(item);
          }
        } else {
          // Include item without venue details if no ID available
          enhancedItems.push(item);
        }
      } catch (error) {
        logger.error(`Failed to fetch venue details for ${item.venueId}:`, error);
        // Still include the item even without venue details
        enhancedItems.push(item);
      }
    } else {
      enhancedItems.push(item);
    }
  }

  return enhancedItems;
}

/**
 * Handle add to bucket list
 * Adds a venue to the user's bucket list
 */
function* handleAddToBucketList(action: PayloadAction<any>): Generator<any, void, any> {
  try {
    logger.info('Adding to bucket list, payload:', action.payload);
    const userId: string = yield* getCurrentUserId();
    logger.info('Current user ID:', userId);

    // Get the venue data from the action payload
    const venue = action.payload;

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

    logger.info('Created new bucket list item:', newItem);

    // Save to AsyncStorage
    yield call(saveBucketListItemToStorage, newItem);

    // Refresh the bucket list to get the updated items
    yield put(fetchBucketList());
    logger.info('Triggered bucket list refresh after adding item');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add to bucket list';
    logger.error('Failed to add to bucket list:', error);
    // Since we're using async thunks, errors are handled by the thunk
  }
}

// Function to save bucket list item to AsyncStorage
async function saveBucketListItemToStorage(item: BucketListItem): Promise<void> {
  try {
    const userId = item.userId ?? 'mock-user-1'; // Fallback to mock user if no user ID
    logger.info(`Saving item to AsyncStorage for user ${userId}`);
    // Get existing items
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    const items = storedItems ? JSON.parse(storedItems) : [];
    logger.info('Existing items:', items);

    // Check if item already exists by venue ID to prevent duplicates
    const existingIndex = items.findIndex(
      (existingItem: BucketListItem) =>
        existingItem.venue.id === item.venue.id || existingItem.venueId === item.venue.id
    );

    if (existingIndex === -1) {
      items.push(item);
      logger.info('Added new item to items list');
    } else {
      logger.info('Item already exists for this venue, not adding duplicate');
      return; // Don't add duplicate
    }

    // Save back to AsyncStorage
    const itemsJson = JSON.stringify(items);
    logger.info('Saving items to AsyncStorage:', itemsJson);
    await AsyncStorage.setItem(getStorageKey(userId), itemsJson);
    logger.info('Successfully saved to AsyncStorage');
  } catch (error) {
    logger.error('Error saving to AsyncStorage:', error);
    throw error;
  }
}

/**
 * Handle update bucket list item
 * Updates an existing bucket list item
 */
function* handleUpdateBucketListItem(
  action: PayloadAction<{
    id: string;
    updates: Partial<BucketListItem>;
  }>
): Generator<any, void, any> {
  try {
    logger.info('Updating bucket list item:', action.payload);
    const userId: string = yield* getCurrentUserId();
    const { id, updates } = action.payload;

    // Get current item from state
    const state: RootState = yield select();
    const currentItem = state.bucketList.items.find(item => item.id === id);

    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Create updated item
    const updatedItem: BucketListItem = {
      ...currentItem,
      ...updates,
      userId, // Ensure userId is set
    };

    // Make sure the user owns this item
    if (currentItem.userId && currentItem.userId !== userId) {
      throw new Error('Cannot update an item that belongs to another user');
    }

    // Save to AsyncStorage
    yield call(updateBucketListItemInStorage, updatedItem);

    // Refresh the bucket list to get the updated items
    yield put(fetchBucketList());
    logger.info('Triggered bucket list refresh after updating item');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update bucket list item';
    logger.error('Failed to update bucket list item:', error);
    // Since we're using async thunks, errors are handled by the thunk
  }
}

// Function to update bucket list item in AsyncStorage
async function updateBucketListItemInStorage(item: BucketListItem): Promise<void> {
  try {
    const userId = item.userId ?? 'mock-user-1'; // Fallback to mock user if no user ID
    logger.info(`Updating item in AsyncStorage for user ${userId}`);
    // Get existing items
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    if (storedItems) {
      const items = JSON.parse(storedItems);
      logger.info('Existing items:', items);

      // Find and update the item
      const index = items.findIndex((existingItem: { id: string }) => existingItem.id === item.id);
      if (index !== -1) {
        items[index] = item;
        logger.info('Updated item at index', index);

        // Save back to AsyncStorage
        await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(items));
        logger.info('Successfully saved updated items to AsyncStorage');
      } else {
        logger.info('Item not found in existing items');
      }
    } else {
      logger.info('No existing items found');
    }
  } catch (error) {
    logger.error('Error updating in AsyncStorage:', error);
    throw error;
  }
}

/**
 * Handle remove from bucket list
 * Removes an item from the user's bucket list
 */
function* handleRemoveFromBucketList(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    logger.info('Removing from bucket list, item ID:', action.payload);
    const userId: string = yield* getCurrentUserId();
    const itemId = action.payload;

    // Delete from AsyncStorage
    yield call(deleteBucketListItemFromStorage, itemId, userId);

    // Handle success
    yield put(removeFromBucketList(itemId));
    logger.info('Remove from bucket list success action dispatched');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to remove from bucket list';
    logger.error('Failed to remove from bucket list:', error);
    // Since we're using async thunks, errors are handled by the thunk
  }
}

// Function to delete bucket list item from AsyncStorage
async function deleteBucketListItemFromStorage(itemId: string, userId: string): Promise<void> {
  try {
    logger.info(`Deleting item from AsyncStorage for user ${userId}, item ID: ${itemId}`);
    // Get existing items
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    if (storedItems) {
      let items = JSON.parse(storedItems);
      logger.info('Existing items:', items);

      // Filter out the item to remove
      const oldLength = items.length;
      items = items.filter((item: { id: string }) => item.id !== itemId);
      logger.info(`Removed ${oldLength - items.length} items`);

      // Save back to AsyncStorage
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(items));
      logger.info('Successfully saved updated items to AsyncStorage');
    } else {
      logger.info('No existing items found');
    }
  } catch (error) {
    logger.error('Error deleting from AsyncStorage:', error);
  }
}

/**
 * Handle mark as visited
 * Marks a bucket list item as visited
 */
function* handleMarkAsVisited(
  action: PayloadAction<{
    id: string;
    rating?: number;
    review?: string;
  }>
): Generator<any, void, any> {
  try {
    logger.info('Marking as visited:', action.payload);
    const userId: string = yield* getCurrentUserId();
    const { id, rating, review } = action.payload;

    // Get current item from state
    const state: RootState = yield select();
    const currentItem = state.bucketList.items.find(item => item.id === id);

    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Create updated item
    const updatedItem: BucketListItem = {
      ...currentItem,
      visitedAt: Date.now(),
      userRating: rating,
      review,
    };

    // Save to AsyncStorage
    yield call(updateBucketListItemInStorage, updatedItem);

    // Refresh the bucket list to get the updated items
    yield put(fetchBucketList());
    logger.info('Triggered bucket list refresh after marking as visited');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to mark as visited';
    logger.error('Failed to mark as visited:', error);
    // Since we're using async thunks, errors are handled by the thunk
  }
}

/**
 * Watch for bucket list actions
 */
export function* watchBucketList() {
  logger.info('Setting up bucket list saga watchers');
  // For async thunks, we need to use the action type strings directly
  yield takeLatest('bucketList/fetch', handleFetchBucketList);
  yield takeLatest('bucketList/add', handleAddToBucketList);
  yield takeLatest('bucketList/update', handleUpdateBucketListItem);
  yield takeLatest('bucketList/remove', handleRemoveFromBucketList);
  yield takeLatest('bucketList/markAsVisited', handleMarkAsVisited);
}

function* syncGeofencesWithBucketList() {
  // Debounce: wait for 500ms after the last change
  yield delay(500);
  // Get the latest bucket list from state
  const state: RootState = yield select();
  const items = state.bucketList.items;
  // Only include items with notificationsEnabled and coordinates
  const geofences = items
    .filter(item => item.notificationsEnabled && item.venue?.coordinates)
    .map(item => ({
      id: item.id,
      name: item.venue.name,
      latitude: item.venue.coordinates!.latitude,
      longitude: item.venue.coordinates!.longitude,
      radius: 100, // Add required radius property
    }));

  // Remove all existing geofences before adding new ones
  // We need to remove them one by one since there's no removeAllGeofences method
  const existingGeofences = GeofencingService.geofences;
  for (const existingGeofence of existingGeofences) {
    yield call(GeofencingService.removeGeofence, existingGeofence.id);
  }

  if (geofences.length > 0) {
    for (const geofence of geofences) {
      yield call(GeofencingService.addGeofence, geofence);
    }
  }

  // Save a last update timestamp for notification suppression
  yield call(AsyncStorage.setItem, 'geofence_last_update', Date.now().toString());
  logger.info(
    '[Geofencing] Synced geofences with bucket list:',
    geofences.map(g => g.name)
  );
}

function* watchBucketListGeofenceSync() {
  // Listen for all relevant bucket list changes
  while (true) {
    yield take([
      'bucketList/add/fulfilled',
      'bucketList/remove/fulfilled',
      'bucketList/update/fulfilled',
      setNotificationEnabled.type,
      setAllNotificationsEnabled.type,
    ]);
    yield* syncGeofencesWithBucketList();
  }
}

// At the end of your saga file, fork this watcher
export function* bucketListRootSaga() {
  yield all([fork(watchBucketList), fork(watchBucketListGeofenceSync)]);
}
