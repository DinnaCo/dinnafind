import { useCallback, useEffect, useState } from 'react';

import * as Location from 'expo-location';

import { type Coordinates } from '@/models/venue';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  getUserLocation,
  setLocationPermission,
  setUserLocation,
} from '@/store/slices/venuesSlice';

interface GeolocationHook {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
  requestLocation: () => void;
}

/**
 * Custom hook for getting and tracking user location using Expo Location
 */
export const useGeolocation = (): GeolocationHook => {
  const dispatch = useAppDispatch();
  const coordinates = useAppSelector(state => state.venues.userLocation);
  const permissionGranted = useAppSelector(state => state.venues.locationPermissionGranted);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Request location permissions and get location
  const requestLocation = useCallback(async () => {
    try {
      console.log('🗺️ useGeolocation: Starting location request');
      setLoading(true);
      setError(null);

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🗺️ useGeolocation: Permission request result:', status);

      // Update permission status in Redux
      dispatch(setLocationPermission(status === 'granted'));

      if (status !== 'granted') {
        const errorMsg = 'Location permission not granted';
        console.log('🗺️ useGeolocation:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Get current position
      console.log('🗺️ useGeolocation: Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 60000, // Accept cached location up to 1 minute old
        timeout: 10000, // 10 second timeout
      });

      console.log('🗺️ useGeolocation: Location received:', location.coords);

      // Update location in Redux
      const newCoordinates: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      dispatch(setUserLocation(newCoordinates));

      // Also dispatch the getUserLocation action to trigger any sagas listening for it
      dispatch(getUserLocation());
      
      console.log('🗺️ useGeolocation: Location updated in Redux:', newCoordinates);
    } catch (error: unknown) {
      const errorMsg = (error as Error).message || 'Failed to get location';
      console.error('🗺️ useGeolocation: Error getting location:', error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Check for location permissions on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        console.log('🗺️ useGeolocation: Current permission status:', status);
        dispatch(setLocationPermission(status === 'granted'));

        if (status === 'granted' && !coordinates) {
          console.log('🗺️ useGeolocation: Permission granted, requesting location');
          requestLocation();
        }
      } catch (err) {
        console.error('Error checking location permission:', err);
      }
    };

    checkPermission();
  }, [dispatch, requestLocation, coordinates]);

  return {
    coordinates,
    loading,
    error,
    permissionGranted,
    requestLocation,
  };
};
