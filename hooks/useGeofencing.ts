import GeofencingService from '@/services/GeofencingService';

export function useGeofencing() {
  return {
    addGeofence: GeofencingService.addGeofence.bind(GeofencingService),
    removeGeofence: GeofencingService.removeGeofence.bind(GeofencingService),
  };
}
