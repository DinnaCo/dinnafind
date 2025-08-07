import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';

import { rootSaga } from './rootSaga';
import { geofencingMiddleware } from './geofencingMiddleware';
import { supabaseMiddleware } from './supabaseMiddleware';

// Import reducers
import authReducer from './slices/authSlice';
import bucketListReducer from './slices/bucketListSlice';
import uiReducer from './slices/uiSlice';
import venuesReducer from './slices/venuesSlice';
import locationReducer from './slices/locationSlice';
const createSagaMiddleware = require('redux-saga').default;

// Combine all reducers
const rootReducer = {
  auth: authReducer,
  venues: venuesReducer,
  bucketList: bucketListReducer,
  ui: uiReducer,
  location: locationReducer,
};

// Create root reducer (no longer persisted)
export const persistedReducer = combineReducers(rootReducer);

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

// Configure store with Supabase middleware instead of persist
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
      thunk: true,
      immutableCheck: {
        warnAfter: 128,
      },
    }).concat(sagaMiddleware, geofencingMiddleware, supabaseMiddleware),
  devTools: false,
  enhancers: getDefaultEnhancers => getDefaultEnhancers().concat(devToolsEnhancer()) as any,
});

// Run saga middleware
sagaMiddleware.run(rootSaga);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type { VenuesState } from '@/store/slices/venuesSlice';

// Create typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Development tools and debugging helpers
if (__DEV__) {
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
  console.log('🏪 Redux Store initialized with Supabase middleware');
  console.log('📊 Initial State:', JSON.stringify(store.getState(), null, 4));
}
