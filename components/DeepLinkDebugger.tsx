import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Quick debug component to add to any screen
export function DeepLinkDebugger() {
  const [storedLink, setStoredLink] = useState<string | null>(null);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);

  const checkStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem('dinnafind_deferred_deeplink');
      setStoredLink(stored);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const age = Date.now() - parsed.timestamp;
        const ageMinutes = Math.floor(age / 60000);
        
        Alert.alert(
          'Stored Deep Link',
          `URL: ${parsed.url}\nAge: ${ageMinutes} minutes\nProcessed: ${parsed.processed}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Stored Link', 'No deferred deep link found');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check storage');
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem('dinnafind_deferred_deeplink');
      setStoredLink(null);
      Alert.alert('Cleared', 'Deferred link storage cleared');
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
        <Button title="Clear Storage" onPress={clearStorage} color="red" />
      </View>
      {storedLink && (
        <Text style={styles.debugInfo}>Link stored</Text>
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
