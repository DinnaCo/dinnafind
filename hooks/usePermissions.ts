import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { checkAllPermissions, requestMissingPermissions } from '@/services/PermissionsService';
import { logger } from '@/utils/logger';

export interface PermissionState {
  location: {
    foreground: boolean;
    background: boolean;
  };
  notifications: {
    granted: boolean;
  };
}

export interface UsePermissionsReturn {
  permissions: PermissionState;
  isLoading: boolean;
  checkAllPermissions: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
}

export const usePermissions = (
  shouldCheck: boolean = true,
  autoRefresh: boolean = true
): UsePermissionsReturn => {
  const [permissions, setPermissions] = useState<PermissionState>({
    location: { foreground: false, background: false },
    notifications: { granted: false },
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissions = useCallback(async () => {
    try {
      const perms = await checkAllPermissions();
      setPermissions(perms);
      logger.info('[usePermissions] Current permissions:', perms);
    } catch (error) {
      logger.error('[usePermissions] Error checking permissions:', error);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      logger.info('[usePermissions] Requesting missing permissions...');
      const requested = await requestMissingPermissions();

      if (requested) {
        // Wait a moment for user to respond to permission prompts
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Refresh permissions after user response
        await checkPermissions();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[usePermissions] Error requesting permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkPermissions]);

  const refreshPermissions = useCallback(async () => {
    await checkPermissions();
  }, [checkPermissions]);

  // Auto-check permissions when hook is initialized
  useEffect(() => {
    if (shouldCheck) {
      checkPermissions();
    }
  }, [shouldCheck, checkPermissions]);

  // Auto-refresh permissions when they change (if enabled)
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(checkPermissions, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, checkPermissions]);

  return {
    permissions,
    isLoading,
    checkAllPermissions: checkPermissions,
    requestPermissions,
    refreshPermissions,
  };
};
