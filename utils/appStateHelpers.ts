import { store } from '@/store';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { loginSuccess } from '@/store/slices/authSlice';
import {
  setBucketListItems,
  setMasterNotificationsEnabled,
  setDistanceMiles,
} from '@/store/slices/bucketListSlice';
import { setTheme, completeOnboarding, setNetworkStatus } from '@/store/slices/uiSlice';

/**
 * Helper function to set all store states from Supabase user data
 * This can be used for manual data loading, testing, or data migration
 */
export const setAppStateFromUserData = async (userId: string): Promise<boolean> => {
  console.log('[AppStateHelper] Loading user data from Supabase...');

  try {
    // Load user profile
    const userProfile = await SupabaseDataService.loadUserProfile(userId);
    if (userProfile) {
      store.dispatch(
        loginSuccess({
          id: userProfile.id,
          email: userProfile.email,
          displayName: userProfile.displayName || userProfile.email,
          createdAt: userProfile.createdAt,
          lastLogin: userProfile.lastLogin,
        })
      );
      console.log('[AppStateHelper] User profile loaded');
    }

    // Load bucket list items
    const bucketListItems = await SupabaseDataService.loadBucketListItems(userId);
    store.dispatch(setBucketListItems(bucketListItems));
    console.log(`[AppStateHelper] Loaded ${bucketListItems.length} bucket list items`);

    // Load user preferences
    const preferences = await SupabaseDataService.loadUserPreferences(userId);

    // Set UI preferences
    if (preferences.theme) {
      store.dispatch(setTheme(preferences.theme));
    }
    if (preferences.hasCompletedOnboarding !== undefined) {
      if (preferences.hasCompletedOnboarding) {
        store.dispatch(completeOnboarding());
      }
    }
    if (preferences.networkStatus) {
      store.dispatch(setNetworkStatus(preferences.networkStatus));
    }

    // Set bucket list preferences
    if (preferences.masterNotificationsEnabled !== undefined) {
      store.dispatch(setMasterNotificationsEnabled(preferences.masterNotificationsEnabled));
    }
    if (preferences.distanceMiles !== undefined) {
      store.dispatch(setDistanceMiles(preferences.distanceMiles));
    }

    console.log('[AppStateHelper] User preferences loaded');
    return true;
  } catch (error) {
    console.error('[AppStateHelper] Error loading user data:', error);
    return false;
  }
};

/**
 * Helper function to check if all required user data is loaded
 */
export const isUserDataLoaded = (): boolean => {
  const state = store.getState();

  // Check if auth user exists
  if (!state.auth.user?.id) {
    return false;
  }

  // Check if bucket list is loaded (even if empty)
  if (state.bucketList.items === undefined) {
    return false;
  }

  // Check if UI state is initialized
  if (state.ui.theme === undefined) {
    return false;
  }

  return true;
};

/**
 * Helper function to get loading status for different data types
 */
export const getDataLoadingStatus = () => {
  const state = store.getState();

  return {
    auth: !!state.auth.user?.id,
    bucketList: state.bucketList.items !== undefined,
    ui: state.ui.theme !== undefined,
    allLoaded: isUserDataLoaded(),
  };
};
