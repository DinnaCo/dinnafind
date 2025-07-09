import { Middleware } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GeofencingService from '@/services/GeofencingService';
import {
  addToBucketList,
  removeFromBucketList,
  setNotificationEnabled,
  setAllNotificationsEnabled,
  // setDistanceMiles, // Do not trigger geofence restart on this action
} from './slices/bucketListSlice';
import { RootState } from '@/store';
import { type BucketListItem } from '@/models/bucket-list';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const geofencingMiddleware: Middleware = store => next => async action => {
  const result = next(action);

  // Only listen for relevant actions (not setDistanceMiles)
  if (
    addToBucketList.fulfilled.match(action) ||
    removeFromBucketList.fulfilled.match(action) ||
    setNotificationEnabled.match(action) ||
    setAllNotificationsEnabled.match(action)
  ) {
    // Debounce geofence restarts (batch within 500ms)
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const state: RootState = store.getState();
      const items = state.bucketList.items as BucketListItem[];
      // Only include items with notificationsEnabled and coordinates
      const geofences = items
        .filter(item => item.notificationsEnabled && item.venue?.coordinates)
        .map(item => ({
          id: item.id,
          name: item.venue.name,
          latitude: item.venue.coordinates!.latitude as number,
          longitude: item.venue.coordinates!.longitude as number,
        }));
      // Remove all and add correct geofences
      await GeofencingService.removeAllGeofences();
      for (const geofence of geofences) {
        await GeofencingService.addGeofence(geofence);
      }
      // Save a last update timestamp for notification suppression
      //  TODO: test against update timestamp logic to see if we can remove the geofence add/remove
      await AsyncStorage.setItem('geofence_last_update', Date.now().toString());
      console.log(
        '[Geofencing] (Middleware) Synced geofences with bucket list:',
        geofences.map(g => g.name)
      );
    }, 500);
  }

  return result;
};
