import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_PREFIX = 'dinnafind_session_';
const SESSION_TIMESTAMP_KEY = 'dinnafind_session_timestamp';

interface SessionStorageData {
  [key: string]: any;
}

/**
 * Custom session storage hook that mimics sessionStorage behavior
 * Data persists only for the current app session (until app is closed/backgrounded)
 */
export function useSessionStorage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const sessionDataRef = useRef<SessionStorageData>({});
  const sessionIdRef = useRef<string>('');

  // Initialize session storage
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Check if we have an existing session
        const existingTimestamp = await AsyncStorage.getItem(SESSION_TIMESTAMP_KEY);
        const now = Date.now();

        if (existingTimestamp) {
          const timestamp = parseInt(existingTimestamp, 10);
          const sessionAge = now - timestamp;

          // If session is older than 24 hours, create a new one
          if (sessionAge > 24 * 60 * 60 * 1000) {
            await createNewSession();
          } else {
            // Load existing session data
            await loadExistingSession();
          }
        } else {
          // Create new session
          await createNewSession();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('[SessionStorage] Error initializing session:', error);
        await createNewSession();
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, []);

  const createNewSession = async () => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = sessionId;
    sessionDataRef.current = {};

    // Store session timestamp
    await AsyncStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    console.log('[SessionStorage] Created new session:', sessionId);
  };

  const loadExistingSession = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith(SESSION_PREFIX));

      const sessionData: SessionStorageData = {};
      for (const key of sessionKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const sessionKey = key.replace(SESSION_PREFIX, '');
          sessionData[sessionKey] = JSON.parse(value);
        }
      }

      sessionDataRef.current = sessionData;
      console.log('[SessionStorage] Loaded existing session data:', sessionData);
    } catch (error) {
      console.error('[SessionStorage] Error loading existing session:', error);
      sessionDataRef.current = {};
    }
  };

  const setItem = async (key: string, value: any) => {
    if (!isInitialized) {
      console.warn('[SessionStorage] Session not initialized yet');
      return;
    }

    try {
      sessionDataRef.current[key] = value;
      const storageKey = `${SESSION_PREFIX}${key}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(value));
      console.log('[SessionStorage] Set item:', key, value);
    } catch (error) {
      console.error('[SessionStorage] Error setting item:', error);
    }
  };

  const getItem = async (key: string): Promise<any> => {
    if (!isInitialized) {
      console.warn('[SessionStorage] Session not initialized yet');
      return null;
    }

    try {
      const storageKey = `${SESSION_PREFIX}${key}`;
      const value = await AsyncStorage.getItem(storageKey);
      if (value) {
        const parsedValue = JSON.parse(value);
        sessionDataRef.current[key] = parsedValue;
        return parsedValue;
      }
      return null;
    } catch (error) {
      console.error('[SessionStorage] Error getting item:', error);
      return null;
    }
  };

  const removeItem = async (key: string) => {
    if (!isInitialized) {
      console.warn('[SessionStorage] Session not initialized yet');
      return;
    }

    try {
      delete sessionDataRef.current[key];
      const storageKey = `${SESSION_PREFIX}${key}`;
      await AsyncStorage.removeItem(storageKey);
      console.log('[SessionStorage] Removed item:', key);
    } catch (error) {
      console.error('[SessionStorage] Error removing item:', error);
    }
  };

  const clear = async () => {
    if (!isInitialized) {
      console.warn('[SessionStorage] Session not initialized yet');
      return;
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith(SESSION_PREFIX));
      await AsyncStorage.multiRemove(sessionKeys);
      sessionDataRef.current = {};
      console.log('[SessionStorage] Cleared all session data');
    } catch (error) {
      console.error('[SessionStorage] Error clearing session:', error);
    }
  };

  const getAllKeys = async (): Promise<string[]> => {
    if (!isInitialized) {
      console.warn('[SessionStorage] Session not initialized yet');
      return [];
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith(SESSION_PREFIX));
      return sessionKeys.map(key => key.replace(SESSION_PREFIX, ''));
    } catch (error) {
      console.error('[SessionStorage] Error getting all keys:', error);
      return [];
    }
  };

  return {
    isInitialized,
    setItem,
    getItem,
    removeItem,
    clear,
    getAllKeys,
    sessionData: sessionDataRef.current,
  };
}

/**
 * Clear all session storage data
 */
export async function clearAllSessionStorage() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sessionKeys = keys.filter(key =>
      key.startsWith(SESSION_PREFIX) || key === SESSION_TIMESTAMP_KEY
    );
    await AsyncStorage.multiRemove(sessionKeys);
    console.log('[SessionStorage] Cleared all session storage');
  } catch (error) {
    console.error('[SessionStorage] Error clearing all session storage:', error);
  }
}
