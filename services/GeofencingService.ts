import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logger } from '@/utils/logger';

const GEOFENCE_TASK_NAME = 'MINIMAL_GEOFENCE_TASK';
const NOTIFICATION_COOLDOWN = 2 * 60 * 1000; // 2 minutes in milliseconds
const STORAGE_KEY = 'dinnafind_geofences';

// Add a venue-based cooldown to prevent notifications for the same restaurant
// even when geofence IDs change (e.g., after distance adjustments)

type Geofence = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  // Optional venue id for direct navigation
  venueId?: string;
};

// Initialize notification permissions
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

TaskManager.defineTask(
  GEOFENCE_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<any>) => {
    if (error) {
      logger.error('[GeofencingService] Geofence error:', error);
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

      logger.info(
        `[GeofencingService] Geofence event: ${eventTypeStr} | Region:`,
        JSON.stringify(region),
      );
      if (eventType === Location.GeofencingEventType.Enter) {
        // Get restaurant name and venueId from stored geofences
        const storedData = await AsyncStorage.getItem(STORAGE_KEY);
        let restaurantName = region.identifier;
        let venueId: string | undefined = undefined;

        // Guard clause: if no geofence data is available, wait and retry
        if (!storedData || storedData === '[]') {
          logger.warn(
            '[GeofencingService] No geofence data available, waiting for data to populate...',
          );

          // Wait up to 3 seconds for geofence data to be populated
          for (let i = 0; i < 6; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
            const retryData = await AsyncStorage.getItem(STORAGE_KEY);
            if (retryData && retryData !== '[]') {
              const geofences: Geofence[] = JSON.parse(retryData);
              const geofence = geofences.find(
                (g) => g.id === region.identifier,
              );
              if (geofence) {
                restaurantName = geofence.name;
                venueId = geofence.venueId;
                logger.info(
                  `[GeofencingService] Found geofence after retry - Name: ${restaurantName}, VenueId: ${venueId}`,
                );
                break;
              }
            }
          }

          // If still no data after waiting, skip the notification
          if (restaurantName === region.identifier) {
            logger.warn(
              '[GeofencingService] Geofence data still not available after waiting, skipping notification',
            );
            return;
          }
        } else {
          // Normal lookup process
          try {
            const geofences: Geofence[] = JSON.parse(storedData);
            logger.info(
              '[GeofencingService] Parsed geofences count:',
              geofences.length,
            );

            const geofence = geofences.find((g) => g.id === region.identifier);
            if (geofence) {
              restaurantName = geofence.name;
              venueId = geofence.venueId;
              logger.info(
                `[GeofencingService] Using geofence data - Name: ${restaurantName}, VenueId: ${venueId}`,
              );
            } else {
              logger.warn(
                '[GeofencingService] Geofence not found for ID:',
                region.identifier,
              );

              // Fallback: try to find by venueId (in case the region identifier is actually a venue ID)
              const fallbackGeofence = geofences.find(
                (g) => g.venueId === region.identifier,
              );
              if (fallbackGeofence) {
                restaurantName = fallbackGeofence.name;
                venueId = fallbackGeofence.venueId;
                logger.info(
                  `[GeofencingService] Found geofence by venueId fallback - Name: ${restaurantName}, VenueId: ${venueId}`,
                );
              } else {
                logger.warn(
                  '[GeofencingService] Geofence not found by venueId fallback either',
                );

                // Additional fallback: try to find by name (in case the region identifier is somehow the name)
                const nameFallbackGeofence = geofences.find(
                  (g) => g.name === region.identifier,
                );
                if (nameFallbackGeofence) {
                  restaurantName = nameFallbackGeofence.name;
                  venueId = nameFallbackGeofence.venueId;
                  logger.info(
                    `[GeofencingService] Found geofence by name fallback - Name: ${restaurantName}, VenueId: ${venueId}`,
                  );
                } else {
                  logger.warn(
                    '[GeofencingService] Geofence not found by name fallback either',
                  );

                  // Instead of using a generic message, log the error and skip the notification
                  logger.error(
                    '[GeofencingService] CRITICAL: Could not find geofence data for region identifier:',
                    region.identifier,
                  );
                  logger.error(
                    '[GeofencingService] This indicates a serious data synchronization issue',
                  );
                  logger.error(
                    '[GeofencingService] Available geofence count:',
                    geofences.length,
                  );

                  // Skip sending notification since we can't provide meaningful information
                  logger.info(
                    '[GeofencingService] Skipping notification due to missing geofence data',
                  );
                  return;
                }
              }
            }
          } catch (parseError) {
            logger.error(
              '[GeofencingService] Failed to parse stored geofence data:',
              parseError,
            );
            return;
          }
        }

        // Check cooldown
        const now = Date.now();
        const lastNotificationTime = await AsyncStorage.getItem(
          `last_notification_${region.identifier}`,
        );
        // Fix: Parse the stored time correctly
        let lastTime = 0;
        if (lastNotificationTime) {
          // Try to parse as integer first (for backward compatibility)
          const parsedInt = parseInt(lastNotificationTime, 10);
          if (!isNaN(parsedInt)) {
            lastTime = parsedInt;
          } else {
            // If it's not a valid integer, try to parse as ISO string
            const parsedDate = new Date(lastNotificationTime);
            if (!isNaN(parsedDate.getTime())) {
              lastTime = parsedDate.getTime();
            }
          }
        }

        // ADDITIONAL CHECK: Check venue-based cooldown to prevent notifications
        // for the same restaurant even when geofence IDs change
        let venueLastTime = 0;
        if (venueId) {
          const venueCooldownKey = `venue_cooldown_${venueId}`;
          const venueLastNotificationTime =
            await AsyncStorage.getItem(venueCooldownKey);
          if (venueLastNotificationTime) {
            const parsedVenueInt = parseInt(venueLastNotificationTime, 10);
            if (!isNaN(parsedVenueInt)) {
              venueLastTime = parsedVenueInt;
            }
          }
        }

        const timeSinceLastNotification = now - lastTime;
        const timeSinceLastVenueNotification = venueId
          ? now - venueLastTime
          : Number.MAX_SAFE_INTEGER;
        const cooldownRemaining = Math.max(
          0,
          NOTIFICATION_COOLDOWN - timeSinceLastNotification,
        );
        const venueCooldownRemaining = venueId
          ? Math.max(0, NOTIFICATION_COOLDOWN - timeSinceLastVenueNotification)
          : 0;

        logger.info(
          `[GeofencingService] Cooldown check for ${restaurantName}:`,
        );
        logger.info(
          `  - Last notification: ${lastTime ? new Date(lastTime).toISOString() : 'Never'}`,
        );
        logger.info(
          `  - Time since last: ${Math.round(timeSinceLastNotification / 1000)}s`,
        );
        logger.info(
          `  - Cooldown period: ${Math.round(NOTIFICATION_COOLDOWN / 1000)}s`,
        );
        logger.info(
          `  - Cooldown remaining: ${Math.round(cooldownRemaining / 1000)}s`,
        );
        if (venueId) {
          logger.info(
            `  - Venue cooldown: ${Math.round(timeSinceLastVenueNotification / 1000)}s since last notification for this venue`,
          );
          logger.info(
            `  - Venue cooldown remaining: ${Math.round(venueCooldownRemaining / 1000)}s`,
          );
        }

        // Check both geofence-specific and venue-based cooldowns
        if (
          timeSinceLastNotification > NOTIFICATION_COOLDOWN &&
          timeSinceLastVenueNotification > NOTIFICATION_COOLDOWN
        ) {
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

          // Store notification time for both geofence and venue
          await AsyncStorage.setItem(
            `last_notification_${region.identifier}`,
            now.toString(),
          );
          if (venueId) {
            await AsyncStorage.setItem(
              `venue_cooldown_${venueId}`,
              now.toString(),
            );
          }
          logger.info(
            '🌎  [GeofencingService] 📣 Notification sent for ENTER event:',
            restaurantName,
          );
        } else {
          const reason =
            timeSinceLastNotification <= NOTIFICATION_COOLDOWN
              ? 'geofence cooldown'
              : 'venue cooldown';
          logger.info(
            `[GeofencingService] ⏰ Cooldown active (${reason}), skipping notification for: ${restaurantName}`,
          );
        }
      }
      if (eventType === Location.GeofencingEventType.Exit) {
        // Don't send notifications for EXIT events
        logger.info(
          '[GeofencingService] EXIT event (no notification sent):',
          region.identifier,
        );
      }
    }
  },
);

class GeofencingService {
  private static instance: GeofencingService;
  geofences: Geofence[] = [];
  private updateTimeout: number | null = null;
  private isUpdating = false;
  private isInitialized = false;
  private pendingOperations = new Set<string>();

  // Singleton pattern to prevent multiple instances
  static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  private constructor() {
    // Private constructor to enforce singleton
  }

  async addGeofence(geofence: Geofence): Promise<void> {
    // Validate geofence data before adding
    if (!geofence.id || !geofence.name) {
      logger.geofence('Invalid geofence data', { geofence }, 'error');
      throw new Error('Geofence must have both id and name');
    }

    // Deduplicate operations
    const operationKey = `add_${geofence.id}`;
    if (this.pendingOperations.has(operationKey)) {
      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Skipping duplicate add operation', {
            id: geofence.id,
          });
        }
      } catch {
        // Constants not available, skip verbose logging
      }
      return;
    }

    this.pendingOperations.add(operationKey);

    try {
      // Check for duplicates
      const existingIndex = this.geofences.findIndex(
        (g) => g.id === geofence.id,
      );
      if (existingIndex >= 0) {
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('Updating existing geofence', { id: geofence.id });
          }
        } catch {
          // Constants not available, skip verbose logging
        }
        this.geofences[existingIndex] = geofence;
      } else {
        this.geofences.push(geofence);
      }

      logger.geofence('Geofence added/updated', {
        id: geofence.id,
        name: geofence.name,
      });
      logger.geofence('Total geofences count', {
        count: this.geofences.length,
      });
      await this._saveGeofences();
      this._debouncedUpdateGeofences();
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  async removeGeofence(id: string): Promise<void> {
    // Deduplicate operations
    const operationKey = `remove_${id}`;
    if (this.pendingOperations.has(operationKey)) {
      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Skipping duplicate remove operation', { id });
        }
      } catch {
        // Constants not available, skip verbose logging
      }
      return;
    }

    this.pendingOperations.add(operationKey);

    try {
      this.geofences = this.geofences.filter((g) => g.id !== id);
      logger.geofence('Geofence removed', { id });
      logger.geofence('Total geofences count', {
        count: this.geofences.length,
      });
      await this._saveGeofences();
      this._debouncedUpdateGeofences();
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  private async _saveGeofences(): Promise<void> {
    try {
      // Only log in verbose mode to reduce noise
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Saving geofences to storage', {
            count: this.geofences.length,
          });
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.geofences));

      // Only log success in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Successfully saved geofences to storage');
        }
      } catch {
        // Constants not available, skip verbose logging
      }
    } catch (error) {
      logger.geofence('Failed to save geofences', { error }, 'error');
      throw error; // Re-throw to make the error more visible
    }
  }

  private async _loadGeofences(): Promise<void> {
    try {
      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Loading geofences from storage...');
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (stored) {
        this.geofences = JSON.parse(stored);
        // Only log count in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('Successfully loaded geofences', {
              count: this.geofences.length,
            });
          }
        } catch {
          // Constants not available, skip verbose logging
        }
      } else {
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('No stored geofence data found');
          }
        } catch {
          // Constants not available, skip verbose logging
        }
        this.geofences = [];
      }
    } catch (error) {
      logger.geofence('Failed to load geofences', { error }, 'error');
      this.geofences = []; // Reset to empty array on error
    }
  }

  private _debouncedUpdateGeofences(): void {
    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Set new timeout to debounce updates
    this.updateTimeout = setTimeout(async () => {
      if (!this.isUpdating) {
        this.isUpdating = true;
        try {
          await this._updateGeofences();
        } finally {
          this.isUpdating = false;
        }
      }
    }, 500); // 500ms debounce
  }

  private async _updateGeofences(): Promise<void> {
    try {
      // First check if we have location permissions
      const { status: foregroundStatus } =
        await Location.getForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        logger.geofence('No foreground location permission', null, 'warn');
        return;
      }

      const { status: backgroundStatus } =
        await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        logger.geofence('No background location permission', null, 'warn');
        return;
      }

      // Stop existing geofencing task
      try {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      } catch {
        // It's ok if there's no task to stop
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('No existing geofencing task to stop');
          }
        } catch {
          // Constants not available, skip verbose logging
        }
      }

      if (this.geofences.length === 0) {
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('No geofences to monitor');
          }
        } catch {
          // Constants not available, skip verbose logging
        }
        return;
      }

      // Ensure geofence data is saved before starting monitoring
      await this._saveGeofences();

      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence(
            'Ensured geofence data is saved before starting monitoring',
          );
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      const regions = this.geofences.map((geofence) => ({
        identifier: geofence.id,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: Math.round(Math.max(geofence.radius, 100)), // Minimum 100m radius for iOS, rounded to integer
        notifyOnEnter: true, // Only notify on ENTER
        notifyOnExit: false, // Don't notify on EXIT
      }));

      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Starting geofencing with regions count', {
            count: regions.length,
          });
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);

      // Only log success in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Geofencing started successfully');
        }
      } catch {
        // Constants not available, skip verbose logging
      }
    } catch (e) {
      logger.geofence('Failed to update geofences', { error: e }, 'error');
      // Don't throw - just log the error
    }
  }

  // Debug method to log all geofences
  logAllGeofences() {
    logger.info(
      '[GeofencingService] Current geofences:',
      JSON.stringify(this.geofences),
    );
  }

  // Get current geofence state for debugging
  async getCurrentGeofenceState() {
    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    logger.info(
      '[GeofencingService] Current in-memory geofences count:',
      this.geofences.length,
    );
    logger.info(
      '[GeofencingService] Current stored geofences count:',
      storedData ? JSON.parse(storedData).length : 0,
    );
    return {
      inMemory: this.geofences,
      stored: storedData ? JSON.parse(storedData) : null,
    };
  }

  // Force reload geofences from storage
  async reloadGeofencesFromStorage() {
    logger.info('[GeofencingService] Reloading geofences from storage...');
    await this._loadGeofences();
    logger.info(
      '[GeofencingService] Reloaded geofences count:',
      this.geofences.length,
    );
  }

  // Force refresh geofence data and restart monitoring
  async refreshGeofenceData() {
    logger.info('[GeofencingService] Force refreshing geofence data...');

    // Reload from storage
    await this._loadGeofences();

    // Validate data integrity
    const validGeofences = this.geofences.filter(
      (g) => g.id && g.name && g.latitude && g.longitude,
    );
    if (validGeofences.length !== this.geofences.length) {
      logger.warn(
        '[GeofencingService] Found invalid geofences, cleaning up...',
      );
      this.geofences = validGeofences;
      await this._saveGeofences();
    }

    // Restart geofencing with validated data
    await this._updateGeofences();

    logger.info(
      '[GeofencingService] Geofence data refresh complete. Valid geofences:',
      validGeofences.length,
    );
  }

  // Check for mismatches between monitored regions and stored data
  async checkGeofenceConsistency() {
    logger.info('[GeofencingService] Checking geofence consistency...');

    try {
      // Get stored geofences
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      const storedGeofences = storedData ? JSON.parse(storedData) : [];

      // Check in-memory vs stored consistency
      const inMemoryIds = this.geofences.map((g: Geofence) => g.id);
      const storedIds = storedGeofences.map((g: Geofence) => g.id);

      const missingInStorage = inMemoryIds.filter(
        (id: string) => !storedIds.includes(id),
      );
      const missingInMemory = storedIds.filter(
        (id: string) => !inMemoryIds.includes(id),
      );

      if (missingInStorage.length > 0) {
        logger.warn(
          '[GeofencingService] Geofences in memory but not in storage:',
          missingInStorage,
        );
      }

      if (missingInMemory.length > 0) {
        logger.warn(
          '[GeofencingService] Geofences in storage but not in memory:',
          missingInMemory,
        );
      }

      if (missingInStorage.length === 0 && missingInMemory.length === 0) {
        logger.info('[GeofencingService] Geofence consistency check passed');
      } else {
        logger.warn('[GeofencingService] Geofence consistency issues detected');
      }

      return {
        inMemoryGeofences: this.geofences,
        storedGeofences,
        missingInStorage,
        missingInMemory,
      };
    } catch (error) {
      logger.error(
        '[GeofencingService] Error checking geofence consistency:',
        error,
      );
      return null;
    }
  }

  // Validate and fix geofence data inconsistencies
  async validateAndFixGeofences() {
    logger.info('[GeofencingService] Validating geofence data...');

    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      logger.info('[GeofencingService] No stored geofence data found');
      return;
    }

    try {
      const storedGeofences: Geofence[] = JSON.parse(storedData);
      logger.info(
        '[GeofencingService] Stored geofences count:',
        storedGeofences.length,
      );
      logger.info(
        '[GeofencingService] In-memory geofences count:',
        this.geofences.length,
      );

      // Check if in-memory and stored geofences match
      if (JSON.stringify(storedGeofences) !== JSON.stringify(this.geofences)) {
        logger.warn('[GeofencingService] Geofence data mismatch detected!');
        logger.info(
          '[GeofencingService] Reloading from storage to fix inconsistency...',
        );
        await this._loadGeofences();
        logger.info(
          '[GeofencingService] Fixed geofences count:',
          this.geofences.length,
        );
      } else {
        logger.info('[GeofencingService] Geofence data is consistent');
      }
    } catch (error) {
      logger.error(
        '[GeofencingService] Error validating geofence data:',
        error,
      );
    }
  }

  // Clear and rebuild geofences from bucket list items
  async rebuildGeofencesFromBucketList(
    bucketListItems: any[],
    distanceMiles: number = 1.25,
  ) {
    logger.info('[GeofencingService] Rebuilding geofences from bucket list...');

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
        logger.info(
          `[GeofencingService] Rebuilt geofence for: ${item.venue.name}`,
        );
      }
    }

    logger.info(
      `[GeofencingService] Rebuilt ${addedCount} geofences from bucket list`,
    );
  }

  // Initialize the service
  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Already initialized, skipping...');
        }
      } catch {
        // Constants not available, skip verbose logging
      }
      return;
    }

    // Only log initialization in verbose mode
    try {
      if (
        Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
      ) {
        logger.geofence('Initializing...');
      }
    } catch {
      // Constants not available, skip verbose logging
    }

    try {
      // Check if the task is already defined
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCE_TASK_NAME);

      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Task defined', { isDefined: isTaskDefined });
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      // Do not actively request notification permissions here to avoid
      // competing system prompts during app startup. Permission requests
      // are centralized in PermissionsService.
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('Notification permission not granted yet');
          }
        } catch {
          // Constants not available, skip verbose logging
        }
      }

      // Load saved geofences
      await this._loadGeofences();

      // Ensure geofence data is available and synchronized
      const dataAvailable = await this.ensureGeofenceDataAvailable();

      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Geofence data available', {
            available: dataAvailable,
          });
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      // If we have geofences and permissions, restart monitoring
      if (this.geofences.length > 0) {
        const { status: locationStatus } =
          await Location.getForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          await this._updateGeofences();
        }
      }

      this.isInitialized = true;
    } catch (error) {
      logger.geofence('Initialization error', { error }, 'error');
    }
  }

  // Restart geofencing with current settings
  async restartGeofencing() {
    logger.info(
      '[GeofencingService] Restarting geofencing with new settings...',
    );
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    await this._updateGeofences();
    logger.info('[GeofencingService] Geofencing restarted');
  }

  // Get active geofences
  getActiveGeofences(): Geofence[] {
    return [...this.geofences];
  }

  // Clear all geofences
  async clearAllGeofences(): Promise<void> {
    // Only log in verbose mode
    try {
      if (
        Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
      ) {
        logger.geofence('Clearing all geofences...');
      }
    } catch {
      // Constants not available, skip verbose logging
    }

    this.geofences = [];
    await this._saveGeofences();
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Stopped geofencing task');
        }
      } catch {
        // Constants not available, skip verbose logging
      }
    } catch {
      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('No active geofences to stop');
        }
      } catch {
        // Constants not available, skip verbose logging
      }
    }

    // Also clear all notification cooldowns
    await this.clearAllNotificationCooldowns();
  }

  // Clear all notification cooldowns
  async clearAllNotificationCooldowns(): Promise<void> {
    // Only log in verbose mode
    try {
      if (
        Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
      ) {
        logger.geofence('Clearing all notification cooldowns...');
      }
    } catch {
      // Constants not available, skip verbose logging
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      const cooldownKeys = keys.filter((key) =>
        key.startsWith('last_notification_'),
      );
      if (cooldownKeys.length > 0) {
        await AsyncStorage.multiRemove(cooldownKeys);
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence(
              `Cleared ${cooldownKeys.length} notification cooldowns`,
            );
          }
        } catch {
          // Constants not available, skip verbose logging
        }
      }
    } catch (error) {
      logger.geofence(
        'Error clearing notification cooldowns',
        { error },
        'error',
      );
    }
  }

  // Check if geofence exists
  hasGeofence(id: string): boolean {
    return this.geofences.some((g) => g.id === id);
  }

  // Ensure geofence data is available and synchronized
  async ensureGeofenceDataAvailable(): Promise<boolean> {
    // Only log in verbose mode
    try {
      if (
        Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
      ) {
        logger.geofence('Ensuring geofence data is available...');
      }
    } catch {
      // Constants not available, skip verbose logging
    }

    try {
      // Check if geofence data exists in storage
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      const hasStoredData = storedData && storedData !== '[]';

      // Only log in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('Has stored geofence data', {
            hasData: hasStoredData,
          });
        }
      } catch {
        // Constants not available, skip verbose logging
      }
      // Only log count in verbose mode
      try {
        if (
          Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE === 'true'
        ) {
          logger.geofence('In-memory geofences count', {
            count: this.geofences.length,
          });
        }
      } catch {
        // Constants not available, skip verbose logging
      }

      // If we have in-memory geofences but no stored data, save them
      if (this.geofences.length > 0 && !hasStoredData) {
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('Saving in-memory geofences to storage...');
          }
        } catch {
          // Constants not available, skip verbose logging
        }
        await this._saveGeofences();
        return true;
      }

      // If we have stored data but no in-memory geofences, load them
      if (hasStoredData && this.geofences.length === 0) {
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('Loading geofences from storage...');
          }
        } catch {
          // Constants not available, skip verbose logging
        }
        await this._loadGeofences();
        return true;
      }

      // If both are available, check consistency
      if (hasStoredData && this.geofences.length > 0) {
        const storedGeofences = JSON.parse(storedData);
        const isConsistent =
          JSON.stringify(storedGeofences) === JSON.stringify(this.geofences);
        // Only log in verbose mode
        try {
          if (
            Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEOFENCE_VERBOSE ===
            'true'
          ) {
            logger.geofence('Geofence data consistency', { isConsistent });
          }
        } catch {
          // Constants not available, skip verbose logging
        }
        return isConsistent;
      }

      return false;
    } catch (error) {
      logger.error(
        '[GeofencingService] Error ensuring geofence data availability:',
        error,
      );
      return false;
    }
  }
}

export default GeofencingService.getInstance();

if (__DEV__) {
  (globalThis as any).logAllGeofences = () => {
    GeofencingService.getInstance().logAllGeofences();
  };
  (globalThis as any).restartGeofencing = async () => {
    await GeofencingService.getInstance().restartGeofencing();
  };
  (globalThis as any).getGeofenceState = async () => {
    return await GeofencingService.getInstance().getCurrentGeofenceState();
  };
  (globalThis as any).reloadGeofences = async () => {
    await GeofencingService.getInstance().reloadGeofencesFromStorage();
  };
  (globalThis as any).validateGeofences = async () => {
    await GeofencingService.getInstance().validateAndFixGeofences();
  };
  (globalThis as any).rebuildGeofences = async (
    bucketListItems: any[],
    distanceMiles: number = 1.25,
  ) => {
    await GeofencingService.getInstance().rebuildGeofencesFromBucketList(
      bucketListItems,
      distanceMiles,
    );
  };
  (globalThis as any).refreshGeofenceData = async () => {
    await GeofencingService.getInstance().refreshGeofenceData();
  };
  (globalThis as any).checkGeofenceConsistency = async () => {
    return await GeofencingService.getInstance().checkGeofenceConsistency();
  };
  (globalThis as any).ensureGeofenceData = async () => {
    return await GeofencingService.getInstance().ensureGeofenceDataAvailable();
  };
  (globalThis as any).clearNotificationCooldowns = async () => {
    await GeofencingService.getInstance().clearAllNotificationCooldowns();
  };
}
