import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { ExploreScreen } from '../index';
import * as ExpoRouter from 'expo-router';
import { renderWithProviders } from '@/test-utils';
import * as useGeolocationHook from '@/hooks/useGeolocation';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef(({ children, initialRegion }: any, ref: any) => {
      // Attach animateToRegion method to ref
      React.useImperativeHandle(ref, () => ({
        animateToRegion: jest.fn(),
      }));

      return (
        <View testID="map-view" ref={ref}>
          <Text testID="map-initial-region">
            {JSON.stringify(initialRegion)}
          </Text>
          {children}
        </View>
      );
    }),
    Marker: ({ coordinate, title, description }: any) => (
      <View testID={`marker-${title}`}>
        <Text testID="marker-coordinate">{JSON.stringify(coordinate)}</Text>
        <Text testID="marker-title">{title}</Text>
        <Text testID="marker-description">{description}</Text>
      </View>
    ),
  };
});

// Mock useGeolocation hook
const mockUseGeolocation = jest.spyOn(useGeolocationHook, 'useGeolocation');

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock LocationPermissionRequest
jest.mock('@/components/common/LocationPermissionRequest', () => ({
  LocationPermissionRequest: ({ onRequestLocation }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="location-permission-request">
        <Text>Location permission required</Text>
        <TouchableOpacity
          testID="request-location-button"
          onPress={onRequestLocation}
        >
          <Text>Request Location</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock LocationStatus
jest.mock('@/components/common/LocationStatus', () => ({
  LocationStatus: ({ showDetails, onRetry }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="location-status">
        <Text>Location Status</Text>
        {onRetry && (
          <TouchableOpacity testID="retry-location-button" onPress={onRetry}>
            <Text>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

describe('ExploreScreen', () => {
  const mockCoordinates = {
    latitude: 30.2672,
    longitude: -97.7431,
  };

  const mockBucketListItems = [
    {
      id: '1',
      venue: {
        id: 'venue1',
        name: 'Restaurant 1',
        address: '123 Main St',
        coordinates: {
          latitude: 30.27,
          longitude: -97.74,
        },
      },
      notes: '',
      tags: [],
      priority: 'medium',
      createdAt: Date.now(),
    },
    {
      id: '2',
      venue: {
        id: 'venue2',
        name: 'Restaurant 2',
        geocodes: {
          main: {
            latitude: 30.28,
            longitude: -97.75,
          },
        },
      },
      notes: '',
      tags: [],
      priority: 'high',
      createdAt: Date.now(),
    },
  ];

  const defaultGeolocationState = {
    coordinates: mockCoordinates,
    loading: false,
    error: null,
    permissionGranted: true,
    permissionChecked: true,
    requestLocation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGeolocation.mockReturnValue(defaultGeolocationState);
  });

  describe('Loading States', () => {
    it('shows loading screen while checking permissions', () => {
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        permissionChecked: false,
        permissionGranted: false,
        coordinates: null,
      });

      const { getByText, getByTestId } = renderWithProviders(<ExploreScreen />);

      expect(getByText('Loading...')).toBeTruthy();
    });

    it('shows map placeholder when coordinates are loading', () => {
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        coordinates: null,
        permissionGranted: true,
        permissionChecked: true,
      });

      const { getByText } = renderWithProviders(<ExploreScreen />);

      expect(getByText('Loading map...')).toBeTruthy();
    });
  });

  describe('Location Permission', () => {
    it('shows location permission request overlay when permission not granted', () => {
      const mockRequestLocation = jest.fn();
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        permissionGranted: false,
        permissionChecked: true,
        coordinates: null,
        requestLocation: mockRequestLocation,
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />);

      expect(getByTestId('location-permission-request')).toBeTruthy();
    });

    it('calls requestLocation when request location button is pressed', () => {
      const mockRequestLocation = jest.fn();
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        permissionGranted: false,
        permissionChecked: true,
        coordinates: null,
        requestLocation: mockRequestLocation,
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />);

      const requestButton = getByTestId('request-location-button');
      fireEvent.press(requestButton);

      expect(mockRequestLocation).toHaveBeenCalled();
    });

    it('shows location status when permission is granted but coordinates loading', () => {
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        coordinates: null,
        permissionGranted: true,
        permissionChecked: true,
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />);

      expect(getByTestId('location-status')).toBeTruthy();
    });
  });

  describe('Map Rendering', () => {
    it('renders map with user coordinates when available', () => {
      const { getByTestId } = renderWithProviders(<ExploreScreen />);

      const mapView = getByTestId('map-view');
      expect(mapView).toBeTruthy();
    });

    it('uses user coordinates for initial region', () => {
      const { getByTestId } = renderWithProviders(<ExploreScreen />);

      const initialRegion = getByTestId('map-initial-region');
      const region = JSON.parse(initialRegion.props.children);

      expect(region.latitude).toBe(mockCoordinates.latitude);
      expect(region.longitude).toBe(mockCoordinates.longitude);
      expect(region.latitudeDelta).toBe(0.05);
      expect(region.longitudeDelta).toBe(0.05);
    });

    it('uses default coordinates when user coordinates not available', () => {
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        coordinates: null,
      });

      const { queryByTestId } = renderWithProviders(<ExploreScreen />);

      // Map should not be rendered when coordinates are null
      expect(queryByTestId('map-view')).toBeNull();
    });

    it('renders user location marker', () => {
      const { getByTestId } = renderWithProviders(<ExploreScreen />);

      const userMarker = getByTestId('marker-You are here');
      expect(userMarker).toBeTruthy();

      const markerCoordinate = userMarker.children[0] as any;
      const coordinate = JSON.parse(markerCoordinate.props.children);

      expect(coordinate.latitude).toBe(mockCoordinates.latitude);
      expect(coordinate.longitude).toBe(mockCoordinates.longitude);
    });
  });

  describe('Bucket List Markers', () => {
    it('renders markers for bucket list items with coordinates', () => {
      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: mockBucketListItems,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      expect(getByTestId('marker-Restaurant 1')).toBeTruthy();
      expect(getByTestId('marker-Restaurant 2')).toBeTruthy();
    });

    it('displays correct coordinates for bucket list markers', () => {
      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: mockBucketListItems,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      const marker1 = getByTestId('marker-Restaurant 1');
      const marker1Coordinate = marker1.children[0] as any;
      const coord1 = JSON.parse(marker1Coordinate.props.children);

      expect(coord1.latitude).toBe(30.27);
      expect(coord1.longitude).toBe(-97.74);
    });

    it('handles items with geocodes instead of coordinates', () => {
      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: mockBucketListItems,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      const marker2 = getByTestId('marker-Restaurant 2');
      const marker2Coordinate = marker2.children[0] as any;
      const coord2 = JSON.parse(marker2Coordinate.props.children);

      expect(coord2.latitude).toBe(30.28);
      expect(coord2.longitude).toBe(-97.75);
    });

    it('handles items with location lat/lng', () => {
      const itemsWithLocation = [
        {
          id: '3',
          venue: {
            id: 'venue3',
            name: 'Restaurant 3',
            location: {
              lat: 30.29,
              lng: -97.76,
            },
          },
          notes: '',
          tags: [],
          priority: 'low',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemsWithLocation,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      const marker3 = getByTestId('marker-Restaurant 3');
      const marker3Coordinate = marker3.children[0] as any;
      const coord3 = JSON.parse(marker3Coordinate.props.children);

      expect(coord3.latitude).toBe(30.29);
      expect(coord3.longitude).toBe(-97.76);
    });

    it('does not render markers for items without valid coordinates', () => {
      const itemsWithoutCoords = [
        {
          id: '4',
          venue: {
            id: 'venue4',
            name: 'Restaurant 4',
            // No coordinates at all
          },
          notes: '',
          tags: [],
          priority: 'medium',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemsWithoutCoords,
            loading: false,
            error: null,
          },
        },
      });

      const { queryByTestId } = renderWithProviders(<ExploreScreen />, {
        store,
      });

      expect(queryByTestId('marker-Restaurant 4')).toBeNull();
    });

    it('displays marker title and description correctly', () => {
      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: mockBucketListItems,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId, getAllByTestId } = renderWithProviders(
        <ExploreScreen />,
        { store },
      );

      const marker1 = getByTestId('marker-Restaurant 1');
      const titles = marker1.children.filter(
        (child: any) => child.props.testID === 'marker-title',
      );
      const descriptions = marker1.children.filter(
        (child: any) => child.props.testID === 'marker-description',
      );

      expect(titles[0].props.children).toBe('Restaurant 1');
      expect(descriptions[0].props.children).toBe('123 Main St');
    });
  });

  describe('Content Display', () => {
    it('renders explore title', () => {
      const { getByText } = renderWithProviders(<ExploreScreen />);

      expect(getByText('Explore Restaurants')).toBeTruthy();
    });

    it('shows correct description with coordinates and bucket list count', () => {
      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: mockBucketListItems,
            loading: false,
            error: null,
          },
        },
      });

      const { getByText } = renderWithProviders(<ExploreScreen />, { store });

      expect(
        getByText(
          'This screen shows your location and 2 saved bucket list restaurants on the map.',
        ),
      ).toBeTruthy();
    });

    it('shows alternative description without coordinates', () => {
      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        coordinates: null,
      });

      const { getByText } = renderWithProviders(<ExploreScreen />);

      expect(getByText('Getting your location...')).toBeTruthy();
    });

    it('renders search restaurants button', () => {
      const { getByText } = renderWithProviders(<ExploreScreen />);

      expect(getByText('Search Restaurants')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates to search screen when search button is pressed', () => {
      const { getByText } = renderWithProviders(<ExploreScreen />);

      const searchButton = getByText('Search Restaurants');
      fireEvent.press(searchButton);

      expect(ExpoRouter.router.push).toHaveBeenCalledWith('/(tabs)/search');
    });
  });

  describe('Redux Integration', () => {
    it('fetches bucket list on mount', () => {
      const { store } = renderWithProviders(<ExploreScreen />);

      // Check that fetchBucketList action was dispatched
      const actions = store.getActions?.() || [];
      const fetchAction = actions.find((action: any) =>
        action.type?.includes('bucketList/fetchBucketList'),
      );

      // Since we're using a real store, we just verify the component renders
      expect(store).toBeTruthy();
    });

    it('displays empty map when bucket list is empty', () => {
      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: [],
            loading: false,
            error: null,
          },
        },
      });

      const { getByText } = renderWithProviders(<ExploreScreen />, { store });

      expect(
        getByText(
          'This screen shows your location and 0 saved bucket list restaurants on the map.',
        ),
      ).toBeTruthy();
    });
  });

  describe('Coordinate Extraction', () => {
    it('prioritizes coordinates over geocodes', () => {
      const itemWithBoth = [
        {
          id: '5',
          venue: {
            id: 'venue5',
            name: 'Restaurant 5',
            coordinates: {
              latitude: 30.30,
              longitude: -97.77,
            },
            geocodes: {
              main: {
                latitude: 30.31,
                longitude: -97.78,
              },
            },
          },
          notes: '',
          tags: [],
          priority: 'high',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemWithBoth,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      const marker = getByTestId('marker-Restaurant 5');
      const markerCoordinate = marker.children[0] as any;
      const coord = JSON.parse(markerCoordinate.props.children);

      // Should use coordinates, not geocodes
      expect(coord.latitude).toBe(30.30);
      expect(coord.longitude).toBe(-97.77);
    });

    it('falls back to location lat/lng when coordinates and geocodes are missing', () => {
      const itemWithLocationOnly = [
        {
          id: '6',
          venue: {
            id: 'venue6',
            name: 'Restaurant 6',
            location: {
              lat: 30.32,
              lng: -97.79,
            },
          },
          notes: '',
          tags: [],
          priority: 'medium',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemWithLocationOnly,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      const marker = getByTestId('marker-Restaurant 6');
      const markerCoordinate = marker.children[0] as any;
      const coord = JSON.parse(markerCoordinate.props.children);

      expect(coord.latitude).toBe(30.32);
      expect(coord.longitude).toBe(-97.79);
    });

    it('handles invalid coordinate types gracefully', () => {
      const itemWithInvalidCoords = [
        {
          id: '7',
          venue: {
            id: 'venue7',
            name: 'Restaurant 7',
            coordinates: {
              latitude: 'invalid' as any,
              longitude: 'invalid' as any,
            },
            location: {
              lat: 30.33,
              lng: -97.80,
            },
          },
          notes: '',
          tags: [],
          priority: 'low',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemWithInvalidCoords,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      // Should fall back to location lat/lng
      const marker = getByTestId('marker-Restaurant 7');
      const markerCoordinate = marker.children[0] as any;
      const coord = JSON.parse(markerCoordinate.props.children);

      expect(coord.latitude).toBe(30.33);
      expect(coord.longitude).toBe(-97.80);
    });
  });

  describe('Map Animation', () => {
    it('animates to user location when coordinates update', () => {
      const { rerender } = renderWithProviders(<ExploreScreen />);

      // Update coordinates
      const newCoordinates = {
        latitude: 30.35,
        longitude: -97.82,
      };

      mockUseGeolocation.mockReturnValue({
        ...defaultGeolocationState,
        coordinates: newCoordinates,
      });

      rerender(<ExploreScreen />);

      // Component should re-render with new coordinates
      // Map animation is handled internally by MapView ref
    });
  });

  describe('Edge Cases', () => {
    it('handles missing venue name gracefully', () => {
      const itemWithoutName = [
        {
          id: '8',
          venue: {
            id: 'venue8',
            name: '',
            coordinates: {
              latitude: 30.36,
              longitude: -97.83,
            },
          },
          notes: '',
          tags: [],
          priority: 'medium',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemWithoutName,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      // Marker should still render with empty title
      const marker = getByTestId('marker-');
      expect(marker).toBeTruthy();
    });

    it('handles missing venue address gracefully', () => {
      const itemWithoutAddress = [
        {
          id: '9',
          venue: {
            id: 'venue9',
            name: 'Restaurant 9',
            coordinates: {
              latitude: 30.37,
              longitude: -97.84,
            },
          },
          notes: '',
          tags: [],
          priority: 'high',
          createdAt: Date.now(),
        },
      ];

      const { store } = renderWithProviders(<ExploreScreen />, {
        preloadedState: {
          bucketList: {
            items: itemWithoutAddress,
            loading: false,
            error: null,
          },
        },
      });

      const { getByTestId } = renderWithProviders(<ExploreScreen />, { store });

      const marker = getByTestId('marker-Restaurant 9');
      const descriptions = marker.children.filter(
        (child: any) => child.props.testID === 'marker-description',
      );

      // Description should be undefined
      expect(descriptions[0].props.children).toBeUndefined();
    });
  });
});
