import { useCallback, useEffect, useState } from 'react';
import GeofencingService from '@/services/GeofencingService';

export interface UseGeofencingOptions {
  autoStart?: boolean;
}

export function useGeofencing(options: UseGeofencingOptions = { autoStart: true }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGeofences, setActiveGeofences] = useState<string[]>([]);

  const updateActiveGeofences = () => {
    const geofences = GeofencingService.getActiveGeofences();
    setActiveGeofences(geofences.map(g => g.restaurantId));
  };

  const initializeGeofencing = useCallback(async (_event = undefined) => {
    try {
      await GeofencingService.initialize(_event);
      setIsInitialized(true);
      updateActiveGeofences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize geofencing');
    }
  }, []);

  useEffect(() => {
    if (options.autoStart) {
      initializeGeofencing();
    }
  }, [initializeGeofencing, options.autoStart]);

  const toggleGeofence = useCallback(
    async (restaurant: { id: string; name: string; latitude: number; longitude: number }) => {
      if (!isInitialized) {
        await initializeGeofencing();
      }

      try {
        if (GeofencingService.isGeofenceActive(restaurant.id)) {
          await GeofencingService.removeGeofence(restaurant.id);
        } else {
          await GeofencingService.addGeofence(restaurant);
        }
        updateActiveGeofences();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle geofence');
      }
    },
    [initializeGeofencing, isInitialized]
  );

  const isGeofenceActive = useCallback(
    (restaurantId: string) => {
      return activeGeofences.includes(restaurantId);
    },
    [activeGeofences]
  );

  const logStatus = useCallback(async () => {
    await GeofencingService.logStatus();
  }, []);

  return {
    isInitialized,
    error,
    activeGeofences,
    toggleGeofence,
    isGeofenceActive,
    logStatus,
  };
}
