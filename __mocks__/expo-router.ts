/**
 * Global mock for expo-router
 * Automatically applied to all tests
 */

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
}));

export const useLocalSearchParams = jest.fn(() => ({}));

export const useGlobalSearchParams = jest.fn(() => ({}));

export const usePathname = jest.fn(() => '/');

export const useSegments = jest.fn(() => []);

export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

export const Stack = {
  Screen: 'Screen',
};

export const Tabs = {
  Screen: 'Screen',
};

export const Link = 'Link';

export const Redirect = 'Redirect';
