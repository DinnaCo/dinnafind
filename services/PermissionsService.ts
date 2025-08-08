import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

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
