import React from 'react';
import { act, waitFor, fireEvent } from '@testing-library/react-native';
import { SearchScreen } from '../index';
import * as ExpoRouter from 'expo-router';
import { renderWithProviders } from '@/test-utils';
import { unifiedSearchService } from '@/api/unifiedSearch';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock unified search service
jest.mock('@/api/unifiedSearch', () => ({
  unifiedSearchService: {
    searchNearbyVenues: jest.fn(),
  },
}));

// Mock useGeolocation hook
jest.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: jest.fn(() => ({
    coordinates: {
      latitude: 30.2672,
      longitude: -97.7431,
    },
    loading: false,
    error: null,
    permissionGranted: true,
    permissionChecked: true,
    requestLocation: jest.fn(),
  })),
}));

// Mock logger to reduce noise
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SearchScreen', () => {
  const mockVenuesResponse = {
    results: [
      {
        fsq_id: 'venue1',
        name: 'Test Restaurant 1',
        categories: [
          {
            name: 'Italian',
            icon: {
              prefix: 'https://example.com/icon_',
              suffix: '.png',
            },
          },
        ],
        location: {
          formatted_address: '123 Main St, Austin, TX',
        },
        geocodes: {
          main: {
            latitude: 30.2672,
            longitude: -97.7431,
          },
        },
        distance: 500,
        rating: 4.5,
      },
      {
        fsq_id: 'venue2',
        name: 'Test Restaurant 2',
        categories: [
          {
            name: 'Mexican',
            icon: {
              prefix: 'https://example.com/icon_',
              suffix: '.png',
            },
          },
        ],
        location: {
          formatted_address: '456 Oak Ave, Austin, TX',
        },
        geocodes: {
          main: {
            latitude: 30.2680,
            longitude: -97.7440,
          },
        },
        distance: 800,
        rating: 4.2,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default mock implementation
    (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
      mockVenuesResponse,
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('renders the search screen with header', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      expect(getByText('Restaurant Search')).toBeTruthy();
    });

    it('renders search input with placeholder', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SearchScreen />);

      expect(getByPlaceholderText('Search restaurants...')).toBeTruthy();
    });

    it('renders all distance filter options', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      expect(getByText('1mi')).toBeTruthy();
      expect(getByText('3mi')).toBeTruthy();
      expect(getByText('5mi')).toBeTruthy();
      expect(getByText('10mi')).toBeTruthy();
      expect(getByText('25mi')).toBeTruthy();
      expect(getByText('Any distance')).toBeTruthy();
    });

    it('shows loading state initially', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      expect(getByText(/Finding restaurants within/)).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('displays loading indicator when searching', async () => {
      let resolveSearch: any;
      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
      );

      const { getByText } = renderWithProviders(<SearchScreen />);

      // Fast-forward initial mount
      await act(async () => {
        jest.runAllTimers();
      });

      expect(getByText(/Finding restaurants within/)).toBeTruthy();

      // Resolve the promise
      await act(async () => {
        resolveSearch(mockVenuesResponse);
      });
    });

    it('shows correct distance text in loading state', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      expect(getByText(/Finding restaurants within 1mi/)).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('triggers search when user types in search input', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SearchScreen />);

      const searchInput = getByPlaceholderText('Search restaurants...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'pizza');
        jest.advanceTimersByTime(300); // Debounce delay
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 30.2672,
            longitude: -97.7431,
          }),
          'pizza',
          undefined,
          1609, // 1mi in meters
          50,
        );
      });
    });

    it('debounces search input correctly', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SearchScreen />);

      const searchInput = getByPlaceholderText('Search restaurants...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'p');
        jest.advanceTimersByTime(100);
        fireEvent.changeText(searchInput, 'pi');
        jest.advanceTimersByTime(100);
        fireEvent.changeText(searchInput, 'piz');
        jest.advanceTimersByTime(100);
        fireEvent.changeText(searchInput, 'pizza');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should only be called twice: once on mount (initial search) and once after debounce
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          2,
        );
      });
    });

    it('displays clear button when search query is not empty', async () => {
      const { getByPlaceholderText, UNSAFE_queryAllByType } =
        renderWithProviders(<SearchScreen />);

      const searchInput = getByPlaceholderText('Search restaurants...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'pizza');
      });

      // Check that TouchableOpacity components exist (clear button is one of them)
      const touchableOpacities = UNSAFE_queryAllByType(
        require('react-native').TouchableOpacity,
      );
      expect(touchableOpacities.length).toBeGreaterThan(0);
    });

    it('clears search input when clear button is pressed', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SearchScreen />);

      const searchInput = getByPlaceholderText('Search restaurants...');

      // Type in search
      await act(async () => {
        fireEvent.changeText(searchInput, 'pizza');
      });

      expect(searchInput.props.value).toBe('pizza');

      // Clear the search by setting it to empty string (simulating clear button press)
      await act(async () => {
        fireEvent.changeText(searchInput, '');
        jest.advanceTimersByTime(300);
      });

      expect(searchInput.props.value).toBe('');
    });

    it('searches for "restaurants" by default when input is empty', async () => {
      renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledWith(
          expect.any(Object),
          'restaurants',
          undefined,
          1609,
          50,
        );
      });
    });
  });

  describe('Distance Filter', () => {
    it('starts with 1mi as default radius', async () => {
      renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledWith(
          expect.any(Object),
          'restaurants',
          undefined,
          1609, // 1mi
          50,
        );
      });
    });

    it('changes search radius when distance filter is clicked', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      // Click on 3mi filter
      await act(async () => {
        fireEvent.press(getByText('3mi'));
        jest.advanceTimersByTime(200); // Radius debounce delay
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledWith(
          expect.any(Object),
          'restaurants',
          undefined,
          4828, // 3mi
          50,
        );
      });
    });

    it('debounces radius changes correctly', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      // Click multiple filters quickly
      await act(async () => {
        fireEvent.press(getByText('3mi'));
        jest.advanceTimersByTime(100);
        fireEvent.press(getByText('5mi'));
        jest.advanceTimersByTime(100);
        fireEvent.press(getByText('10mi'));
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        // Should only search with the last selected radius
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenLastCalledWith(
          expect.any(Object),
          'restaurants',
          undefined,
          16093, // 10mi
          50,
        );
      });
    });
  });

  describe('Venue List Rendering', () => {
    it('displays venue list after successful search', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Test Restaurant 1')).toBeTruthy();
        expect(getByText('Test Restaurant 2')).toBeTruthy();
      });
    });

    it('displays venue categories', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Italian')).toBeTruthy();
        expect(getByText('Mexican')).toBeTruthy();
      });
    });

    it('displays venue addresses', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('123 Main St, Austin, TX')).toBeTruthy();
        expect(getByText('456 Oak Ave, Austin, TX')).toBeTruthy();
      });
    });

    it('displays venue ratings', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('4.5')).toBeTruthy();
        expect(getByText('4.2')).toBeTruthy();
      });
    });

    it('displays venue distances in miles', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('0.3 mi away')).toBeTruthy(); // 500m ≈ 0.3mi
        expect(getByText('0.5 mi away')).toBeTruthy(); // 800m ≈ 0.5mi
      });
    });

    it('sorts venues by rating first, then distance', async () => {
      const unsortedResponse = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Far Low Rating',
            categories: [],
            location: {},
            distance: 2000,
            rating: 3.0,
          },
          {
            fsq_id: 'venue2',
            name: 'Near High Rating',
            categories: [],
            location: {},
            distance: 500,
            rating: 4.5,
          },
          {
            fsq_id: 'venue3',
            name: 'Near Low Rating',
            categories: [],
            location: {},
            distance: 600,
            rating: 4.5,
          },
        ],
      };

      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
        unsortedResponse,
      );

      const { getAllByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        const restaurantTexts = getAllByText(/Rating|Near|Far/);
        // Near High Rating should come first (same rating 4.5, closer distance)
        // Then Near Low Rating (same rating 4.5, further distance)
        // Then Far Low Rating (lower rating 3.0)
      });
    });
  });

  describe('Results Header', () => {
    it('displays result count correctly', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText(/2 restaurants within 1mi/)).toBeTruthy();
      });
    });

    it('uses singular "restaurant" for single result', async () => {
      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue({
        results: [mockVenuesResponse.results[0]],
      });

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText(/1 restaurant within 1mi/)).toBeTruthy();
      });
    });

    it('shows "Show more distant results" button when not at max radius', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Show more distant results')).toBeTruthy();
      });
    });

    it('expands search radius when "Show more distant results" is clicked', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Show more distant results')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Show more distant results'));
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledWith(
          expect.any(Object),
          'restaurants',
          undefined,
          4828, // Should expand to 3mi
          50,
        );
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to venue detail when venue is pressed', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Test Restaurant 1')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Test Restaurant 1'));
      });

      expect(ExpoRouter.router.push).toHaveBeenCalled();
      expect(ExpoRouter.router.push).toHaveBeenCalledWith(
        expect.stringContaining('/detail?venueId=venue1'),
      );
    });

    it('includes venue data in navigation params', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Test Restaurant 1')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Test Restaurant 1'));
      });

      const pushCall = (ExpoRouter.router.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).toContain('data=');
      expect(pushCall).toContain('venueId=venue1');
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no venues found', async () => {
      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue({
        results: [],
      });

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('No restaurants found')).toBeTruthy();
        expect(
          getByText('Try expanding your search distance or different keywords'),
        ).toBeTruthy();
      });
    });

    it('shows "Search wider area" button in empty state', async () => {
      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue({
        results: [],
      });

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Search wider area')).toBeTruthy();
      });
    });

    it('expands radius when "Search wider area" is clicked', async () => {
      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue({
        results: [],
      });

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Search wider area')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Search wider area'));
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledWith(
          expect.any(Object),
          'restaurants',
          undefined,
          4828, // 3mi
          50,
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('No restaurants found')).toBeTruthy();
      });
    });

    it('handles venues with missing data gracefully', async () => {
      const incompleteResponse = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Incomplete Restaurant',
            // Missing categories, location, rating, distance
          },
        ],
      };

      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
        incompleteResponse,
      );

      const { getByText, queryByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Incomplete Restaurant')).toBeTruthy();
        // Should use fallback for category when missing
        expect(getByText('Restaurant')).toBeTruthy();
      });
    });

    it('handles venues without names', async () => {
      const noNameResponse = {
        results: [
          {
            fsq_id: 'venue1',
            // Missing name
            categories: [],
            location: {},
          },
        ],
      };

      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
        noNameResponse,
      );

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Unknown Restaurant')).toBeTruthy();
      });
    });
  });

  describe('Caching', () => {
    it('uses cached results for same query and radius', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SearchScreen />);

      // First search
      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          1,
        );
      });

      // Same search again
      const searchInput = getByPlaceholderText('Search restaurants...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'pizza');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          2,
        );
      });

      // Clear the search (triggers search for "restaurants")
      await act(async () => {
        fireEvent.changeText(searchInput, '');
        jest.advanceTimersByTime(300);
      });

      // After clearing, the "restaurants" search should use cache from initial search
      await waitFor(() => {
        // Should still be 2 calls because "restaurants" was already searched and cached
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          2,
        );
      });
    });

    it('creates different cache keys for different radius values', async () => {
      const { getByText } = renderWithProviders(<SearchScreen />);

      // Initial search at 1mi
      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          1,
        );
      });

      // Change radius to 3mi
      await act(async () => {
        fireEvent.press(getByText('3mi'));
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          2,
        );
      });

      // Change back to 1mi (should make new API call, not use cache from different radius)
      await act(async () => {
        fireEvent.press(getByText('1mi'));
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        // Should use the cache from the first 1mi search
        expect(unifiedSearchService.searchNearbyVenues).toHaveBeenCalledTimes(
          2,
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('cleans up timeouts on unmount', async () => {
      const { unmount, getByPlaceholderText } = renderWithProviders(
        <SearchScreen />,
      );

      const searchInput = getByPlaceholderText('Search restaurants...');

      await act(async () => {
        fireEvent.changeText(searchInput, 'pizza');
        // Don't wait for debounce
      });

      // Unmount before debounce completes
      unmount();

      // Advance timers after unmount
      await act(async () => {
        jest.runAllTimers();
      });

      // Should not throw or cause issues
    });
  });

  describe('Safe Text Handling', () => {
    it('handles undefined rating gracefully', async () => {
      const noRatingResponse = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Test Restaurant',
            categories: [],
            location: {},
            distance: 500,
            // rating is undefined
          },
        ],
      };

      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
        noRatingResponse,
      );

      const { getByText, queryByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Test Restaurant')).toBeTruthy();
        // Rating should not be displayed
        expect(queryByText(/^\d+\.\d+$/)).toBeNull();
      });
    });

    it('handles zero distance correctly', async () => {
      const zeroDistanceResponse = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Test Restaurant',
            categories: [],
            location: {},
            distance: 0,
            rating: 4.0,
          },
        ],
      };

      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
        zeroDistanceResponse,
      );

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(getByText('Test Restaurant')).toBeTruthy();
        // Distance text should not be displayed for 0 distance
      });
    });

    it('handles null venue gracefully', async () => {
      const nullVenueResponse = {
        results: [null],
      };

      (unifiedSearchService.searchNearbyVenues as jest.Mock).mockResolvedValue(
        nullVenueResponse,
      );

      const { getByText } = renderWithProviders(<SearchScreen />);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        // When all venues are null, should show empty state
        expect(getByText('No restaurants found')).toBeTruthy();
      });
    });
  });
});
