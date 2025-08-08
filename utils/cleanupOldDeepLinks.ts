import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clean up old deep link storage keys from the previous implementation
 * Run this once after migrating to the new useDeepLinkOnce hook
 */
export async function cleanupOldDeepLinkStorage() {
  const oldKeys = [
    'dinnafind_deferred_deeplink',
    'dinnafind_simple_deferred_link',
    'dinnafind_initial_url_processed',
    // Keep 'dinnafind_pending_deep_link' as it's still used by the new implementation
  ];

  try {
    await AsyncStorage.multiRemove(oldKeys);
    console.log('[DeepLink Cleanup] Removed old storage keys:', oldKeys);
  } catch (error) {
    console.error('[DeepLink Cleanup] Error removing old keys:', error);
  }
}

// Export for use in app initialization or testing
export default cleanupOldDeepLinkStorage;