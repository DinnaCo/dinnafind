import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { logger } from '@/utils/logger';

// Helper to debug location errors
export function debugLocationError(error: any) {
  logger.error('[Location] Error details:', {
    code: error.code,
    message: error.message,
    domain: error.domain,
    userInfo: error.userInfo,
    nativeStackIOS: error.nativeStackIOS,
  });

  // kCLErrorDomain Code=0 typically means location services are off
  if (error.code === 0 || error.message?.includes('kCLErrorDomain')) {
    logger.info('[Location] This error typically means:');
    logger.info('1. Location services are disabled on the device');
    logger.info('2. The app doesn\'t have proper permissions');
    logger.info('3. The simulator needs location services enabled');
    logger.info('');
    logger.info('To fix on iOS Simulator:');
    logger.info('1. Open Settings app in the simulator');
    logger.info('2. Go to Privacy & Security > Location Services');
    logger.info('3. Turn on Location Services');
    logger.info('4. Find DinnaFind and set to "Always"');
    logger.info('5. In Simulator menu, go to Features > Location > Apple (or custom)');
  }
}
