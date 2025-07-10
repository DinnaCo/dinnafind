import GeofencingService from '@/services/GeofencingService';

export const geofencingMiddleware = (store: any) => (next: any) => (action: any) => {
  if (action.type === 'ADD_GEOFENCE') {
    const state = store.getState();
    const distanceMiles = state.bucketList?.distanceMiles ?? 3;
    const radius = distanceMiles * 1609.34;
    GeofencingService.addGeofence({
      ...action.payload,
      radius,
    });
  }
  if (action.type === 'REMOVE_GEOFENCE') {
    GeofencingService.removeGeofence(action.payload.id);
  }
  return next(action);
};
