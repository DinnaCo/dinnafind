/**
 * Global mock for @sentry/react-native
 * Prevents Sentry from running in tests
 */

export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const captureEvent = jest.fn();
export const addBreadcrumb = jest.fn();
export const setUser = jest.fn();
export const setTag = jest.fn();
export const setTags = jest.fn();
export const setExtra = jest.fn();
export const setExtras = jest.fn();
export const setContext = jest.fn();
export const withScope = jest.fn((callback) => callback({}));
export const configureScope = jest.fn((callback) => callback({}));

export const Severity = {
  Fatal: 'fatal',
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
  Debug: 'debug',
  Log: 'log',
};

export default {
  init,
  captureException,
  captureMessage,
  captureEvent,
  addBreadcrumb,
  setUser,
  setTag,
  setTags,
  setExtra,
  setExtras,
  setContext,
  withScope,
  configureScope,
  Severity,
};
