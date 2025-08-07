import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import GeofencingService from '@/services/GeofencingService';
import LocationPermissionService from '@/services/LocationPermissionService';
import { checkAndRequestLocationServices } from '@/utils/locationHelpers';
import { 
  selectMasterNotificationsEnabled,
  selectDistanceMiles 
} from '@/store/slices/bucketListSlice';
import { BucketListItem } from '@/models/bucket-list';

export function useAppInitialization() {
  const dispatch = useAppDispatch();
  const bucketListItems = useAppSelector(state => state.bucketList.items) as BucketListItem[];
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);

  useEffect(() => {
    initializeApp();
  }, []); // Only run once on app start

  const initializeApp = async () => {
    console.log('[AppInit] Starting app initialization...');
    
    try {
      // Initialize GeofencingService (loads saved geofences from AsyncStorage)
      await GeofencingService.initialize();
      
      // Request permissions and rebuild geofences if master notifications are enabled
      if (masterEnabled) {
        console.log('[AppInit] Master notifications enabled, checking location services...');
        
        // First check if location services are enabled
        const locationServicesOk = await checkAndRequestLocationServices();
        
        if (locationServicesOk) {
          console.log('[AppInit] Location services OK, rebuilding geofences...');
          // Rebuild geofences from Redux state to ensure they're in sync
          await rebuildGeofencesFromState();
        } else {
          console.log('[AppInit] Location services or permissions denied, geofencing disabled');
        }
      } else {
        console.log('[AppInit] Master notifications disabled, skipping geofence setup');
      }
    } catch (error) {
      console.error('[AppInit] Initialization error:', error);
    }
    
    console.log('[AppInit] App initialization complete');
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
        });
        addedCount++;
        console.log(`[AppInit] Added geofence for: ${item.venue.name}`);
      } else if (item.notificationsEnabled) {
        console.log(`[AppInit] Skipped geofence for ${item.venue?.name || item.id} - missing location data`);
      }
    }
    
    console.log(`[AppInit] Geofences rebuilt: ${addedCount} active geofences`);
  };
}
