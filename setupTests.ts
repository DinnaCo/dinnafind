
process.env.APP_VARIANT = 'test';

// Global test setup - set __DEV__ first before any imports
;(globalThis as any).__DEV__ = false;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock logger globally (uses manual mock from utils/__mocks__/logger.ts)
jest.mock('@/utils/logger');
