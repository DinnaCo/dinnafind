import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetProcessedUrls, clearPendingDeepLink } from '@/hooks/useDeepLinkOnce';

/**
 * Test component for deep link functionality
 * Add this to your app for testing, then remove in production
 */
export function DeepLinkTester() {
  const [status, setStatus] = React.useState<string[]>([]);
  const [pendingLink, setPendingLink] = React.useState<string | null>(null);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkPendingLink = async () => {
    try {
      const link = await AsyncStorage.getItem('dinnafind_pending_deep_link');
      setPendingLink(link);
      addStatus(link ? `Found pending: ${link}` : 'No pending link');
    } catch (error) {
      addStatus(`Error checking: ${error}`);
    }
  };

  const testLinks = [
    { label: 'Restaurant Link', url: 'dinnafind://restaurant/574074c1498ec610c4e112d0' },
    { label: 'Restaurant with AutoSave', url: 'dinnafind://restaurant/574074c1498ec610c4e112d0?autoSave=true' },
    { label: 'Bucket List', url: 'dinnafind://bucket-list' },
    { label: 'Auth Callback', url: 'dinnafind://auth-callback' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Deep Link Tester</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Links:</Text>
        {testLinks.map((link, index) => (
          <Button
            key={index}
            title={link.label}
            onPress={() => {
              Linking.openURL(link.url);
              addStatus(`Opened: ${link.url}`);
            }}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utilities:</Text>
        <Button
          title="Check Pending Link"
          onPress={checkPendingLink}
        />
        <Button
          title="Clear Pending Link"
          onPress={async () => {
            await clearPendingDeepLink();
            addStatus('Cleared pending link');
            checkPendingLink();
          }}
        />
        <Button
          title="Reset Processed URLs (Session)"
          onPress={() => {
            resetProcessedUrls();
            addStatus('Reset processed URLs for this session');
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Link:</Text>
        <Text>{pendingLink || 'None'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Log:</Text>
        {status.map((msg, index) => (
          <Text key={index} style={styles.logEntry}>{msg}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 5,
    color: '#666',
  },
});