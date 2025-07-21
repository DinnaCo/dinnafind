/**
 * Runtime environment detection utilities
 * These utilities help detect the current runtime environment (development, production, test)
 * in a way that works across different platforms (Node.js, React Native, Web)
 */

// Safely check if we're in a Node.js environment
export const isNodeEnvironment = (): boolean => {
  return typeof process !== 'undefined' && process.release && process.release.name === 'node';
};

// Get the current environment (development, production, test)
export const getEnvironment = (): string => {
  // For React Native, we'll always consider it 'production' unless explicitly set
  if (!isNodeEnvironment()) {
    // Check if __DEV__ is available (React Native)
    if (typeof __DEV__ !== 'undefined') {
      return __DEV__ ? 'development' : 'production';
    }
    return 'production';
  }

  // For Node.js environments
  return (process as any).env.NODE_ENV ?? 'production';
};

// Check if we're in development mode
export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

// Check if we're in production mode
export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

// Check if we're in test mode
export const isTest = (): boolean => {
  return getEnvironment() === 'test';
};

// Check if Redux DevTools should be enabled
export const shouldEnableReduxDevTools = (): boolean => {
  // Enable in development mode and if the extension is available
  return (
    !isProduction() && typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__
  );
};
