import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import GeofencingService from '@/services/GeofencingService';
import { checkAndRequestLocationServices } from '@/utils/locationHelpers';
import {
  selectMasterNotificationsEnabled,
  selectDistanceMiles,
} from '@/store/slices/bucketListSlice';
import { BucketListItem } from '@/models/bucket-list';
import { setAppStateFromUserData } from '@/utils/appStateHelpers';
import { useAuth } from '@/contexts/AuthContext';

export function useAppInitialization() {
  const { user, session } = useAuth();
  const bucketListItems = useAppSelector(state => state.bucketList.items) as BucketListItem[];
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    if (user && session) {
      initializeApp();
    } else if (!user && !session) {
      // No user, skip initialization
      setIsInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  /**
   * Helper function to set all store states from Supabase user data
   */
  const loadUserData = async (userId: string) => {
    console.log('[AppInit] Loading user data from Supabase...');

    try {
      const success = await setAppStateFromUserData(userId);
      if (!success) {
        setInitializationError('Failed to load user data');
        return false;
      }
      return true;
    } catch (error) {
      console.error('[AppInit] Error loading user data:', error);
      setInitializationError('Failed to load user data');
      return false;
    }
  };

  const initializeApp = async () => {
    console.log('[AppInit] Starting app initialization...');
    setIsInitializing(true);
    setInitializationError(null);

    try {
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      // Step 1: Load all user data from Supabase
      const dataLoaded = await loadUserData(user.id);
      if (!dataLoaded) {
        throw new Error('Failed to load user data');
      }

      // Step 2: Initialize GeofencingService (loads saved geofences from AsyncStorage)
      await GeofencingService.initialize();

      // Step 3: Check and request location services
      if (masterEnabled) {
        console.log('[AppInit] Master notifications enabled, checking location services...');
        const locationServicesEnabled = await checkAndRequestLocationServices();
        if (locationServicesEnabled) {
          console.log('[AppInit] Location services enabled, rebuilding geofences...');
          await rebuildGeofencesFromState();
        } else {
          console.log('[AppInit] Location services not available, skipping geofence setup');
        }
      } else {
        console.log('[AppInit] Master notifications disabled, skipping location setup');
      }

      console.log('[AppInit] App initialization complete');
    } catch (error) {
      console.error('[AppInit] Initialization error:', error);
      setInitializationError(error instanceof Error ? error.message : 'Initialization failed');
    } finally {
      setIsInitializing(false);
    }
  };

  const rebuildGeofencesFromState = async () => {
    console.log('[AppInit] Rebuilding geofences from state...');
    console.log('[AppInit] Bucket list items:', bucketListItems.length);

    // Clear existing geofences to avoid duplicates
    await GeofencingService.clearAllGeofences();

    // Add geofences for items with notifications enabled
    let addedCount = 0;
    for (const item of bucketListItems) {
      if (
        item.notificationsEnabled &&
        item.venue?.geocodes?.main?.latitude &&
        item.venue?.geocodes?.main?.longitude
      ) {
        await GeofencingService.addGeofence({
          id: item.id,
          name: item.venue.name,
          latitude: item.venue.geocodes.main.latitude,
          longitude: item.venue.geocodes.main.longitude,
          radius: distanceMiles * 1609.34, // Convert miles to meters
          venueId: item.venue.id,
        });
        addedCount++;
        console.log(`[AppInit] Added geofence for: ${item.venue.name}`);
      } else if (item.notificationsEnabled) {
        console.log(
          `[AppInit] Skipped geofence for ${item.venue?.name || item.id} - missing location data`
        );
      }
    }

    console.log(`[AppInit] Geofences rebuilt: ${addedCount} active geofences`);
  };

  return {
    isInitializing,
    initializationError,
    loadUserData,
  };
}
