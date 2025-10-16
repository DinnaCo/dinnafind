/**
 * Jest setup file
 * Runs before all tests to configure the test environment
 */

// Suppress act warnings from third-party components like @expo/vector-icons and @rneui/themed
// These components trigger async state updates that we don't control
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('An update to Icon inside a test was not wrapped in act') ||
       args[0].includes('An update to Root inside a test was not wrapped in act') ||
       args[0].includes('When testing, code that causes React state updates should be wrapped into act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('No authenticated user found') ||
       args[0].includes('Using mock user') ||
       args[0].includes('SafeAreaView has been deprecated'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock console methods to reduce noise in tests (optional - can be commented out if needed)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
//   log: jest.fn(),
//   debug: jest.fn(),
// };

// Set test environment variables
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
process.env.APP_VARIANT = 'test';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'test-google-api-key';

// Set __DEV__ to false for tests
;(globalThis as any).__DEV__ = false;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock logger globally (uses manual mock from utils/__mocks__/logger.ts)
jest.mock('@/utils/logger');

// Mock expo modules that aren't critical for unit tests
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  unregisterAllTasksAsync: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  getRegisteredTasksAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  signInAsync: jest.fn(),
}));

// Mock Google auth
jest.mock('@/services/GoogleAuthNoSession', () => ({
  signInWithGoogle: jest.fn(),
}));

// Mock redux-saga to prevent sagas from running in tests
jest.mock('redux-saga', () => {
  const originalModule = jest.requireActual('redux-saga');
  // Create a proper middleware function that returns the saga middleware API
  const createMockSagaMiddleware = () => {
    const mockMiddleware = (() => (next: any) => (action: any) => next(action)) as any;
    mockMiddleware.run = jest.fn();
    mockMiddleware.setContext = jest.fn();
    return mockMiddleware;
  };

  return {
    ...originalModule,
    default: createMockSagaMiddleware,
  };
});

// Mock geofencing middleware
jest.mock('@/store/geofencingMiddleware', () => ({
  geofencingMiddleware: (store: any) => (next: any) => (action: any) => next(action),
}));

// Mock supabase middleware
jest.mock('@/store/supabaseMiddleware', () => ({
  createSupabaseMiddleware: () => (store: any) => (next: any) => (action: any) => next(action),
  supabaseMiddleware: (store: any) => (next: any) => (action: any) => next(action),
}));

// Mock redux-persist to prevent timer leaks
jest.mock('redux-persist', () => {
  const real = jest.requireActual('redux-persist');
  return {
    ...real,
    persistStore: () => {
      return {
        purge: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        persist: jest.fn(),
      };
    },
    persistReducer: (_config: any, reducer: any) => reducer,
  };
});

// Mock GeofencingService
jest.mock('@/services/GeofencingService', () => ({
  default: {
    addGeofence: jest.fn(),
    removeGeofence: jest.fn(),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
  },
}));

// Mock the root saga
jest.mock('@/store/rootSaga', () => ({
  rootSaga: function* () {
    yield;
  },
}));

// Reset all mocks after each test
afterEach(async () => {
  jest.clearAllMocks();
  // Give pending promises time to resolve
  await new Promise(resolve => setImmediate(resolve));
});

// Clean up any pending timers and async operations
afterAll(async () => {
  jest.clearAllTimers();
  jest.useRealTimers();
  // Final cleanup for any remaining async operations
  await new Promise(resolve => setImmediate(resolve));
});
