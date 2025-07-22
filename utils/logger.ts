import * as Sentry from '@sentry/react-native';

// Simple logger utility to replace logger.info statements
// This provides a lightweight wrapper around Sentry logging

export const logger = {
  // Info level - replaces console.log
  info: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(message, data);
    }
    Sentry.addBreadcrumb({
      category: 'info',
      message,
      data,
      level: 'info',
    });
  },

  // Warn level - replaces console.warn
  warn: (message: string, data?: any) => {
    if (__DEV__) {
      console.warn(message, data);
    }
    Sentry.addBreadcrumb({
      category: 'warning',
      message,
      data,
      level: 'warning',
    });
  },

  // Error level - replaces console.error
  error: (message: string, error?: any) => {
    if (__DEV__) {
      console.error(message, error);
    }
    Sentry.captureException(error || new Error(message));
  },

  // Debug level - replaces console.log for debug info
  debug: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, data);
    }
    // Only add breadcrumb in development or when explicitly enabled
    if (__DEV__) {
      Sentry.addBreadcrumb({
        category: 'debug',
        message,
        data,
        level: 'debug',
      });
    }
  },

  // Geofence level - maps to appropriate method based on level parameter
  geofence: (message: string, data?: any, level?: 'info' | 'warn' | 'error' | 'debug') => {
    const logLevel = level || 'info';
    const prefixedMessage = `[Geofence] ${message}`;

    switch (logLevel) {
      case 'warn':
        logger.warn(prefixedMessage, data);
        break;
      case 'error':
        logger.error(prefixedMessage, data);
        break;
      case 'debug':
        logger.debug(prefixedMessage, data);
        break;
      default:
        logger.info(prefixedMessage, data);
        break;
    }
  },
};
