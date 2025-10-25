// Unmock the service to test the real implementation (mocked in setup.ts)
jest.unmock('@/services/GeofencingService');

import GeofencingService from '@/services/GeofencingService';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

// Mock Dependencies
jest.mock('expo-location', () => ({
  GeofencingEventType: {
    Enter: 1,
    Exit: 2,
  },
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  startGeofencingAsync: jest.fn(),
  stopGeofencingAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      EXPO_PUBLIC_GEOFENCE_VERBOSE: 'true',
    },
  },
}));

// Access private logger methods if needed, or just mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    geofence: jest.fn(),
  },
}));

describe('GeofencingService', () => {
  const GEOFENCE_TASK_NAME = 'MINIMAL_GEOFENCE_TASK';
  let taskDefinitionCallback: any;

  // Helper to flush promises more aggressively without deadlocking fake timers
  const flushPromises = async () => {
      await new Promise(resolve => jest.requireActual('timers').setImmediate(resolve));
  };

  beforeAll(() => {
    // Capture the task definition callback
    const defineTaskMock = TaskManager.defineTask as jest.Mock;
    if (defineTaskMock.mock.calls.length > 0) {
      const call = defineTaskMock.mock.calls.find(c => c[0] === GEOFENCE_TASK_NAME);
      if (call) {
        taskDefinitionCallback = call[1];
      }
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default AsyncStorage mock handles keys appropriately
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key) => {
        // By default return null
        return null;
    });
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

    // Reset service state
    await GeofencingService.clearAllGeofences();
    (GeofencingService as any).isInitialized = false;
    (GeofencingService as any).geofences = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize correctly and load geofences', async () => {
      (TaskManager.isTaskDefined as jest.Mock).mockResolvedValue(false);
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key) => {
          if (key === 'dinnafind_geofences') return JSON.stringify([
            { id: '1', name: 'Test Place', latitude: 10, longitude: 20, radius: 100 }
          ]);
          return null;
      });
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

      await GeofencingService.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('dinnafind_geofences');
      expect(Location.startGeofencingAsync).toHaveBeenCalled();
      expect((GeofencingService as any).isInitialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      (TaskManager.isTaskDefined as jest.Mock).mockResolvedValue(false);
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

      await GeofencingService.initialize();
      await GeofencingService.initialize();

      expect(TaskManager.isTaskDefined).toHaveBeenCalledTimes(1);
    });
  });

  describe('Geofence Management', () => {
    beforeEach(async () => {
        // Setup permissions for adding geofences
        (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    });

    it('should add a geofence', async () => {
      const geofence = { id: '1', name: 'Test Place', latitude: 10, longitude: 20, radius: 100 };

      await GeofencingService.addGeofence(geofence);

      const activeGeofences = GeofencingService.getActiveGeofences();
      expect(activeGeofences).toHaveLength(1);
      expect(activeGeofences[0]).toEqual(geofence);
      expect(AsyncStorage.setItem).toHaveBeenCalled(); // Should save to storage

      // Advance timers to trigger debounce
      jest.advanceTimersByTime(1000);
      await flushPromises();

      // Debug if it fails
      const errorCalls = (logger.error as jest.Mock).mock.calls;
      if (errorCalls.length > 0 || (logger.geofence as jest.Mock).mock.calls.find((c: any) => c[2] === 'error')) {
          console.log('Logger Error Calls in addGeofence:', JSON.stringify(errorCalls));
          console.log('Logger Geofence Error Calls:', JSON.stringify((logger.geofence as jest.Mock).mock.calls.filter((c: any) => c[2] === 'error')));
      }

      expect(Location.startGeofencingAsync).toHaveBeenCalled();
    });

    it('should not add duplicate geofences', async () => {
      const geofence = { id: '1', name: 'Test Place', latitude: 10, longitude: 20, radius: 100 };

      await GeofencingService.addGeofence(geofence);
      await GeofencingService.addGeofence(geofence);

      const activeGeofences = GeofencingService.getActiveGeofences();
      expect(activeGeofences).toHaveLength(1);
    });

    it('should update existing geofence if added again', async () => {
      const geofence1 = { id: '1', name: 'Test Place', latitude: 10, longitude: 20, radius: 100 };
      const geofence2 = { id: '1', name: 'Updated Place', latitude: 11, longitude: 22, radius: 200 };

      await GeofencingService.addGeofence(geofence1);
      await GeofencingService.addGeofence(geofence2);

      const activeGeofences = GeofencingService.getActiveGeofences();
      expect(activeGeofences).toHaveLength(1);
      expect(activeGeofences[0].name).toBe('Updated Place');
    });

    it('should remove a geofence', async () => {
       const geofence = { id: '1', name: 'Test Place', latitude: 10, longitude: 20, radius: 100 };
       await GeofencingService.addGeofence(geofence);

       await GeofencingService.removeGeofence('1');

       const activeGeofences = GeofencingService.getActiveGeofences();
       expect(activeGeofences).toHaveLength(0);

       // Advance timers to trigger debounce
       jest.advanceTimersByTime(1000);
       await flushPromises();

       // Should stop because list is empty
       expect(Location.stopGeofencingAsync).toHaveBeenCalled();
    });

    it('should clear all geofences', async () => {
        await GeofencingService.addGeofence({ id: '1', name: 'P1', latitude: 0, longitude: 0, radius: 100 });
        await GeofencingService.addGeofence({ id: '2', name: 'P2', latitude: 0, longitude: 0, radius: 100 });

        await GeofencingService.clearAllGeofences();

        expect(GeofencingService.getActiveGeofences()).toHaveLength(0);
        expect(Location.stopGeofencingAsync).toHaveBeenCalled();
    });
  });

  describe('Background Task Execution', () => {
    beforeEach(() => {
        // Ensure we have a valid task callback
        const defineTaskMock = TaskManager.defineTask as jest.Mock;
         if (!taskDefinitionCallback && defineTaskMock.mock.calls.length > 0) {
            const call = defineTaskMock.mock.calls.find(c => c[0] === GEOFENCE_TASK_NAME);
            if (call) taskDefinitionCallback = call[1];
        }
    });

    it('should define the task and capture callback', () => {
       expect(taskDefinitionCallback).toBeDefined();
       expect(typeof taskDefinitionCallback).toBe('function');
    });

    it('should handle ENTER event and send notification', async () => {
       // Mock stored geofences so the task can find the name
       const storedGeofences = [{ id: '1', name: 'Burger King', latitude: 10, longitude: 10, radius: 100 }];
       (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key) => {
            if (key === 'dinnafind_geofences') return JSON.stringify(storedGeofences);
            return null; // For cooldowns
       });

       const eventData = {
           data: {
               eventType: Location.GeofencingEventType.Enter,
               region: { identifier: '1' }
           },
           error: null
       };

       await taskDefinitionCallback(eventData);
       await flushPromises();

       expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
           expect.objectContaining({
               content: expect.objectContaining({
                   title: 'DinnaFind!',
                   body: expect.stringContaining('Burger King')
               })
           })
       );

       // Should update last notification time
       expect(AsyncStorage.setItem).toHaveBeenCalledWith(
           'last_notification_1',
           expect.any(String)
       );
    });

    it('should not send notification if cooldown is active', async () => {
        const storedGeofences = [{ id: '1', name: 'Burger King', latitude: 10, longitude: 10, radius: 100 }];
        // Mock specific sequence for getItem:
        // 1. Get geofences
        // 2. Get last_notification_1 (return recent time)
        // 3. Get venue_cooldown_... (optional)
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
            if (key === 'dinnafind_geofences') return JSON.stringify(storedGeofences);
            if (key === 'last_notification_1') return Date.now().toString(); // Just happened
            return null;
        });

        const eventData = {
            data: {
                eventType: Location.GeofencingEventType.Enter,
                region: { identifier: '1' }
            },
            error: null
        };

        await taskDefinitionCallback(eventData);
        await flushPromises();

        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Cooldown active'));
     });

    it('should handle EXIT event (no notification)', async () => {
        const eventData = {
            data: {
                eventType: Location.GeofencingEventType.Exit,
                region: { identifier: '1' }
            },
            error: null
        };

        await taskDefinitionCallback(eventData);

        expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should retry if geofence data is not immediately available', async () => {
        const storageMock = AsyncStorage.getItem as jest.Mock;
        storageMock.mockReset(); // clear previous impl

        storageMock
            .mockResolvedValueOnce('[]') // Initial check
            .mockResolvedValueOnce('[]') // Loop 0 (after 1st wait)
            .mockResolvedValueOnce(JSON.stringify([{ id: '1', name: 'Retry Place' }])); // Loop 1 (after 2nd wait)...

        const eventData = {
            data: {
                eventType: Location.GeofencingEventType.Enter,
                region: { identifier: '1' }
            },
            error: null
        };

        const promise = taskDefinitionCallback(eventData);
        // Advance timers to trigger the retries

        await jest.advanceTimersByTimeAsync(800); // Trigger 1st wait (500ms)
        await flushPromises();
        await jest.advanceTimersByTimeAsync(800); // Trigger 2nd wait (500ms)
        await flushPromises();

        await promise;

        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.objectContaining({
                    body: expect.stringContaining('Retry Place')
                })
            })
        );
    });
  });

  describe('Error Handling', () => {
      it('should gracefully handle permission denial', async () => {
          (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

          await GeofencingService.addGeofence({ id: '1', name: 'Place', latitude: 0, longitude: 0, radius: 100 });
          // Trigger update
          jest.advanceTimersByTime(1000);
          await flushPromises();

          expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
          expect(logger.geofence).toHaveBeenCalledWith(expect.stringContaining('No foreground location permission'), null, 'warn');
      });
  });
});
