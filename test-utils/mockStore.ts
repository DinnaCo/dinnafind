/**
 * Mock Redux store for testing
 * Provides a simple store without persistence or sagas
 */

import { configureStore, createSlice } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import venuesReducer from '@/store/slices/venuesSlice';
import locationReducer from '@/store/slices/locationSlice';
import type { BucketListState } from '@/models/bucket-list';

// Create a simple bucket list reducer for testing
// This avoids Jest module resolution issues with the actual bucketListSlice
const initialBucketListState: BucketListState = {
  items: [],
  filteredItems: [],
  filters: {},
  loading: false,
  error: null,
  masterNotificationsEnabled: false,
  distanceMiles: 5,
};

const bucketListSlice = createSlice({
  name: 'bucketList',
  initialState: initialBucketListState,
  reducers: {},
});

const bucketListReducer = bucketListSlice.reducer;

/**
 * Creates a mock store with optional preloaded state
 * Use this in tests that need Redux
 */
export const createMockStore = (preloadedState = {}) => {
  const reducers = {
    auth: authReducer,
    venues: venuesReducer,
    bucketList: bucketListReducer,
    ui: uiReducer,
    location: locationReducer,
  };
  return configureStore({
    reducer: reducers,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
};

/**
 * Default mock store with initial state
 */
export const mockStore = createMockStore();

/**
 * Type for mock store
 */
export type MockStore = ReturnType<typeof createMockStore>;
