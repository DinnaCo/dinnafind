import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

class LocationPermissionService {
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('[LocationPermissions] Requesting permissions...');
      
      // Request foreground permissions first
      const { status: foregroundStatus } = 
        await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('[LocationPermissions] Foreground permission denied');
        this.showPermissionDeniedAlert('location');
        return false;
      }

      console.log('[LocationPermissions] Foreground permission granted');

      // Request background permissions for geofencing
      const { status: backgroundStatus } = 
        await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('[LocationPermissions] Background permission denied');
        this.showPermissionDeniedAlert('background location');
        return false;
      }

      console.log('[LocationPermissions] All permissions granted');
      return true;
    } catch (error) {
      console.error('[LocationPermissions] Error requesting permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    const foreground = await Location.getForegroundPermissionsAsync();
    const background = await Location.getBackgroundPermissionsAsync();
    
    return {
      foreground: foreground.status === 'granted',
      background: background.status === 'granted',
    };
  }

  private showPermissionDeniedAlert(permissionType: string) {
    Alert.alert(
      'Permission Required',
      `DinnaFind needs ${permissionType} permission to notify you when you're near restaurants on your bucket list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }
        }
      ]
    );
  }
}

export default new LocationPermissionService();
