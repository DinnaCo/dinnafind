import React from 'react';
import { Alert, Linking, Platform, Share } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { DetailScreen } from '../index';
import * as ExpoRouter from 'expo-router';
import { renderWithProviders } from '@/test-utils';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
    Marker: ({ children }: any) => <View>{children}</View>,
  };
});

// Mock API services
jest.mock('@/api/unifiedSearch', () => ({
  unifiedSearchService: {
    getVenueDetails: jest.fn(),
  },
}));

jest.mock('@/api/venueDetailsService', () => ({
  getVenueDetails: jest.fn(),
}));

jest.mock('@/services/BranchService', () => ({
  branchService: {
    createVenueLink: jest.fn(),
  },
}));

describe('DetailScreen', () => {
  const mockVenueData = {
    id: 'venue123',
    fsq_id: 'venue123',
    name: 'Test Restaurant',
    categories: [
      {
        name: 'Italian Restaurant',
        icon: {
          prefix: 'https://example.com/icon_',
          suffix: '.png',
        },
      },
    ],
    location: {
      formattedAddress: '123 Test St, Test City, TC 12345',
      lat: 40.7128,
      lng: -74.006,
    },
    geocodes: {
      main: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Mock Linking
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    // Mock Share
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders loading state when fetching basic data', () => {
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        venueId: 'venue123',
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders error state when no venue data is available', () => {
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({});

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders venue details with data from params', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders venue details with itemData param', () => {
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        itemData: JSON.stringify(mockVenueData),
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Venue Information Display', () => {
    it('displays venue name correctly', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getAllByText } = renderWithProviders(<DetailScreen />);

      // Venue name appears twice (in header and in details)
      const venueNames = getAllByText('Test Restaurant');
      expect(venueNames.length).toBeGreaterThan(0);
    });

    it('displays venue category correctly', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getByText } = renderWithProviders(<DetailScreen />);

      expect(getByText('Italian Restaurant')).toBeTruthy();
    });

    it('displays venue address correctly', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getByText } = renderWithProviders(<DetailScreen />);

      expect(getByText(/123 Test St/)).toBeTruthy();
    });
  });

  describe('Visited Badge', () => {
    it('does not show visited badge for unsaved venues', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getByTestId, queryByText } = renderWithProviders(
        <DetailScreen />,
      );

      // Visited badge should not be present
      expect(queryByText('Visited')).toBeNull();
    });
  });

  describe('Hero Image', () => {
    it('uses category icon as fallback when no photos available', () => {
      const venueWithoutPhotos = { ...mockVenueData };
      const encodedData = encodeURIComponent(
        JSON.stringify(venueWithoutPhotos),
      );
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('constructs correct icon URL from params', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
        iconPrefix: 'https://example.com/icon_',
        iconSuffix: '.png',
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Map Display', () => {
    it('renders map when coordinates are available', () => {
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('does not render map when coordinates are missing', () => {
      const venueWithoutCoords = {
        ...mockVenueData,
        location: { formattedAddress: '123 Test St' },
        geocodes: undefined,
      };
      const encodedData = encodeURIComponent(
        JSON.stringify(venueWithoutCoords),
      );
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid JSON in data param gracefully', () => {
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: 'invalid-json',
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('handles missing venue name gracefully', () => {
      const venueWithoutName = { ...mockVenueData, name: undefined };
      const encodedData = encodeURIComponent(JSON.stringify(venueWithoutName));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getAllByText } = renderWithProviders(<DetailScreen />);

      // Should fall back to 'Restaurant' (appears in header and details)
      const restaurantTexts = getAllByText('Restaurant');
      expect(restaurantTexts.length).toBeGreaterThan(0);
    });

    it('handles missing category gracefully', () => {
      const venueWithoutCategory = {
        ...mockVenueData,
        categories: undefined,
        category: undefined,
      };
      const encodedData = encodeURIComponent(
        JSON.stringify(venueWithoutCategory),
      );
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getByText } = renderWithProviders(<DetailScreen />);

      // Should fall back to 'Restaurant'
      expect(getByText('Restaurant')).toBeTruthy();
    });

    it('handles missing address gracefully', () => {
      const venueWithoutAddress = {
        ...mockVenueData,
        location: {},
        address: undefined,
      };
      const encodedData = encodeURIComponent(
        JSON.stringify(venueWithoutAddress),
      );
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { getByText } = renderWithProviders(<DetailScreen />);

      expect(getByText('Address not available')).toBeTruthy();
    });
  });

  describe('Platform-specific behavior', () => {
    it('renders correctly on iOS', () => {
      Platform.OS = 'ios';
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly on Android', () => {
      Platform.OS = 'android';
      const encodedData = encodeURIComponent(JSON.stringify(mockVenueData));
      (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
        data: encodedData,
      });

      const { toJSON } = renderWithProviders(<DetailScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
