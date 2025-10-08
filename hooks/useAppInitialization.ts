import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch, store } from '@/store';
import { AppState, AppStateStatus } from 'react-native';
import GeofencingService from '@/services/GeofencingService';
import { requestRequiredPermissions, checkAllPermissions, arePermissionsDenied } from '@/services/PermissionsService';
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
import { logger } from '@/utils/logger';

export function useAppInitialization() {
  const { user, session } = useAuth();
  const dispatch = useAppDispatch();
  const bucketListItems = useAppSelector(state => state.bucketList.items) as BucketListItem[];
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [initializationStep, setInitializationStep] = useState<string>('Starting...');
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (user && session) {
      initializeApp();
    } else if (!user && !session) {
      // No user, skip initialization but still allow app to load
      logger.info('[AppInit] No user session, skipping data loading');
      setIsInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  // Global timeout to prevent infinite loading
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (isInitializing) {
        logger.warn('[AppInit] Global timeout reached, forcing app to continue');
        setIsInitializing(false);
        setInitializationStep('DinnaFinds are right around the corner!');
      }
    }, 15000); // 15 second global timeout

    return () => clearTimeout(globalTimeout);
  }, [isInitializing]);

  // Listen for app state changes to re-check permissions when user returns from settings
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      logger.info(`[AppInit] App state changed from ${appState.current} to ${nextAppState}`);

      // When app becomes active and we previously had permission issues, re-check
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        locationPermissionDenied &&
        masterEnabled
      ) {
        logger.info('[AppInit] App became active, re-checking location permissions...');
        setInitializationStep('Re-checking location permissions...');
        const permissions = await checkAllPermissions();
        logger.info('[AppInit] Current permissions after returning from settings:', permissions);
        if (
          permissions.location.foreground &&
          permissions.location.background &&
          permissions.notifications.granted
        ) {
          logger.info('[AppInit] All permissions now granted, setting up geofences...');
          setLocationPermissionDenied(false);
          setInitializationStep('Setting up location notifications...');
          await rebuildGeofencesFromState();
          setIsInitializing(false);
        } else {
          logger.info('[AppInit] Permissions still not granted');
          setLocationPermissionDenied(true);
          setIsInitializing(false);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [locationPermissionDenied, masterEnabled]);

  const rebuildGeofencesFromState = useCallback(async () => {
    logger.info('[AppInit] Rebuilding geofences from state...');

    // Get current state from Redux store to avoid stale closure
    const currentState = store.getState();
    const currentBucketListItems = currentState.bucketList.items as BucketListItem[];
    const currentDistanceMiles = currentState.ui.distanceMiles;

    logger.info('[AppInit] Bucket list items:', currentBucketListItems.length);

    // Clear existing geofences to avoid duplicates
    await GeofencingService.clearAllGeofences();

    // Add geofences for items with notifications enabled
    let addedCount = 0;
    for (const item of currentBucketListItems) {
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
          radius: currentDistanceMiles * 1609.34, // Convert miles to meters
          venueId: item.venue.id,
        });
        addedCount++;
        logger.info(`[AppInit] Added geofence for: ${item.venue.name}`);
      } else if (item.notificationsEnabled) {
        logger.info(
          `[AppInit] Skipped geofence for ${item.venue?.name || item.id} - missing location data`
        );
      }
    }

    logger.info(`[AppInit] Geofences rebuilt: ${addedCount} active geofences`);
  }, []);

  /**
   * Load user data from Supabase database
   * This is separate from persisted state which loads UI and auth state
   */
  const loadUserDataFromSupabase = async (userId: string) => {
    logger.info('[AppInit] Loading user data from Supabase...');
    setInitializationStep('Loading user data...');

    try {
      // Always load bucket list items from database for the current user
      // This ensures we get the correct data for the authenticated user
      const bucketListItems = await SupabaseDataService.loadBucketListItems(userId);
      if (bucketListItems.length > 0) {
        dispatch(setBucketListItems(bucketListItems));
        logger.info(`[AppInit] Loaded ${bucketListItems.length} bucket list items from database`);
      } else {
        // Clear any existing bucket list items if none found for this user
        dispatch(setBucketListItems([]));
        logger.info('[AppInit] No bucket list items found in database, cleared local state');
      }

      // Load user preferences from database
      const preferences = await SupabaseDataService.loadUserPreferences(userId);
      if (preferences) {
        logger.info('[AppInit] Loaded user preferences from database:', preferences);

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
      logger.error('[AppInit] Error loading user data from Supabase:', error);
      setInitializationError('Failed to load user data from database');
      return false;
    }
  };

  const initializeApp = async () => {
    logger.info('[AppInit] Starting app initialization...');
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
        logger.warn('[AppInit] Failed to load user data from database, continuing with cached data');
        // Continue with initialization even if database load fails
      }

      // Step 2: Initialize GeofencingService (loads saved geofences from AsyncStorage)
      setInitializationStep('Initializing location services...');
      await GeofencingService.initialize();

      // Step 3: Check and request location services (non-blocking)
      if (masterEnabled) {
        logger.info('[AppInit] Master notifications enabled, checking location services...');
        setInitializationStep('Setting up location services...');

        // Don't request permissions here - let the Notifications screen handle them on-demand
        // Just check if permissions are already granted to set up geofences
        const permissionsDenied = await arePermissionsDenied();
        if (permissionsDenied) {
          logger.info('[AppInit] Permissions already denied, skipping geofence setup');
          setInitializationStep('Location notifications disabled - enable in Notifications tab');
          setLocationPermissionDenied(true);
        } else {
          // Check if we have the necessary permissions to set up geofences
          const currentPermissions = await checkAllPermissions();
          if (currentPermissions.location.foreground && currentPermissions.notifications.granted) {
            logger.info('[AppInit] Permissions already granted, setting up geofences...');
            setInitializationStep('Setting up location notifications...');
            await rebuildGeofencesFromState();
            setLocationPermissionDenied(false);
          } else {
            logger.info('[AppInit] Permissions not granted, skipping geofence setup');
            setInitializationStep('Location notifications ready - enable in Notifications tab');
            setLocationPermissionDenied(true);
          }
        }
      } else {
        logger.info('[AppInit] Master notifications disabled, skipping location setup');
        setLocationPermissionDenied(false);
      }

      logger.info('[AppInit] App initialization complete');
    } catch (error) {
      logger.error('[AppInit] Initialization error:', error);
      setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      setInitializationStep('DinnaFinds are right around the corner!');
    } finally {
      // Always finish initialization after a reasonable timeout, even if permissions aren't granted
      setTimeout(() => {
        setIsInitializing(false);
      }, 3000); // Give 3 seconds for basic setup, then continue
    }
  };

  return {
    isInitializing,
    initializationError,
    initializationStep,
    loadUserDataFromSupabase,
  };
}
