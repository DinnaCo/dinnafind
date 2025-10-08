import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { SupabaseDataService } from '@/services/supabaseDataService';
import { loginSuccess } from '@/store/slices/authSlice';
import {
  setTheme,
  completeOnboarding,
  setMasterNotificationsEnabled,
  setDistanceMiles,
} from '@/store/slices/uiSlice';
import { setBucketListItems } from '@/store/slices/bucketListSlice';
import { logger } from '@/utils/logger';

export const useSupabaseData = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('🔄 Loading user data from Supabase for user:', userId);

      // Load user profile
      const userProfile = await SupabaseDataService.loadUserProfile(userId);
      if (userProfile) {
        dispatch(loginSuccess(userProfile));
        logger.info('✅ User profile loaded:', userProfile);
      }

      // Load user preferences
      const preferences = await SupabaseDataService.loadUserPreferences(userId);
      if (preferences) {
        // Apply UI preferences
        if (preferences.theme) {
          dispatch(setTheme(preferences.theme));
        }
        if (preferences.hasCompletedOnboarding) {
          dispatch(completeOnboarding());
        }

        // Apply user preferences
        if (preferences.masterNotificationsEnabled !== undefined) {
          dispatch(setMasterNotificationsEnabled(preferences.masterNotificationsEnabled));
        }
        if (preferences.distanceMiles !== undefined) {
          dispatch(setDistanceMiles(preferences.distanceMiles));
        }

        logger.info('✅ User preferences loaded:', preferences);
      }

      // Load bucket list items
      const bucketListItems = await SupabaseDataService.loadBucketListItems(userId);
      if (bucketListItems.length > 0) {
        dispatch(setBucketListItems(bucketListItems));
      }

      logger.info('✅ All user data loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user data';
      setError(errorMessage);
      logger.error('❌ Failed to load user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const migratePersistedData = async (userId: string, persistedState: any) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('🔄 Migrating persisted data to Supabase...');
      const success = await SupabaseDataService.migratePersistedData(userId, persistedState);

      if (success) {
        logger.info('✅ Migration completed successfully');
        // After migration, load the data from Supabase
        await loadUserData(userId);
      } else {
        throw new Error('Migration failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to migrate data';
      setError(errorMessage);
      logger.error('❌ Failed to migrate persisted data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    loadUserData,
    migratePersistedData,
  };
};
