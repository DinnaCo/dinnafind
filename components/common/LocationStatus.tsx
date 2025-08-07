import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { Icon } from '@rneui/themed';
import { useGeolocation } from '@/hooks/useGeolocation';
import { theme } from '@/theme';

interface LocationStatusProps {
  showDetails?: boolean;
  onRetry?: () => void;
}

export function LocationStatus({ showDetails = false, onRetry }: LocationStatusProps) {
  const { coordinates, loading, error, permissionGranted, requestLocation } = useGeolocation();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      requestLocation();
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const showLocationHelp = () => {
    Alert.alert(
      'Location Services Help',
      'To use location features:\n\n' +
        '1. Enable Location Services in device Settings\n' +
        '2. Grant "Always" permission to DinnaFind\n' +
        '3. For iOS Simulator: Features > Location > Apple\n\n' +
        'Location is used for:\n' +
        '• Finding nearby restaurants\n' +
        '• Geofencing notifications\n' +
        '• Distance calculations',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Icon name="location-searching" size={16} color={theme.colors.primary} />
        <Text style={styles.text}>Getting location...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Icon name="location-off" size={16} color={theme.colors.error} />
        <Text style={styles.text}>Location unavailable</Text>
        {showDetails && (
          <View style={styles.details}>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.button} onPress={handleRetry}>
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={showLocationHelp}>
                <Text style={styles.buttonText}>Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (!permissionGranted) {
    return (
      <View style={styles.container}>
        <Icon name="location-off" size={16} color={theme.colors.warning} />
        <Text style={styles.text}>Location permission needed</Text>
        {showDetails && (
          <View style={styles.details}>
            <TouchableOpacity style={styles.button} onPress={handleRetry}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  if (coordinates) {
    return (
      <View style={styles.container}>
        <Icon name="location-on" size={16} color={theme.colors.success} />
        <Text style={styles.text}>Location available</Text>
        {showDetails && (
          <Text style={styles.coordinates}>
            {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon name="location-searching" size={16} color={theme.colors.grey3} />
      <Text style={styles.text}>Location not set</Text>
      {showDetails && (
        <TouchableOpacity style={styles.button} onPress={handleRetry}>
          <Text style={styles.buttonText}>Get Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.grey6,
    borderRadius: 8,
    marginVertical: 4,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.grey2,
  },
  details: {
    marginTop: 8,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 12,
    color: theme.colors.grey3,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
