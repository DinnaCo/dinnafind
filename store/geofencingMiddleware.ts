import GeofencingService from '@/services/GeofencingService';

export const geofencingMiddleware = (store: any) => (next: any) => (action: any) => {
  if (action.type === 'ADD_GEOFENCE') {
    GeofencingService.addGeofence(action.payload);
  }
  if (action.type === 'REMOVE_GEOFENCE') {
    GeofencingService.removeGeofence(action.payload.id);
  }
  return next(action);
};
