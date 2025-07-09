import AsyncStorage from '@react-native-async-storage/async-storage';
import { type PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeLatest, select } from 'redux-saga/effects';

import { foursquareService } from '@/api/foursquare';
import { type BucketListItem } from '@/models/bucket-list';
import { type RootState } from '@/store';
import {
  fetchBucketList,
  fetchBucketListSuccess,
  fetchBucketListFailure,
  addToBucketList,
  addToBucketListFailure,
  updateBucketListItem,
  updateBucketListItemFailure,
  removeFromBucketList,
  removeFromBucketListSuccess,
  removeFromBucketListFailure,
  markAsVisited,
  markAsVisitedFailure,
} from '@/store/slices/bucketListSlice';
import { selectVenue } from '@/store/slices/venuesSlice';
import { selectUser } from '@/store/slices/authSlice';

/**
 * BucketList Saga
 * Handles async operations for the bucket list feature
 */

// Helper function to get storage key for a user
const getStorageKey = (userId: string) => `bucketList_${userId}`;

// Helper function to get current user ID from state
function* getCurrentUserId() {
  const user = yield select(selectUser);
  if (!user?.id) {
    console.warn('No authenticated user found. Using mock user.');
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
    console.log('Fetching bucket list...');
    const userId: string = yield* getCurrentUserId();
    console.log('Current user ID:', userId);

    // Call API to get user's bucket list
    // In a real app, this would be a call to your backend API
    // or a service like Firebase
    const items = yield call(fetchBucketListFromStorage, userId);
    console.log('Fetched items from storage:', items);

    // Enhance items with venue details if needed
    const enhancedItems = yield call(enhanceBucketListWithVenueDetails, items);
    console.log('Enhanced items with venue details:', JSON.stringify(enhancedItems, null, 4));

    // Handle success
    yield put(fetchBucketListSuccess(enhancedItems));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bucket list';
    console.error('Failed to fetch bucket list:', error);
    yield put(fetchBucketListFailure(errorMessage));
  }
}

// Mock function to fetch bucket list from AsyncStorage
async function fetchBucketListFromStorage(userId: string): Promise<BucketListItem[]> {
  try {
    console.log(`Fetching items from AsyncStorage for user ${userId}`);
    // Get items from AsyncStorage
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    console.log('Raw stored items:', storedItems);
    if (storedItems) {
      return JSON.parse(storedItems);
    }
  } catch (error) {
    console.error('Error reading from AsyncStorage:', error);
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
            [foursquareService, foursquareService.getVenueDetails],
            venueId
          );

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
}

/**
 * Handle add to bucket list
 * Adds a venue to the user's bucket list
 */
function* handleAddToBucketList(action: PayloadAction<any>): Generator<any, void, any> {
  try {
    console.log('Adding to bucket list, payload:', action.payload);
    const userId: string = yield* getCurrentUserId();
    console.log('Current user ID:', userId);

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

    console.log('Created new bucket list item:', newItem);

    // Save to AsyncStorage
    yield call(saveBucketListItemToStorage, newItem);

    // Refresh the bucket list to get the updated items
    yield put(fetchBucketList());
    console.log('Triggered bucket list refresh after adding item');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add to bucket list';
    console.error('Failed to add to bucket list:', error);
    yield put(addToBucketListFailure(errorMessage));
  }
}

// Function to save bucket list item to AsyncStorage
async function saveBucketListItemToStorage(item: BucketListItem): Promise<void> {
  try {
    const userId = item.userId ?? 'mock-user-1'; // Fallback to mock user if no user ID
    console.log(`Saving item to AsyncStorage for user ${userId}`);
    // Get existing items
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    const items = storedItems ? JSON.parse(storedItems) : [];
    console.log('Existing items:', items);

    // Check if item already exists by venue ID to prevent duplicates
    const existingIndex = items.findIndex(
      (existingItem: BucketListItem) =>
        existingItem.venue.id === item.venue.id || existingItem.venueId === item.venue.id
    );

    if (existingIndex === -1) {
      items.push(item);
      console.log('Added new item to items list');
    } else {
      console.log('Item already exists for this venue, not adding duplicate');
      return; // Don't add duplicate
    }

    // Save back to AsyncStorage
    const itemsJson = JSON.stringify(items);
    console.log('Saving items to AsyncStorage:', itemsJson);
    await AsyncStorage.setItem(getStorageKey(userId), itemsJson);
    console.log('Successfully saved to AsyncStorage');
  } catch (error) {
    console.error('Error saving to AsyncStorage:', error);
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
    console.log('Updating bucket list item:', action.payload);
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
    console.log('Triggered bucket list refresh after updating item');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update bucket list item';
    console.error('Failed to update bucket list item:', error);
    yield put(updateBucketListItemFailure(errorMessage));
  }
}

// Function to update bucket list item in AsyncStorage
async function updateBucketListItemInStorage(item: BucketListItem): Promise<void> {
  try {
    const userId = item.userId ?? 'mock-user-1'; // Fallback to mock user if no user ID
    console.log(`Updating item in AsyncStorage for user ${userId}`);
    // Get existing items
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    if (storedItems) {
      const items = JSON.parse(storedItems);
      console.log('Existing items:', items);

      // Find and update the item
      const index = items.findIndex((existingItem: { id: string }) => existingItem.id === item.id);
      if (index !== -1) {
        items[index] = item;
        console.log('Updated item at index', index);

        // Save back to AsyncStorage
        await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(items));
        console.log('Successfully saved updated items to AsyncStorage');
      } else {
        console.log('Item not found in existing items');
      }
    } else {
      console.log('No existing items found');
    }
  } catch (error) {
    console.error('Error updating in AsyncStorage:', error);
    throw error;
  }
}

/**
 * Handle remove from bucket list
 * Removes an item from the user's bucket list
 */
function* handleRemoveFromBucketList(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    console.log('Removing from bucket list, item ID:', action.payload);
    const userId: string = yield* getCurrentUserId();
    const itemId = action.payload;

    // Delete from AsyncStorage
    yield call(deleteBucketListItemFromStorage, itemId, userId);

    // Handle success
    yield put(removeFromBucketListSuccess(itemId));
    console.log('Remove from bucket list success action dispatched');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to remove from bucket list';
    console.error('Failed to remove from bucket list:', error);
    yield put(removeFromBucketListFailure(errorMessage));
  }
}

// Function to delete bucket list item from AsyncStorage
async function deleteBucketListItemFromStorage(itemId: string, userId: string): Promise<void> {
  try {
    console.log(`Deleting item from AsyncStorage for user ${userId}, item ID: ${itemId}`);
    // Get existing items
    const storedItems = await AsyncStorage.getItem(getStorageKey(userId));
    if (storedItems) {
      let items = JSON.parse(storedItems);
      console.log('Existing items:', items);

      // Filter out the item to remove
      const oldLength = items.length;
      items = items.filter((item: { id: string }) => item.id !== itemId);
      console.log(`Removed ${oldLength - items.length} items`);

      // Save back to AsyncStorage
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(items));
      console.log('Successfully saved updated items to AsyncStorage');
    } else {
      console.log('No existing items found');
    }
  } catch (error) {
    console.error('Error deleting from AsyncStorage:', error);
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
    console.log('Marking as visited:', action.payload);
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
    console.log('Triggered bucket list refresh after marking as visited');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to mark as visited';
    console.error('Failed to mark as visited:', error);
    yield put(markAsVisitedFailure(errorMessage));
  }
}

/**
 * Watch for bucket list actions
 */
export function* watchBucketList() {
  console.log('Setting up bucket list saga watchers');
  yield takeLatest(fetchBucketList.type, handleFetchBucketList);
  yield takeLatest(addToBucketList.type, handleAddToBucketList);
  yield takeLatest(updateBucketListItem.type, handleUpdateBucketListItem);
  yield takeLatest(removeFromBucketList.type, handleRemoveFromBucketList);
  yield takeLatest(markAsVisited.type, handleMarkAsVisited);
}
