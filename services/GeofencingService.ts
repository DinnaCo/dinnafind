import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEOFENCE_TASK_NAME = 'MINIMAL_GEOFENCE_TASK';
const NOTIFICATION_COOLDOWN = 1 * 60 * 1000 / 10; // 1 minutes in milliseconds
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

        console.log('[GeofencingService] Looking up geofence data for ID:', region.identifier);
        console.log('[GeofencingService] Stored geofence data:', storedData);

        // Guard clause: if no geofence data is available, wait and retry
        if (!storedData || storedData === '[]') {
          console.warn('[GeofencingService] No geofence data available, waiting for data to populate...');

          // Wait up to 3 seconds for geofence data to be populated
          for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            const retryData = await AsyncStorage.getItem(STORAGE_KEY);
            if (retryData && retryData !== '[]') {
              console.log('[GeofencingService] Geofence data populated after waiting, retrying lookup...');
              const geofences: Geofence[] = JSON.parse(retryData);
              const geofence = geofences.find(g => g.id === region.identifier);
              if (geofence) {
                restaurantName = geofence.name;
                venueId = geofence.venueId;
                console.log('[GeofencingService] Found geofence after retry - Name:', restaurantName, 'VenueId:', venueId);
                break;
              }
            }
          }

          // If still no data after waiting, skip the notification
          if (restaurantName === region.identifier) {
            console.error('[GeofencingService] Geofence data still not available after waiting, skipping notification');
            return;
          }
        } else {
          // Normal lookup process
          try {
            const geofences: Geofence[] = JSON.parse(storedData);
            console.log('[GeofencingService] Parsed geofences:', JSON.stringify(geofences));

            const geofence = geofences.find(g => g.id === region.identifier);
            console.log('[GeofencingService] Found geofence:', geofence);

            if (geofence) {
              restaurantName = geofence.name;
              venueId = geofence.venueId;
              console.log('[GeofencingService] Using geofence data - Name:', restaurantName, 'VenueId:', venueId);
            } else {
              console.warn('[GeofencingService] Geofence not found for ID:', region.identifier);
              console.log('[GeofencingService] Available geofence IDs:', geofences.map(g => g.id));

              // Fallback: try to find by venueId (in case the region identifier is actually a venue ID)
              const fallbackGeofence = geofences.find(g => g.venueId === region.identifier);
              if (fallbackGeofence) {
                restaurantName = fallbackGeofence.name;
                venueId = fallbackGeofence.venueId;
                console.log('[GeofencingService] Found geofence by venueId fallback - Name:', restaurantName, 'VenueId:', venueId);
              } else {
                console.warn('[GeofencingService] Geofence not found by venueId fallback either');
                console.log('[GeofencingService] Available venueIds:', geofences.map(g => g.venueId));

                // Additional fallback: try to find by name (in case the region identifier is somehow the name)
                const nameFallbackGeofence = geofences.find(g => g.name === region.identifier);
                if (nameFallbackGeofence) {
                  restaurantName = nameFallbackGeofence.name;
                  venueId = nameFallbackGeofence.venueId;
                  console.log('[GeofencingService] Found geofence by name fallback - Name:', restaurantName, 'VenueId:', venueId);
                } else {
                  console.warn('[GeofencingService] Geofence not found by name fallback either');
                  console.log('[GeofencingService] Available names:', geofences.map(g => g.name));

                  // Instead of using a generic message, log the error and skip the notification
                  console.error('[GeofencingService] CRITICAL: Could not find geofence data for region identifier:', region.identifier);
                  console.error('[GeofencingService] This indicates a serious data synchronization issue');
                  console.error('[GeofencingService] Available geofences:', JSON.stringify(geofences, null, 2));

                  // Skip sending notification since we can't provide meaningful information
                  console.log('[GeofencingService] Skipping notification due to missing geofence data');
                  return;
                }
              }
            }
          } catch (parseError) {
            console.error('[GeofencingService] Failed to parse stored geofence data:', parseError);
            return;
          }
        }

        // Check cooldown
        const now = Date.now();
        const lastNotificationTime = await AsyncStorage.getItem(
          `last_notification_${region.identifier}`
        );
        const lastTime = lastNotificationTime ? parseInt(lastNotificationTime, 10) : 0;
        const timeSinceLastNotification = now - lastTime;
        const cooldownRemaining = Math.max(0, NOTIFICATION_COOLDOWN - timeSinceLastNotification);

        console.log(`[GeofencingService] Cooldown check for ${restaurantName}:`);
        console.log(`  - Last notification: ${lastTime ? new Date(lastTime).toISOString() : 'Never'}`);
        console.log(`  - Time since last: ${Math.round(timeSinceLastNotification / 1000)}s`);
        console.log(`  - Cooldown period: ${Math.round(NOTIFICATION_COOLDOWN / 1000)}s`);
        console.log(`  - Cooldown remaining: ${Math.round(cooldownRemaining / 1000)}s`);

        if (timeSinceLastNotification > NOTIFICATION_COOLDOWN) {
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
          console.log('🌎 👉 [GeofencingService] 📣 Notification sent for ENTER event:', restaurantName);
        } else {
          console.log(
            `[GeofencingService] ⏰ Cooldown active, skipping notification for: ${restaurantName} (${Math.round(cooldownRemaining / 1000)}s remaining)`
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
    // Validate geofence data before adding
    if (!geofence.id || !geofence.name) {
      console.error('[GeofencingService] Invalid geofence data:', geofence);
      throw new Error('Geofence must have both id and name');
    }

    // Check for duplicates
    const existingIndex = this.geofences.findIndex(g => g.id === geofence.id);
    if (existingIndex >= 0) {
      console.log('[GeofencingService] Updating existing geofence:', geofence.id);
      this.geofences[existingIndex] = geofence;
    } else {
      this.geofences.push(geofence);
    }

    console.log('[GeofencingService] Geofence added/updated:', geofence);
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
      console.log('[GeofencingService] Saving geofences to storage:', JSON.stringify(this.geofences));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.geofences));
      console.log('[GeofencingService] Successfully saved geofences to storage');

      // Verify the save worked
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('[GeofencingService] Verification - saved data:', savedData);
    } catch (error) {
      console.error('[GeofencingService] Failed to save geofences:', error);
      throw error; // Re-throw to make the error more visible
    }
  }

  private async _loadGeofences(): Promise<void> {
    try {
      console.log('[GeofencingService] Loading geofences from storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('[GeofencingService] Raw stored data:', stored);

      if (stored) {
        this.geofences = JSON.parse(stored);
        console.log('[GeofencingService] Successfully loaded geofences:', JSON.stringify(this.geofences));
      } else {
        console.log('[GeofencingService] No stored geofence data found');
        this.geofences = [];
      }
    } catch (error) {
      console.error('[GeofencingService] Failed to load geofences:', error);
      this.geofences = []; // Reset to empty array on error
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

      // Ensure geofence data is saved before starting monitoring
      await this._saveGeofences();
      console.log('[GeofencingService] Ensured geofence data is saved before starting monitoring');

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

  // Get current geofence state for debugging
  async getCurrentGeofenceState() {
    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    console.log('[GeofencingService] Current in-memory geofences:', JSON.stringify(this.geofences));
    console.log('[GeofencingService] Current stored geofences:', storedData);
    return {
      inMemory: this.geofences,
      stored: storedData ? JSON.parse(storedData) : null
    };
  }

  // Force reload geofences from storage
  async reloadGeofencesFromStorage() {
    console.log('[GeofencingService] Reloading geofences from storage...');
    await this._loadGeofences();
    console.log('[GeofencingService] Reloaded geofences:', JSON.stringify(this.geofences));
  }

  // Force refresh geofence data and restart monitoring
  async refreshGeofenceData() {
    console.log('[GeofencingService] Force refreshing geofence data...');

    // Reload from storage
    await this._loadGeofences();

    // Validate data integrity
    const validGeofences = this.geofences.filter(g => g.id && g.name && g.latitude && g.longitude);
    if (validGeofences.length !== this.geofences.length) {
      console.warn('[GeofencingService] Found invalid geofences, cleaning up...');
      this.geofences = validGeofences;
      await this._saveGeofences();
    }

    // Restart geofencing with validated data
    await this._updateGeofences();

    console.log('[GeofencingService] Geofence data refresh complete. Valid geofences:', validGeofences.length);
  }

  // Check for mismatches between monitored regions and stored data
  async checkGeofenceConsistency() {
    console.log('[GeofencingService] Checking geofence consistency...');

    try {
      // Get stored geofences
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      const storedGeofences = storedData ? JSON.parse(storedData) : [];
      console.log('[GeofencingService] Stored geofences:', JSON.stringify(storedGeofences));

      // Check in-memory vs stored consistency
      const inMemoryIds = this.geofences.map((g: Geofence) => g.id);
      const storedIds = storedGeofences.map((g: Geofence) => g.id);

      console.log('[GeofencingService] In-memory geofence IDs:', inMemoryIds);
      console.log('[GeofencingService] Stored geofence IDs:', storedIds);

      const missingInStorage = inMemoryIds.filter((id: string) => !storedIds.includes(id));
      const missingInMemory = storedIds.filter((id: string) => !inMemoryIds.includes(id));

      if (missingInStorage.length > 0) {
        console.warn('[GeofencingService] Geofences in memory but not in storage:', missingInStorage);
      }

      if (missingInMemory.length > 0) {
        console.warn('[GeofencingService] Geofences in storage but not in memory:', missingInMemory);
      }

      if (missingInStorage.length === 0 && missingInMemory.length === 0) {
        console.log('[GeofencingService] Geofence consistency check passed');
      } else {
        console.warn('[GeofencingService] Geofence consistency issues detected');
      }

      return {
        inMemoryGeofences: this.geofences,
        storedGeofences,
        missingInStorage,
        missingInMemory
      };
    } catch (error) {
      console.error('[GeofencingService] Error checking geofence consistency:', error);
      return null;
    }
  }

  // Validate and fix geofence data inconsistencies
  async validateAndFixGeofences() {
    console.log('[GeofencingService] Validating geofence data...');

    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      console.log('[GeofencingService] No stored geofence data found');
      return;
    }

    try {
      const storedGeofences: Geofence[] = JSON.parse(storedData);
      console.log('[GeofencingService] Stored geofences:', JSON.stringify(storedGeofences));
      console.log('[GeofencingService] In-memory geofences:', JSON.stringify(this.geofences));

      // Check if in-memory and stored geofences match
      if (JSON.stringify(storedGeofences) !== JSON.stringify(this.geofences)) {
        console.warn('[GeofencingService] Geofence data mismatch detected!');
        console.log('[GeofencingService] Reloading from storage to fix inconsistency...');
        await this._loadGeofences();
        console.log('[GeofencingService] Fixed geofences:', JSON.stringify(this.geofences));
      } else {
        console.log('[GeofencingService] Geofence data is consistent');
      }
    } catch (error) {
      console.error('[GeofencingService] Error validating geofence data:', error);
    }
  }

  // Clear and rebuild geofences from bucket list items
  async rebuildGeofencesFromBucketList(bucketListItems: any[], distanceMiles: number = 1.25) {
    console.log('[GeofencingService] Rebuilding geofences from bucket list...');

    // Clear existing geofences
    await this.clearAllGeofences();

    // Add geofences for items with notifications enabled
    let addedCount = 0;
    for (const item of bucketListItems) {
      if (
        item.notificationsEnabled &&
        item.venue?.geocodes?.main?.latitude &&
        item.venue?.geocodes?.main?.longitude
      ) {
        await this.addGeofence({
          id: item.id,
          name: item.venue.name,
          latitude: item.venue.geocodes.main.latitude,
          longitude: item.venue.geocodes.main.longitude,
          radius: distanceMiles * 1609.34, // Convert miles to meters
          venueId: item.venue.id,
        });
        addedCount++;
        console.log(`[GeofencingService] Rebuilt geofence for: ${item.venue.name}`);
      }
    }

    console.log(`[GeofencingService] Rebuilt ${addedCount} geofences from bucket list`);
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

      // Ensure geofence data is available and synchronized
      const dataAvailable = await this.ensureGeofenceDataAvailable();
      console.log('[GeofencingService] Geofence data available:', dataAvailable);

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

    // Also clear all notification cooldowns
    await this.clearAllNotificationCooldowns();
  }

  // Clear all notification cooldowns
  async clearAllNotificationCooldowns(): Promise<void> {
    console.log('[GeofencingService] Clearing all notification cooldowns...');
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cooldownKeys = keys.filter(key => key.startsWith('last_notification_'));
      if (cooldownKeys.length > 0) {
        await AsyncStorage.multiRemove(cooldownKeys);
        console.log(`[GeofencingService] Cleared ${cooldownKeys.length} notification cooldowns`);
      } else {
        console.log('[GeofencingService] No notification cooldowns to clear');
      }
    } catch (error) {
      console.error('[GeofencingService] Error clearing notification cooldowns:', error);
    }
  }

  // Check if geofence exists
  hasGeofence(id: string): boolean {
    return this.geofences.some(g => g.id === id);
  }

  // Ensure geofence data is available and synchronized
  async ensureGeofenceDataAvailable(): Promise<boolean> {
    console.log('[GeofencingService] Ensuring geofence data is available...');

    try {
      // Check if geofence data exists in storage
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      const hasStoredData = storedData && storedData !== '[]';

      console.log('[GeofencingService] Has stored geofence data:', hasStoredData);
      console.log('[GeofencingService] In-memory geofences count:', this.geofences.length);

      // If we have in-memory geofences but no stored data, save them
      if (this.geofences.length > 0 && !hasStoredData) {
        console.log('[GeofencingService] Saving in-memory geofences to storage...');
        await this._saveGeofences();
        return true;
      }

      // If we have stored data but no in-memory geofences, load them
      if (hasStoredData && this.geofences.length === 0) {
        console.log('[GeofencingService] Loading geofences from storage...');
        await this._loadGeofences();
        return true;
      }

      // If both are available, check consistency
      if (hasStoredData && this.geofences.length > 0) {
        const storedGeofences = JSON.parse(storedData);
        const isConsistent = JSON.stringify(storedGeofences) === JSON.stringify(this.geofences);
        console.log('[GeofencingService] Geofence data consistency:', isConsistent);
        return isConsistent;
      }

      return false;
    } catch (error) {
      console.error('[GeofencingService] Error ensuring geofence data availability:', error);
      return false;
    }
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
  (globalThis as any).getGeofenceState = async () => {
    return await geofencingServiceInstance.getCurrentGeofenceState();
  };
  (globalThis as any).reloadGeofences = async () => {
    await geofencingServiceInstance.reloadGeofencesFromStorage();
  };
  (globalThis as any).validateGeofences = async () => {
    await geofencingServiceInstance.validateAndFixGeofences();
  };
  (globalThis as any).rebuildGeofences = async (bucketListItems: any[], distanceMiles: number = 1.25) => {
    await geofencingServiceInstance.rebuildGeofencesFromBucketList(bucketListItems, distanceMiles);
  };
  (globalThis as any).refreshGeofenceData = async () => {
    await geofencingServiceInstance.refreshGeofenceData();
  };
  (globalThis as any).checkGeofenceConsistency = async () => {
    return await geofencingServiceInstance.checkGeofenceConsistency();
  };
  (globalThis as any).ensureGeofenceData = async () => {
    return await geofencingServiceInstance.ensureGeofenceDataAvailable();
  };
  (globalThis as any).clearNotificationCooldowns = async () => {
    await geofencingServiceInstance.clearAllNotificationCooldowns();
  };
}
