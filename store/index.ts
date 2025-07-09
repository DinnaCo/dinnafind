import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { persistReducer, persistStore } from 'redux-persist';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';

import { rootSaga } from './rootSaga';
import { geofencingMiddleware } from './geofencingMiddleware';

// Import reducers
import authReducer from './slices/authSlice';
import bucketListReducer from './slices/bucketListSlice';
import uiReducer from './slices/uiSlice';
import venuesReducer from './slices/venuesSlice';
import locationReducer from './slices/locationSlice';
const createSagaMiddleware = require('redux-saga').default;

// Import root saga

// Configure redux-persist
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'bucketList', 'ui'],
  debug: process.env.EXPO_DEV === 'development',
};

// Combine all reducers
const rootReducer = {
  auth: authReducer,
  venues: venuesReducer,
  bucketList: bucketListReducer,
  ui: uiReducer,
  location: locationReducer, // <-- Added location reducer
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, combineReducers(rootReducer));

// Setup saga middleware
const sagaMiddleware = createSagaMiddleware();

// Redux DevTools enhancer for React Native
const createDebugger = () => {
  // For React Native Debugger
  const composeEnhancers = (globalThis as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
  if (composeEnhancers) {
    return composeEnhancers({
      name: 'DinnaFind Mobile',
      trace: true,
      traceLimit: 25,
    });
  }

  return undefined;
};

// Configure store with enhanced dev tools
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
      thunk: true,
      immutableCheck: {
        warnAfter: 128,
      },
    }).concat(sagaMiddleware, geofencingMiddleware),
  devTools: false,
  enhancers: getDefaultEnhancers => getDefaultEnhancers().concat(devToolsEnhancer()) as any,
});

// Run saga middleware
sagaMiddleware.run(rootSaga);

// Create persistor
export const persistor = persistStore(store, null, () => {
  if (process.env.EXPO_DEV === 'development') {
    console.log('✅ Redux persist rehydration complete');
  }
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type { VenuesState } from '@/store/slices/venuesSlice';

// Create typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Development tools and debugging helpers
if (__DEV__) {
  // globalThis store access for debugging
  (globalThis as any).store = store;
  (globalThis as any).getState = () => store.getState();
  (globalThis as any).dispatch = store.dispatch;

  // Helper functions for bucket list debugging
  (globalThis as any).getBucketList = () => store.getState().bucketList;
  (globalThis as any).getAuth = () => store.getState().auth;
  (globalThis as any).clearBucketList = () => {
    const userId = store.getState().auth.user?.id || 'mock-user-1';
    return AsyncStorage.removeItem(`bucketList_${userId}`);
  };
  (globalThis as any).viewAsyncStorage = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    console.log('AsyncStorage contents:', stores);
    return stores;
  };

  // Action dispatchers for debugging
  (globalThis as any).debugActions = {
    fetchBucketList: () => store.dispatch({ type: 'bucketList/fetchBucketList' }),
    addTestItem: () =>
      store.dispatch({
        type: 'bucketList/addToBucketList',
        payload: {
          fsq_id: `test-venue-${Date.now()}`,
          name: 'Test Restaurant',
          categories: [{ name: 'Restaurant' }],
          location: { formatted_address: 'Test Address' },
        },
      }),
  };

  // Log initial state
  console.log('🏪 Redux Store initialized');
  console.log('📊 Initial State:', JSON.stringify(store.getState(), null, 4));

  // Subscribe to state changes for debugging
  store.subscribe(() => {
    const state = store.getState();
    console.log('🔄 State updated - Bucket List items:', state.bucketList.items.length);
  });
}
