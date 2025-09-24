import type React from 'react';
import { useEffect, useState } from 'react';

import { Linking, ScrollView, StyleSheet, Text, View, AppState } from 'react-native';

import { Button, Icon } from '@rneui/themed';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';
import { logger } from '@/utils/logger';

interface LocationPermissionRequestProps {
  onRequestLocation: () => void;
  showButtons?: boolean;
}

/**
 * Location Permission Request Component
 * - Explains why the app needs location access
 * - Provides options to grant permission or open settings
 * - Fully accessible with clear instructions
 */
export const LocationPermissionRequest: React.FC<
  LocationPermissionRequestProps
> = ({ onRequestLocation, showButtons = true }) => {
  const colors = useThemeColors();
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  // Check permission status
  const checkPermissionStatus = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      // If permission is already granted, call onRequestLocation
      if (status === 'granted') {
        onRequestLocation();
      }
    } catch (error) {
      logger.error('Error checking permission status:', error);
    }
  };

  useEffect(() => {
    // Check on mount
    checkPermissionStatus();

    // Re-check when app comes to foreground (after user grants permission in settings)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissionStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onRequestLocation]);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        onRequestLocation();
      }
    } catch (error) {
      logger.error('Error requesting permission:', error);
    }
  };

  // Open app settings
  const openSettings = () => {
    Linking.openSettings();
  };

  const isDenied = permissionStatus === Location.PermissionStatus.DENIED;

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Icon
            color={colors.primary}
            containerStyle={styles.icon}
            name={isDenied ? 'location-off' : 'location-on'}
            size={80}
            type="material"
          />
        </View>

        <Text style={styles.title}>
          {isDenied ? 'Location Permission Denied' : 'Location Access Needed'}
        </Text>

        <Text style={styles.description}>
          {isDenied
            ? 'Access to your location was denied. To find restaurants near you, please enable location access in your device settings.'
            : 'Restaurant Bucket List needs access to your location to find restaurants near you. We use this information only to show you relevant results and never track or store your location data.'}
        </Text>

        {!isDenied && (
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Icon
                color={colors.primary}
                name="place"
                size={24}
                type="material"
              />
              <Text style={styles.benefitText}>Discover nearby restaurants</Text>
            </View>

            <View style={styles.benefitItem}>
              <Icon
                color={colors.primary}
                name="star"
                size={24}
                type="material"
              />
              <Text style={styles.benefitText}>
                Get personalized recommendations
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Icon
                color={colors.primary}
                name="directions"
                size={24}
                type="material"
              />
              <Text style={styles.benefitText}>
                See distances and get directions
              </Text>
            </View>
          </View>
        )}

        {showButtons && (
          <View style={styles.buttonsContainer}>
            {!isDenied && (
              <Button
                accessible
                accessibilityLabel="Allow location access"
                accessibilityRole="button"
                buttonStyle={styles.primaryButton}
                icon={{
                  name: 'location-on',
                  type: 'material',
                  size: 20,
                  color: 'white',
                }}
                iconContainerStyle={styles.buttonIcon}
                iconRight={false}
                testID="allow-location-button"
                title="Allow Location Access"
                titleStyle={styles.buttonTitle}
                onPress={requestLocationPermission}
              />
            )}

            <Button
              accessible
              accessibilityLabel="Open app settings"
              accessibilityRole="button"
              buttonStyle={isDenied ? styles.primaryButton : styles.secondaryButton}
              icon={{
                name: 'settings',
                type: 'material',
                size: 20,
                color: isDenied ? 'white' : colors.primary,
              }}
              iconContainerStyle={styles.buttonIcon}
              iconRight={false}
              testID="open-settings-button"
              title="Open Settings"
              titleStyle={
                isDenied ? styles.buttonTitle : styles.secondaryButtonTitle
              }
              type={isDenied ? 'solid' : 'outline'}
              onPress={openSettings}
            />

            {!isDenied && (
              <Text style={styles.privacyNote}>
                You can change this permission later in your device settings.
              </Text>
            )}
          </View>
        )}

        {!showButtons && (
          <Text style={styles.onboardingNote}>
            Location permissions can be granted in your device settings or during onboarding.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      alignItems: 'center',
      padding: 24,
      justifyContent: 'center',
    },
    iconContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.grey5,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    icon: {
      marginBottom: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
      color: colors.grey1,
    },
    description: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 32,
      color: colors.grey2,
      lineHeight: 24,
    },
    benefitsContainer: {
      width: '100%',
      marginBottom: 32,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    benefitText: {
      fontSize: 16,
      marginLeft: 12,
      color: colors.grey2,
    },
    buttonsContainer: {
      width: '100%',
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      width: '100%',
      marginBottom: 16,
    },
    buttonTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
    },
    secondaryButton: {
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      width: '100%',
      marginBottom: 20,
    },
    secondaryButtonTitle: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonIcon: {
      marginRight: 8,
    },
    privacyNote: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.grey3,
      marginTop: 8,
    },
    onboardingNote: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.grey3,
      marginTop: 24,
      lineHeight: 20,
    },
  });
