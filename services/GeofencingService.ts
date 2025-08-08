import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOFENCE_TASK_NAME = 'MINIMAL_GEOFENCE_TASK';
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'dinnafind_geofences';

type Geofence = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  // Optional Foursquare venue id for direct navigation
  venueId?: string;
};

// Initialize notification permissions
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

TaskManager.defineTask(
  GEOFENCE_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<any>) => {
    if (error) {
      console.error('[GeofencingService] Geofence error:', error);
      return;
    }
    if (data && data.eventType && data.region) {
      const { eventType, region } = data;
      const eventTypeStr =
        eventType === Location.GeofencingEventType.Enter
          ? 'ENTER'
          : eventType === Location.GeofencingEventType.Exit
          ? 'EXIT'
          : eventType;
      console.log(
        `[GeofencingService] Geofence event: ${eventTypeStr} | Region:`,
        JSON.stringify(region)
      );
      if (eventType === Location.GeofencingEventType.Enter) {
        console.log('[GeofencingService] ENTER event triggered for region:', region.identifier);

        // Get restaurant name and venueId from stored geofences
        const storedData = await AsyncStorage.getItem(STORAGE_KEY);
        let restaurantName = region.identifier;
        let venueId: string | undefined = undefined;
        if (storedData) {
          const geofences: Geofence[] = JSON.parse(storedData);
          const geofence = geofences.find(g => g.id === region.identifier);
          if (geofence) {
            restaurantName = geofence.name;
            venueId = geofence.venueId;
          }
        }

        // Check cooldown
        const now = Date.now();
        const lastNotificationTime = await AsyncStorage.getItem(
          `last_notification_${region.identifier}`
        );
        const lastTime = lastNotificationTime ? parseInt(lastNotificationTime, 10) : 0;

        if (now - lastTime > NOTIFICATION_COOLDOWN) {
          // Send actual notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'DinnaFind!',
              body: `You're near ${restaurantName}. Time to check it out!`,
              data: { geofenceId: region.identifier, restaurantName, venueId },
              sound: true,
            },
            trigger: null, // Send immediately
          });

          // Store notification time
          await AsyncStorage.setItem(`last_notification_${region.identifier}`, now.toString());
          console.log('[GeofencingService] Notification sent for ENTER event:', restaurantName);
        } else {
          console.log(
            '[GeofencingService] Cooldown active, skipping notification for:',
            restaurantName
          );
        }
      }
      if (eventType === Location.GeofencingEventType.Exit) {
        // Don't send notifications for EXIT events
        console.log('[GeofencingService] EXIT event (no notification sent):', region.identifier);
      }
    }
  }
);

class GeofencingService {
  geofences: Geofence[] = [];

  async addGeofence(geofence: Geofence): Promise<void> {
    this.geofences.push(geofence);
    console.log('[GeofencingService] Geofence added:', geofence);
    console.log('[GeofencingService] All geofences:', JSON.stringify(this.geofences));
    await this._saveGeofences();
    await this._updateGeofences();
  }

  async removeGeofence(id: string): Promise<void> {
    this.geofences = this.geofences.filter(g => g.id !== id);
    console.log('[GeofencingService] Geofence removed:', id);
    console.log('[GeofencingService] All geofences:', JSON.stringify(this.geofences));
    await this._saveGeofences();
    await this._updateGeofences();
  }

  private async _saveGeofences(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.geofences));
    } catch (error) {
      console.error('[GeofencingService] Failed to save geofences:', error);
    }
  }

  private async _loadGeofences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.geofences = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[GeofencingService] Failed to load geofences:', error);
    }
  }

  private async _updateGeofences(): Promise<void> {
    try {
      // First check if we have location permissions
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('[GeofencingService] No foreground location permission');
        return;
      }

      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('[GeofencingService] No background location permission');
        return;
      }

      // Stop existing geofencing task
      try {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      } catch {
        // It's ok if there's no task to stop
        console.log('[GeofencingService] No existing geofencing task to stop');
      }

      if (this.geofences.length === 0) {
        console.log('[GeofencingService] No geofences to monitor');
        return;
      }

      const regions = this.geofences.map(geofence => ({
        identifier: geofence.id,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: Math.max(geofence.radius, 100), // Minimum 100m radius for iOS
        notifyOnEnter: true, // Only notify on ENTER
        notifyOnExit: false, // Don't notify on EXIT
      }));

      console.log('[GeofencingService] Starting geofencing with regions:', regions);
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      console.log('[GeofencingService] Geofencing started successfully');
    } catch (e) {
      console.error('[GeofencingService] Failed to update geofences:', e);
      // Don't throw - just log the error
    }
  }

  // Debug method to log all geofences
  logAllGeofences() {
    console.log('[GeofencingService] Current geofences:', JSON.stringify(this.geofences));
  }

  // Initialize the service
  async initialize(): Promise<void> {
    console.log('[GeofencingService] Initializing...');

    try {
      // Check if the task is already defined
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);
      console.log('[GeofencingService] Task defined:', isTaskDefined);

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[GeofencingService] Notification permissions not granted');
      } else {
        console.log('[GeofencingService] Notification permissions granted');
      }

      // Load saved geofences
      await this._loadGeofences();
      console.log('[GeofencingService] Loaded geofences:', this.geofences.length);

      // If we have geofences and permissions, restart monitoring
      if (this.geofences.length > 0) {
        const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          await this._updateGeofences();
        }
      }
    } catch (error) {
      console.error('[GeofencingService] Initialization error:', error);
    }
  }

  // Restart geofencing with current settings
  async restartGeofencing() {
    console.log('[GeofencingService] Restarting geofencing with new settings...');
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    await this._updateGeofences();
    console.log('[GeofencingService] Geofencing restarted');
  }

  // Get active geofences
  getActiveGeofences(): Geofence[] {
    return [...this.geofences];
  }

  // Clear all geofences
  async clearAllGeofences(): Promise<void> {
    console.log('[GeofencingService] Clearing all geofences...');
    this.geofences = [];
    await this._saveGeofences();
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.log('[GeofencingService] Stopped geofencing task');
    } catch {
      console.log('[GeofencingService] No active geofences to stop');
    }
  }

  // Check if geofence exists
  hasGeofence(id: string): boolean {
    return this.geofences.some(g => g.id === id);
  }
}

const geofencingServiceInstance = new GeofencingService();
export default geofencingServiceInstance;

if (__DEV__) {
  (globalThis as any).logAllGeofences = () => {
    geofencingServiceInstance.logAllGeofences();
  };
  (globalThis as any).restartGeofencing = async () => {
    await geofencingServiceInstance.restartGeofencing();
  };
}
