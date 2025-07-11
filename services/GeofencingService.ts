import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOFENCE_TASK_NAME = 'MINIMAL_GEOFENCE_TASK';
const NOTIFICATION_COOLDOWN = 10; // 5 minutes in milliseconds
const STORAGE_KEY = 'dinnafind_geofences';

type Geofence = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
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
        JSON.stringify(region, null, 2)
      );
      if (eventType === Location.GeofencingEventType.Enter) {
        console.log('[GeofencingService] ENTER event triggered for region:', region.identifier);

        // Get restaurant name from stored geofences
        const storedData = await AsyncStorage.getItem(STORAGE_KEY);
        let restaurantName = region.identifier;
        if (storedData) {
          const geofences: Geofence[] = JSON.parse(storedData);
          const geofence = geofences.find(g => g.id === region.identifier);
          if (geofence) {
            restaurantName = geofence.name;
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
              title: 'DinnaFind! 🍽️',
              body: `You're near ${restaurantName}. Time to check it out!`,
              data: { geofenceId: region.identifier, restaurantName },
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
    console.log('[GeofencingService] All geofences:', JSON.stringify(this.geofences, null, 2));
    await this._saveGeofences();
    await this._updateGeofences();
  }

  async removeGeofence(id: string): Promise<void> {
    this.geofences = this.geofences.filter(g => g.id !== id);
    console.log('[GeofencingService] Geofence removed:', id);
    console.log('[GeofencingService] All geofences:', JSON.stringify(this.geofences, null, 2));
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
    if (this.geofences.length === 0) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      return;
    }

    const regions = this.geofences.map(geofence => ({
      identifier: geofence.id,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radius: geofence.radius,
      notifyOnEnter: true, // Only notify on ENTER
      notifyOnExit: false, // Don't notify on EXIT
    }));

    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
  }

  // Debug method to log all geofences
  logAllGeofences() {
    console.log('[GeofencingService] Current geofences:', JSON.stringify(this.geofences, null, 2));
  }

  // Initialize the service
  async initialize(): Promise<void> {
    console.log('[GeofencingService] Initializing...');

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
  }

  // Restart geofencing with current settings
  async restartGeofencing() {
    console.log('[GeofencingService] Restarting geofencing with new settings...');
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    await this._updateGeofences();
    console.log('[GeofencingService] Geofencing restarted');
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
