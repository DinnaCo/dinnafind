import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const ONBOARDING_PERMISSIONS_KEY = 'dinnafind_onboarding_permissions_requested';

// Check if we're in a simulator/test environment
const isSimulator = () => {
  if (Platform.OS === 'ios') {
    return Constants.appOwnership === 'expo' || __DEV__;
  }
  return __DEV__;
};

export const requestRequiredPermissions = async () => {
  try {
    logger.info('[Permissions] Requesting permissions…');

    // Check if we're in a simulator first
    if (isSimulator()) {
      logger.info('[Permissions] Running in simulator - using more lenient handling');
    }

    let allGranted = true;

    // 1) Notifications - request if not granted
    const notifCurrent = await Notifications.getPermissionsAsync();
    let notificationStatus = notifCurrent.status;
    logger.info('[Permissions] Notification current status:', notificationStatus);

    if (notificationStatus !== 'granted') {
      try {
        const notifResult = await Notifications.requestPermissionsAsync();
        notificationStatus = notifResult.status;
        logger.info('[Permissions] Notification request result:', notificationStatus);
        if (notificationStatus !== 'granted') {
          allGranted = false;
        }
      } catch (error) {
        logger.warn('[Permissions] Notification permission request failed:', error);
        allGranted = false;
      }
    }

    // 2) Foreground location - request if not granted
    const fgCurrent = await Location.getForegroundPermissionsAsync();
    let foregroundStatus = fgCurrent.status;
    logger.info('[Permissions] Foreground location current status:', foregroundStatus);

    // Note: Even if denied, we can try to request again (iOS will show the prompt)

    if (foregroundStatus !== 'granted') {
      try {
        const fgResult = await Location.requestForegroundPermissionsAsync();
        foregroundStatus = fgResult.status;
        logger.info('[Permissions] Foreground location request result:', foregroundStatus);
        if (foregroundStatus !== 'granted') {
          return false; // Can't continue without foreground location
        }
      } catch (error) {
        logger.warn('[Permissions] Foreground location permission request failed:', error);
        return false;
      }
    }

    // 3) Background location - request if not set to "Always"
    const bgCurrent = await Location.getBackgroundPermissionsAsync();
    let backgroundStatus = bgCurrent.status;
    logger.info('[Permissions] Background location current status:', backgroundStatus);

    if (backgroundStatus !== 'granted') {
      try {
        const bgResult = await Location.requestBackgroundPermissionsAsync();
        backgroundStatus = bgResult.status;
        logger.info('[Permissions] Background location request result:', backgroundStatus);
        if (backgroundStatus !== 'granted') {
          allGranted = false;
        }
      } catch (err) {
        logger.warn('[Permissions] Background location request failed:', err);
        allGranted = false;
      }
    }

    logger.info('[Permissions] Final statuses:', {
      notifications: notificationStatus,
      foreground: foregroundStatus,
      background: backgroundStatus,
    });

    return allGranted;
  } catch (error) {
    logger.error('[Permissions] Error while requesting permissions:', error);
    return false;
  }
};

export const checkAllPermissions = async () => {
  const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
  const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
  const { status: notificationStatus } = await Notifications.getPermissionsAsync();

  return {
    notifications: {
      granted: notificationStatus === 'granted',
    },
    location: {
      foreground: foregroundStatus === 'granted',
      background: backgroundStatus === 'granted',
    },
  };
};

// Check if permissions are already denied to avoid re-requesting
export const arePermissionsDenied = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    const { status: notificationStatus } = await Notifications.getPermissionsAsync();

    // Note: We can still re-request permissions even if they were previously denied
    // iOS will show the permission prompt again, which is what we want
    logger.info(`[Permissions] Permission status - Foreground: ${foregroundStatus}, Notifications: ${notificationStatus}`);
    return false; // Allow re-requesting
  } catch (error) {
    logger.error('[Permissions] Error checking if permissions are denied:', error);
    return false;
  }
};

// Check if permissions have been requested during onboarding
export const hasRequestedOnboardingPermissions = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_PERMISSIONS_KEY);
    return value === 'true';
  } catch (error) {
    logger.error('[Permissions] Error checking onboarding permissions flag:', error);
    return false;
  }
};

// Mark that permissions have been requested during onboarding
export const markOnboardingPermissionsRequested = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_PERMISSIONS_KEY, 'true');
    logger.info('[Permissions] Marked onboarding permissions as requested');
  } catch (error) {
    logger.error('[Permissions] Error setting onboarding permissions flag:', error);
  }
};

// Request permissions during onboarding (after signup/signin)
export const requestOnboardingPermissions = async (): Promise<boolean> => {
  try {
    logger.info('[Permissions] Requesting onboarding permissions...');

    let allGranted = true;

    // 1) Request notifications first
    try {
      const notifResult = await Notifications.requestPermissionsAsync();
      logger.info('[Permissions] Notification request result:', notifResult.status);
      if (notifResult.status !== 'granted') {
        allGranted = false;
      }
    } catch (error) {
      logger.warn('[Permissions] Notification permission request failed:', error);
      allGranted = false;
    }

    // 2) Request foreground location
    try {
      const fgResult = await Location.requestForegroundPermissionsAsync();
      logger.info('[Permissions] Foreground location request result:', fgResult.status);
      if (fgResult.status !== 'granted') {
        allGranted = false;
      }
    } catch (error) {
      logger.warn('[Permissions] Foreground location permission request failed:', error);
      allGranted = false;
    }

    // 3) Request background location (only if foreground was granted)
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
      try {
        const bgResult = await Location.requestBackgroundPermissionsAsync();
        logger.info('[Permissions] Background location request result:', bgResult.status);
        if (bgResult.status !== 'granted') {
          allGranted = false;
        }
      } catch (error) {
        logger.warn('[Permissions] Background location request failed:', error);
        allGranted = false;
      }
    } else {
      allGranted = false;
    }

    // Mark as requested regardless of outcome
    await markOnboardingPermissionsRequested();

    logger.info('[Permissions] Onboarding permissions request complete:', { allGranted });
    return allGranted;
  } catch (error) {
    logger.error('[Permissions] Error requesting onboarding permissions:', error);
    await markOnboardingPermissionsRequested();
    return false;
  }
};

// Request specific missing permissions
export const requestMissingPermissions = async () => {
  try {
    logger.info('[Permissions] Requesting missing permissions…');

    const currentPermissions = await checkAllPermissions();
    let requestedAny = false;

    // Request notifications if missing
    if (!currentPermissions.notifications.granted) {
      logger.info('[Permissions] Requesting notification permissions...');
      try {
        const result = await Notifications.requestPermissionsAsync();
        logger.info('[Permissions] Notification request result:', result.status);
        requestedAny = true;
      } catch (error) {
        logger.warn('[Permissions] Failed to request notification permissions:', error);
      }
    }

    // Request foreground location if missing (needed for background location)
    if (!currentPermissions.location.foreground) {
      logger.info('[Permissions] Requesting foreground location permissions...');
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        logger.info('[Permissions] Foreground location request result:', result.status);
        requestedAny = true;
      } catch (error) {
        logger.warn('[Permissions] Failed to request foreground location permissions:', error);
      }
    }

    // Request background location if missing
    if (!currentPermissions.location.background) {
      logger.info('[Permissions] Requesting background location permissions...');
      try {
        const result = await Location.requestBackgroundPermissionsAsync();
        logger.info('[Permissions] Background location request result:', result.status);
        requestedAny = true;
      } catch (error) {
        logger.warn('[Permissions] Failed to request background location permissions:', error);
      }
    }

    // Return true if we requested any permissions (so UI can refresh)
    return requestedAny;
  } catch (error) {
    logger.error('[Permissions] Error requesting missing permissions:', error);
    return false;
  }
};
