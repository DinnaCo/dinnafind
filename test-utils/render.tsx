/**
 * Custom render utilities for testing
 * Wraps components with necessary providers (Redux, Theme, etc.)
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@rneui/themed';
import { createMockStore, MockStore } from './mockStore';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: MockStore;
  preloadedState?: any;
}

/**
 * Custom render function that wraps components with all necessary providers
 * Use this instead of @testing-library's render for component tests
 *
 * @example
 * import { renderWithProviders } from '@/test-utils';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   // assertions...
 * });
 *
 * @example with custom store state
 * renderWithProviders(<MyComponent />, {
 *   preloadedState: {
 *     auth: { user: mockUser }
 *   }
 * });
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    store = createMockStore(),
    preloadedState,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create store with preloaded state if provided
  const testStore = preloadedState ? createMockStore(preloadedState) : store;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={testStore}>
        <ThemeProvider>{children}</ThemeProvider>
      </Provider>
    );
  }

  return {
    store: testStore,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Re-export everything from @testing-library/react-native
 * so tests can import from a single location
 */
export * from '@testing-library/react-native';
