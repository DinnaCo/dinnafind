import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import GeofencingService from '@/services/GeofencingService';
import { checkAndRequestLocationServices } from '@/utils/locationHelpers';
import {
  selectMasterNotificationsEnabled,
  setMasterNotificationsEnabled,
  selectDistanceMiles,
  setDistanceMiles,
} from '@/store/slices/uiSlice';
import { setBucketListItems } from '@/store/slices/bucketListSlice';
import { BucketListItem } from '@/models/bucket-list';

import { useAuth } from '@/contexts/AuthContext';
import { SupabaseDataService } from '@/services/supabaseDataService';

export function useAppInitialization() {
  const { user, session } = useAuth();
  const dispatch = useAppDispatch();
  const bucketListItems = useAppSelector(state => state.bucketList.items) as BucketListItem[];
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [initializationStep, setInitializationStep] = useState<string>('Starting...');

  useEffect(() => {
    if (user && session) {
      initializeApp();
    } else if (!user && !session) {
      // No user, skip initialization but still allow app to load
      console.log('[AppInit] No user session, skipping data loading');
      setIsInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  /**
   * Load user data from Supabase database
   * This is separate from persisted state which loads UI and auth state
   */
  const loadUserDataFromSupabase = async (userId: string) => {
    console.log('[AppInit] Loading user data from Supabase...');
    setInitializationStep('Loading user data...');

    try {
      // Always load bucket list items from database for the current user
      // This ensures we get the correct data for the authenticated user
      const bucketListItems = await SupabaseDataService.loadBucketListItems(userId);
      if (bucketListItems.length > 0) {
        dispatch(setBucketListItems(bucketListItems));
        console.log(`[AppInit] Loaded ${bucketListItems.length} bucket list items from database`);
      } else {
        // Clear any existing bucket list items if none found for this user
        dispatch(setBucketListItems([]));
        console.log('[AppInit] No bucket list items found in database, cleared local state');
      }

      // Load user preferences from database
      const preferences = await SupabaseDataService.loadUserPreferences(userId);
      if (preferences) {
        console.log('[AppInit] Loaded user preferences from database:', preferences);

        // Set user preferences in ui slice
        if (preferences.masterNotificationsEnabled !== undefined) {
          dispatch(setMasterNotificationsEnabled(preferences.masterNotificationsEnabled));
        }
        if (preferences.distanceMiles !== undefined) {
          dispatch(setDistanceMiles(preferences.distanceMiles));
        }
      }

      return true;
    } catch (error) {
      console.error('[AppInit] Error loading user data from Supabase:', error);
      setInitializationError('Failed to load user data from database');
      return false;
    }
  };

  const initializeApp = async () => {
    console.log('[AppInit] Starting app initialization...');
    setIsInitializing(true);
    setInitializationError(null);
    setInitializationStep('Starting...');

    try {
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      // Step 1: Load user data from Supabase (bucket list, preferences)
      // Note: UI and auth state are already loaded by redux-persist
      setInitializationStep('Loading user data from database...');
      const dataLoaded = await loadUserDataFromSupabase(user.id);
      if (!dataLoaded) {
        console.warn('[AppInit] Failed to load user data from database, continuing with cached data');
        // Continue with initialization even if database load fails
      }

      // Step 2: Initialize GeofencingService (loads saved geofences from AsyncStorage)
      setInitializationStep('Initializing location services...');
      await GeofencingService.initialize();

      // Step 3: Check and request location services
      if (masterEnabled) {
        console.log('[AppInit] Master notifications enabled, checking location services...');
        setInitializationStep('Checking location permissions...');
        const locationServicesEnabled = await checkAndRequestLocationServices();
        if (locationServicesEnabled) {
          console.log('[AppInit] Location services enabled, rebuilding geofences...');
          setInitializationStep('Setting up location alerts...');
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
    initializationStep,
    loadUserDataFromSupabase,
  };
}
