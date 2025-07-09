import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getDistance, getDistanceString } from '../utils/distanceUtils';
import { GeofencingEvent } from '@/store/slices/geofencingSlice';
const NOTIFICATION_COOLDOWN = 500; // 2.5 minutes in milliseconds
const GEOFENCE_TASK_NAME = 'DINNAFIND_GEOFENCE_TASK';
export const GEOFENCE_RADIUS = 2000; // meters - reasonable walking distance
const STORAGE_KEY = 'dinnafind_geofences';

// DinnaFind branded notification messages
function getNotificationTitle(): string {
  return 'DinnaFind! 🍽️';
}

function getNotificationBody(
  restaurantName: string,
  distance?: number,
  userLat?: number,
  userLon?: number,
  venueLat?: number,
  venueLon?: number
): string {
  let distanceText = '';
  if (
    typeof userLat === 'number' &&
    typeof userLon === 'number' &&
    typeof venueLat === 'number' &&
    typeof venueLon === 'number'
  ) {
    distanceText = getDistanceString(userLat, userLon, venueLat, venueLon);
  } else if (typeof distance === 'number') {
    // distance is in miles (from getDistance)
    if (distance < 0.1) {
      const feet = Math.round(distance * 5280);
      distanceText = `${feet} ft`;
    } else {
      distanceText = `${distance.toFixed(1)} mi`;
    }
  } else {
    distanceText = '';
  }
  return `${restaurantName} is only ${distanceText} away! 🚶‍♂️`;
}

export interface GeofenceRegion {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  restaurantName: string;
  restaurantId: string;
}

// Define the task at module level (outside the class)
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Geofencing] Task error:', error);
    return;
  }

  if (data) {
    const { eventType, region } = data as any;

    try {
      const regionId = region.identifier || 'unknown';
      console.log(`[Geofencing] ⚡️ Event: ${eventType} for region: ${regionId}`);

      // Load geofences from storage to get restaurant details
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!storedData) {
        console.log('[Geofencing] No geofences found in storage');
        return;
      }

      const regions: GeofenceRegion[] = JSON.parse(storedData);
      const geofence = regions.find(r => r.id === region.identifier);

      if (!geofence) {
        console.log(`[Geofencing] ⚠️ Geofence not found for region: ${regionId}`);
        return;
      }

      console.log(`[Geofencing] Restaurant: ${geofence.restaurantName}`);

      // Only send notification for enter events
      if (eventType === Location.GeofencingEventType.Enter) {
        // Check if we've recently sent a notification for this restaurant
        const now = Date.now();
        const lastNotificationTime = await AsyncStorage.getItem(`last_notification_${geofence.id}`);
        const lastTime = lastNotificationTime ? parseInt(lastNotificationTime, 10) : 0;
        const currentPosition = await Location.getLastKnownPositionAsync();
        if (
          !currentPosition ||
          typeof currentPosition.coords?.latitude !== 'number' ||
          typeof currentPosition.coords?.longitude !== 'number'
        ) {
          console.log(
            '[Geofencing] ⚠️ Could not get valid current position, skipping notification.'
          );
          return;
        }
        const distance = getDistance(
          currentPosition.coords.latitude,
          currentPosition.coords.longitude,
          geofence.latitude,
          geofence.longitude
        );
        console.log(`🗺️[Geofencing] 📏 Distance: ${distance} miles`);

        if (now - lastTime > NOTIFICATION_COOLDOWN) {
          // 5 minute cooldown
          await Notifications.scheduleNotificationAsync({
            content: {
              title: getNotificationTitle(),
              body: getNotificationBody(
                geofence.restaurantName,
                distance,
                currentPosition.coords.latitude,
                currentPosition.coords.longitude,
                geofence.latitude,
                geofence.longitude
              ),
              data: {
                restaurantId: geofence.restaurantId,
                restaurantName: geofence.restaurantName,
                eventType: 'enter',
              },
              sound: true,
            },
            trigger: null, // immediate
          });

          // Store the time of this notification
          const lastNotificationTime = `last_notification_${geofence.id} ${now.toString()}`;
          await AsyncStorage.setItem(lastNotificationTime, now.toString());
          console.log('🔈🕦 lastNotificationTime ', JSON.stringify(lastNotificationTime, null, 4));
          console.log(`🔈🔂[Geofencing] Notification sent for: ${geofence.restaurantName}`);
        } else {
          console.log(
            `⤵️🔵[Geofencing] Skipping notification for ${geofence.restaurantName} - cooldown active`
          );
        }
      }
    } catch (error) {
      console.error('🔴[Geofencing] Failed to handle event:', error);
    }
  }
});

class GeofencingService {
  subscribe(onEvent: (event: GeofencingEvent) => void, onError: (error: Error) => void) {
    throw new Error('Method not implemented.');
  }
  unsubscribe(): void {
    throw new Error('Method not implemented.');
  }
  private static instance: GeofencingService;
  private activeRegions: Map<string, GeofenceRegion> = new Map();
  private isInitialized: boolean = false;
  private lastNotificationTimes: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Request foreground location permission first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Request background location permission (required for geofencing)
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error(
        'Background location permission is required for location alerts. ' +
          'Please enable "Always Allow" location access in your device settings.'
      );
    }

    // Request notification permissions
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      console.warn('🔴 Notification permission not granted');
    }

    // Configure notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Define the background task before loading geofences
    if (!TaskManager.isTaskDefined(GEOFENCE_TASK_NAME)) {
      TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
        if (error) {
          console.error('🔴 Geofence task error:', error);
          return;
        }

        if (data) {
          const { eventType, region } = data as any;
          // We need to handle the notification here since we can't access instance methods
          await GeofencingService.handleGeofenceEventStatic(eventType, region);
        }
      });
    }

    // Load saved geofences
    await this.loadGeofences();

    // Start geofencing if we have active regions
    if (this.activeRegions.size > 0) {
      await this.startGeofencing();
    }

    this.isInitialized = true;
  }

  async checkPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
    notifications: boolean;
  }> {
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    const { status: notificationStatus } = await Notifications.getPermissionsAsync();

    return {
      foreground: foregroundStatus === 'granted',
      background: backgroundStatus === 'granted',
      notifications: notificationStatus === 'granted',
    };
  }

  async addGeofence(restaurant: { id: string; name: string; latitude: number; longitude: number }) {
    // Ensure we're initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    const region: GeofenceRegion = {
      id: `geofence_${restaurant.id}`,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      radius: GEOFENCE_RADIUS,
      restaurantName: restaurant.name,
      restaurantId: restaurant.id,
    };

    this.activeRegions.set(region.id, region);
    await this.saveGeofences();
    await this.startGeofencing();

    return region;
  }

  async removeGeofence(restaurantId: string) {
    const regionId = `geofence_${restaurantId}`;
    this.activeRegions.delete(regionId);
    await this.saveGeofences();

    if (this.activeRegions.size === 0) {
      await this.stopGeofencing();
    } else {
      await this.startGeofencing();
    }
  }

  async removeAllGeofences() {
    this.activeRegions.clear();
    await this.saveGeofences();
    await this.stopGeofencing();
  }

  async startGeofencing() {
    // If no regions, stop geofencing instead
    if (this.activeRegions.size === 0) {
      await this.stopGeofencing();
      return;
    }

    // Check if we have the required permissions
    const permissions = await this.checkPermissions();
    if (!permissions.background) {
      throw new Error(
        'Background location permission is required for location alerts. ' +
          'Please enable "Always Allow" location access in your device settings.'
      );
    }

    const regions = Array.from(this.activeRegions.values()).map(region => ({
      identifier: region.id,
      latitude: region.latitude,
      longitude: region.longitude,
      radius: region.radius,
      notifyOnEnter: true,
      notifyOnExit: false, // Only notify on enter to reduce notification spam
    }));

    // Double-check regions array is not empty
    if (regions.length === 0) {
      console.log(' No regions to monitor, stopping geofencing');
      await this.stopGeofencing();
      return;
    }

    try {
      // Stop existing geofencing task if running
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      if (isRegistered) {
        try {
          await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
          // Small delay to ensure the task is fully stopped
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (stopError: any) {
          // Ignore E_TASK_NOT_FOUND errors
          if (!stopError.message || !stopError.message.includes('E_TASK_NOT_FOUND')) {
            console.error('🔴 Error stopping existing geofencing:', stopError);
          }
        }
      }

      // Start geofencing with new regions
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      console.log(`🟢 Started geofencing for ${regions.length} regions`);
    } catch (error) {
      console.error('🔴 Failed to start geofencing:', error);
      throw error;
    }
  }

  async stopGeofencing() {
    try {
      const hasTask = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      if (hasTask) {
        // Check if the task is actually running before trying to stop it
        try {
          await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
          console.log('🔴 Stopped geofencing');
        } catch (stopError: any) {
          // If the error is E_TASK_NOT_FOUND, it's not really an error
          if (stopError.message && stopError.message.includes('E_TASK_NOT_FOUND')) {
            console.log('🔴 Geofencing task was not running');
          } else {
            // Re-throw other errors
            throw stopError;
          }
        }
      } else {
        console.log('🔴 No geofencing task registered');
      }
    } catch (error) {
      console.error('🔴 Error checking geofencing task:', error);
    }
  }

  // Static method to handle geofence events in the background task
  private static async handleGeofenceEventStatic(
    eventType: Location.GeofencingEventType,
    region: Location.LocationRegion
  ) {
    try {
      const regionId = region.identifier || 'unknown';
      console.log(`🔈🔂[Geofencing] Event received: ${eventType} for region: ${regionId}`);

      // Load geofences from storage to get restaurant details
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        console.log(`[Geofencing] No geofences found in storage for region: ${regionId}`);
        return;
      }

      const regions: GeofenceRegion[] = JSON.parse(data);
      const geofence = regions.find(r => r.id === region.identifier);
      if (!geofence) {
        console.log(`↪️[Geofencing] Geofence not found for region: ${regionId}`);
        return;
      }

      console.log(`↪️[Geofencing] Found geofence for restaurant: ${geofence.restaurantName}`);

      // Only send notification for enter events
      if (eventType === Location.GeofencingEventType.Enter) {
        // Check if we've recently sent a notification for this restaurant
        const now = Date.now();
        const lastNotificationTime = await AsyncStorage.getItem(`last_notification_${geofence.id}`);
        const lastTime = lastNotificationTime ? parseInt(lastNotificationTime, 10) : 0;

        if (now - lastTime > NOTIFICATION_COOLDOWN) {
          // 5 minute cooldown
          console.log(`↪️ 🔈[Geofencing] Sending notification for: ${geofence.restaurantName}`);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: getNotificationTitle(),
              body: getNotificationBody(
                geofence.restaurantName,
                GEOFENCE_RADIUS,
                undefined, // userLat
                undefined, // userLon
                geofence.latitude,
                geofence.longitude
              ),
              data: {
                restaurantId: geofence.restaurantId,
                restaurantName: geofence.restaurantName,
                eventType: 'enter',
              },
              sound: true,
            },
            trigger: null, // immediate
          });

          // Store the time of this notification
          await AsyncStorage.setItem(`last_notification_${geofence.id}`, now.toString());
          console.log(
            `↪️ 🔈[Geofencing] Notification sent successfully for: ${geofence.restaurantName}`
          );
        } else {
          console.log(
            `⤵️ 🔈[Geofencing] Skipping notification for ${geofence.restaurantName} - cooldown active`
          );
        }
      } else {
        console.log(`⤵️[Geofencing] Ignoring ${eventType} event for: ${geofence.restaurantName}`);
      }
    } catch (error) {
      console.error('🔴[Geofencing] Failed to handle geofence event:', error);
    }
  }

  private async handleGeofenceEvent(
    eventType: Location.GeofencingEventType,
    region: Location.LocationRegion
  ) {
    const regionId = region.identifier || 'unknown';
    console.log(`🔈↗️[Geofencing] Foreground event received: ${eventType} for region: ${regionId}`);

    const geofence = region.identifier ? this.activeRegions.get(region.identifier) : undefined;
    if (!geofence) {
      console.log(`⤵️[Geofencing] No active geofence found for region: ${regionId}`);
      return;
    }

    console.log(
      `🗺️↪️[Geofencing] Found active geofence for restaurant: ${geofence.restaurantName}`
    );

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log(
        `↪️ 🔈[Geofencing] Sending foreground notification for: ${geofence.restaurantName}`
      );
      await Notifications.scheduleNotificationAsync({
        content: {
          title: getNotificationTitle(),
          body: getNotificationBody(
            geofence.restaurantName,
            GEOFENCE_RADIUS,
            undefined, // userLat
            undefined, // userLon
            geofence.latitude,
            geofence.longitude
          ),
          data: {
            restaurantId: geofence.restaurantId,
            restaurantName: geofence.restaurantName,
            eventType: 'enter',
          },
          sound: true,
        },
        trigger: null, // immediate
      });
      console.log(`↗️ 🔈[Geofencing] Foreground notification sent for: ${geofence.restaurantName}`);
    } else {
      console.log(
        `⤵️ ↘️[Geofencing] Ignoring foreground ${eventType} event for: ${geofence.restaurantName}`
      );
    }
  }

  private async saveGeofences() {
    const data = Array.from(this.activeRegions.values());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  private async loadGeofences() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const regions: GeofenceRegion[] = JSON.parse(data);
        regions.forEach(region => {
          this.activeRegions.set(region.id, region);
        });
        console.log(`↪️ 🔄[Geofencing] Loaded ${regions.length} geofences from storage`);
      }
    } catch (error) {
      console.error('🔴[Geofencing] Failed to load geofences:', error);
    }
  }

  getActiveGeofences(): GeofenceRegion[] {
    return Array.from(this.activeRegions.values());
  }

  isGeofenceActive(restaurantId: string): boolean {
    return this.activeRegions.has(`geofence_${restaurantId}`);
  }

  // Get detailed status for debugging
  async getStatus() {
    const permissions = await this.checkPermissions();
    const activeCount = this.activeRegions.size;
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);

    return {
      isInitialized: this.isInitialized,
      permissions,
      activeGeofences: activeCount,
      taskRegistered: isTaskRegistered,
      regions: Array.from(this.activeRegions.values()).map(r => ({
        id: r.restaurantId,
        name: r.restaurantName,
        latitude: r.latitude,
        longitude: r.longitude,
        radius: r.radius,
      })),
    };
  }

  // Debug method to log current status
  async logStatus() {
    const status = await this.getStatus();
    console.log('🔄 ℹ[Geofencing] Current Status:', JSON.stringify(status, null, 2));
  }
}

export default GeofencingService.getInstance();
