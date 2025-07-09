import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { simulateDeferredDeepLink } from '@/hooks/useDeferredDeepLink';
import {
  generateVenueDeepLink,
  generateVenueSaveDeepLink,
  generateVenueViewDeepLink,
} from '@/utils/deepLinkUtils';

export default function TestVenueDeepLinksScreen() {
  const [venueId, setVenueId] = useState('4b0c8c70f964a520c8a523e3'); // Example venue ID
  const [customVenueId, setCustomVenueId] = useState('');

  const testVenueId = customVenueId || venueId;

  const testDeepLinks = async () => {
    try {
      // Test 1: Regular venue view link
      const viewLink = generateVenueViewDeepLink(testVenueId);
      console.log('Testing view link:', viewLink);
      await simulateDeferredDeepLink(viewLink);
      Alert.alert('View Link Stored', `Stored: ${viewLink}`);

      // Wait a bit before testing the next link
      setTimeout(async () => {
        // Test 2: Auto-save venue link
        const saveLink = generateVenueSaveDeepLink(testVenueId);
        console.log('Testing save link:', saveLink);
        await simulateDeferredDeepLink(saveLink);
        Alert.alert('Save Link Stored', `Stored: ${saveLink}`);
      }, 1000);
    } catch (error) {
      console.error('Error testing deep links:', error);
      Alert.alert('Error', 'Failed to test deep links');
    }
  };

  const testImmediateDeepLink = async (autoSave: boolean) => {
    try {
      const link = generateVenueDeepLink(testVenueId, autoSave);
      console.log('Testing immediate link:', link);

      // Simulate the deep link
      await simulateDeferredDeepLink(link);

      Alert.alert(
        'Deep Link Stored',
        `Stored: ${link}\n\nThis will be processed when you restart the app or navigate back to the main screen.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error testing immediate deep link:', error);
      Alert.alert('Error', 'Failed to test deep link');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Test Venue Deep Links</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Venue ID</Text>
        <TextInput
          style={styles.input}
          value={customVenueId}
          onChangeText={setCustomVenueId}
          placeholder="Enter venue ID (optional)"
          placeholderTextColor="#999"
        />
        <Text style={styles.venueIdText}>Using: {testVenueId}</Text>

        <Text style={styles.sectionTitle}>Generate Deep Links</Text>

        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>View Link (no auto-save):</Text>
          <Text style={styles.linkText}>{generateVenueViewDeepLink(testVenueId)}</Text>
        </View>

        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>Save Link (auto-save):</Text>
          <Text style={styles.linkText}>{generateVenueSaveDeepLink(testVenueId)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Test Deep Links</Text>

        <TouchableOpacity style={styles.testButton} onPress={() => testImmediateDeepLink(false)}>
          <Ionicons name="eye-outline" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Test View Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={() => testImmediateDeepLink(true)}>
          <Ionicons name="bookmark-outline" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Test Save Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testDeepLinks}>
          <Ionicons name="play-outline" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Test Both Links</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Generate a deep link with venue ID and optional save parameter{'\n'}
            2. Store the link using deferred deep link mechanism{'\n'}
            3. When app opens, it processes the stored link{'\n'}
            4. Navigates to venue detail screen{'\n'}
            5. If save=true, automatically saves the venue to bucket list
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>URL Format:</Text>
          <Text style={styles.infoText}>
            dinnafind://restaurant/{'{venueId}'}?save=true{'\n'}
            dinnafind://restaurant/{'{venueId}'} (no auto-save)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  venueIdText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  linkContainer: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  linkText: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
