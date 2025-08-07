import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export async function checkAndRequestLocationServices(): Promise<boolean> {
  try {
    console.log('[Location] Checking location services...');
    
    // Check if location services are enabled
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    
    if (!isLocationEnabled) {
      console.log('[Location] Location services are disabled');
      
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Location Services Disabled',
          'Please enable Location Services in Settings to use geofencing features.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                Linking.openURL('app-settings:');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Location Services Disabled',
          'Please enable Location Services to use geofencing features.',
          [
            { text: 'OK' }
          ]
        );
      }
      
      return false;
    }
    
    console.log('[Location] Location services are enabled');
    
    // Now check and request permissions
    let { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.log('[Location] Requesting foreground permission...');
      const result = await Location.requestForegroundPermissionsAsync();
      foregroundStatus = result.status;
    }
    
    if (foregroundStatus !== 'granted') {
      console.log('[Location] Foreground permission denied');
      return false;
    }
    
    console.log('[Location] Foreground permission granted');
    
    // Request background permission for geofencing
    let { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      console.log('[Location] Requesting background permission...');
      const result = await Location.requestBackgroundPermissionsAsync();
      backgroundStatus = result.status;
    }
    
    if (backgroundStatus !== 'granted') {
      console.log('[Location] Background permission denied');
      Alert.alert(
        'Background Location Required',
        'DinnaFind needs background location access to notify you when you\'re near restaurants. Please enable "Always Allow" in Settings.',
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
      return false;
    }
    
    console.log('[Location] Background permission granted');
    return true;
    
  } catch (error) {
    console.error('[Location] Error checking location services:', error);
    return false;
  }
}

// Helper to debug location errors
export function debugLocationError(error: any) {
  console.error('[Location] Error details:', {
    code: error.code,
    message: error.message,
    domain: error.domain,
    userInfo: error.userInfo,
    nativeStackIOS: error.nativeStackIOS,
  });
  
  // kCLErrorDomain Code=0 typically means location services are off
  if (error.code === 0 || error.message?.includes('kCLErrorDomain')) {
    console.log('[Location] This error typically means:');
    console.log('1. Location services are disabled on the device');
    console.log('2. The app doesn\'t have proper permissions');
    console.log('3. The simulator needs location services enabled');
    console.log('');
    console.log('To fix on iOS Simulator:');
    console.log('1. Open Settings app in the simulator');
    console.log('2. Go to Privacy & Security > Location Services');
    console.log('3. Turn on Location Services');
    console.log('4. Find DinnaFind and set to "Always"');
    console.log('5. In Simulator menu, go to Features > Location > Apple (or custom)');
  }
}
