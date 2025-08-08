import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAllDeepLinkStorage,
  isInitialUrlProcessed,
  resetInitialUrlProcessing,
} from '@/hooks/useDeferredDeepLink';

// Quick debug component to add to any screen
export function DeepLinkDebugger() {
  const [storedLink, setStoredLink] = useState<string | null>(null);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);
  const [initialUrlProcessed, setInitialUrlProcessed] = useState<boolean | null>(null);

  const checkStorage = async () => {
    try {
      const keys = [
        'dinnafind_deferred_deeplink',
        'dinnafind_pending_deep_link',
        'dinnafind_simple_deferred_link',
        'dinnafind_initial_url_processed',
      ];

      const results = await Promise.all(
        keys.map(async key => {
          const stored = await AsyncStorage.getItem(key);
          return { key, stored };
        })
      );

      const foundLinks = results.filter(result => result.stored);

      // Check initial URL processing status
      const isInitialProcessed = await isInitialUrlProcessed();
      setInitialUrlProcessed(isInitialProcessed);

      if (foundLinks.length > 0) {
        const linkInfo = foundLinks
          .map(({ key, stored }) => {
            const parsed = JSON.parse(stored!);
            const age = Date.now() - parsed.timestamp;
            const ageMinutes = Math.floor(age / 60000);
            return `${key}: ${parsed.url} (${ageMinutes}m ago, processed: ${parsed.processed})`;
          })
          .join('\n');

        Alert.alert(
          'Stored Deep Links',
          `Initial URL Processed: ${isInitialProcessed}\n\n${linkInfo}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Stored Links',
          `No deep links found in storage.\nInitial URL Processed: ${isInitialProcessed}`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check storage');
    }
  };

  const clearStorage = async () => {
    try {
      await clearAllDeepLinkStorage();
      await resetInitialUrlProcessing();
      setStoredLink(null);
      setInitialUrlProcessed(false);
      Alert.alert('Cleared', 'All deep link storage cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  if (!__DEV__) return null;

  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugTitle}>🔗 Deep Link Debug</Text>
      <View style={styles.debugButtons}>
        <Button title="Check Storage" onPress={checkStorage} />
        <Button title="Clear All Storage" onPress={clearStorage} color="red" />
      </View>
      {storedLink && <Text style={styles.debugInfo}>Link stored</Text>}
      {initialUrlProcessed !== null && (
        <Text style={styles.debugInfo}>
          Initial URL Processed: {initialUrlProcessed ? 'Yes' : 'No'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    bottom: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    minWidth: 150,
  },
  debugTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugButtons: {
    gap: 5,
  },
  debugInfo: {
    color: 'white',
    fontSize: 10,
    marginTop: 5,
  },
});
