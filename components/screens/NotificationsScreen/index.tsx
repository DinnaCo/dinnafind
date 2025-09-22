import { Icon, Slider } from '@rneui/themed';
import { logger } from '@/utils/logger';
import React, { useEffect, useRef, useState } from 'react';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  checkAllPermissions,
  requestRequiredPermissions,
  requestMissingPermissions,
} from '@/services/PermissionsService';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import GeofencingService from '@/services/GeofencingService';
// Centralized permission handling; do not import locationHelpers here
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectMasterNotificationsEnabled,
  setMasterNotificationsEnabled,
  selectDistanceMiles,
  setDistanceMiles,
} from '@/store/slices/uiSlice';
import { setNotificationEnabled, setNotificationDistance } from '@/store/slices/bucketListSlice';
import { BucketListItem } from '@/models/bucket-list';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { usePermissions } from '@/hooks/usePermissions';

export function NotificationsScreen() {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const bucketListItems = useAppSelector((state) => state.bucketList.items);
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);
  const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false);

  // Helper function to get coordinates from venue data
  const getCoordinates = (restaurant: BucketListItem): { latitude: number; longitude: number } | null => {
    // Try geocodes format first
    if (restaurant.venue?.geocodes?.main?.latitude && restaurant.venue?.geocodes?.main?.longitude) {
      return {
        latitude: restaurant.venue.geocodes.main.latitude,
        longitude: restaurant.venue.geocodes.main.longitude,
      };
    }
    // Fall back to location format
    if (restaurant.venue?.location?.lat && restaurant.venue?.location?.lng) {
      return {
        latitude: restaurant.venue.location.lat,
        longitude: restaurant.venue.location.lng,
      };
    }
    return null;
  };
  // Convert decimal miles to integer slider value (multiply by 100 to preserve 2 decimal places)
  const [sliderValue, setSliderValue] = useState<number>(
    Math.round((distanceMiles || 1.25) * 100),
  );
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const isUpdatingRef = useRef(false);
  // Track individual restaurant slider values
  const [restaurantSliderValues, setRestaurantSliderValues] = useState<Record<string, number>>({});

  const {
    permissions,
    isLoading: permissionsLoading,
    checkAllPermissions,
    requestPermissions,
    refreshPermissions,
  } = usePermissions(true, false); // Check on mount, no auto-refresh

  // Check permissions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkAllPermissions();
    }, [checkAllPermissions]),
  );

  // NOTE: Permissions are now requested during onboarding (after signup/signin)
  // This tab only requests permissions when user explicitly enables the master toggle

  useEffect(() => {
    setSliderValue(Math.round((distanceMiles || 1.25) * 100));
  }, [distanceMiles]);

  // Check permissions when master toggle changes
  useEffect(() => {
    if (masterEnabled) {
      checkAllPermissions();
    }
  }, [checkAllPermissions, masterEnabled]);

  const handleMasterToggle = async (value: boolean) => {
    if (value) {
      setIsRequestingPermissions(true);
      logger.info(
        '[NotificationsScreen] Requesting permissions for location alerts...',
      );

      try {
        const granted = await requestRequiredPermissions();
        if (!granted) {
          logger.info(
            '[NotificationsScreen] Required permissions not granted, keeping master toggle off',
          );
          // Don't update the master toggle if permissions weren't granted
          return;
        }
        logger.info(
          '[NotificationsScreen] All permissions granted, enabling master toggle',
        );
        await checkAllPermissions();
      } finally {
        setIsRequestingPermissions(false);
      }
    }

    dispatch(setMasterNotificationsEnabled(value));

    if (value) {
      // Master ON: enable all geofences with individual distances
      logger.info('[NotificationsScreen] Setting up geofences for all restaurants...');
      // Clear all existing geofences first
      await GeofencingService.clearAllGeofences();
      for (const restaurant of bucketListItems as BucketListItem[]) {
        const coords = getCoordinates(restaurant);
        if (coords) {
          // Use individual notification distance if set, otherwise fall back to global distance
          const alertRadius = (restaurant.notificationDistance ?? distanceMiles ?? 1.25) * 1609.34;
          await GeofencingService.addGeofence({
            id: restaurant.id,
            name: restaurant.venue.name,
            latitude: coords.latitude,
            longitude: coords.longitude,
            radius: alertRadius,
            venueId: restaurant.venue.id,
          });
          logger.info(
            `[NotificationsScreen] Added geofence for: ${restaurant.venue.name} with radius ${((alertRadius / 1609.34)).toFixed(2)} miles`,
          );
        }
      }
    } else {
      // Master OFF: Revert to individual settings
      logger.info(
        '[NotificationsScreen] Clearing all geofences and reverting to individual settings...',
      );
      await GeofencingService.clearAllGeofences();
      for (const restaurant of bucketListItems as BucketListItem[]) {
        if (restaurant.notificationsEnabled) {
          const coords = getCoordinates(restaurant);
          if (coords) {
            // Use individual alert distance if set, otherwise fall back to global distance
            const alertRadius = (restaurant.alertDistance ?? distanceMiles ?? 1.25) * 1609.34;
            await GeofencingService.addGeofence({
              id: restaurant.id,
              name: restaurant.venue.name,
              latitude: coords.latitude,
              longitude: coords.longitude,
              radius: alertRadius,
              venueId: restaurant.venue.id,
            });
            logger.info(
              `[NotificationsScreen] Re-added geofence for: ${restaurant.venue.name} with radius ${((alertRadius / 1609.34)).toFixed(2)} miles`,
            );
          }
        }
      }
    }
  };

  const restaurantsWithLocation = bucketListItems.filter(
    (item: BucketListItem) => {
      // Check for valid geocodes or location coordinates
      const hasGeocodesLocation =
        item.venue?.geocodes?.main?.latitude !== undefined &&
        item.venue?.geocodes?.main?.longitude !== undefined;

      const hasLocationCoords =
        item.venue?.location?.lat !== undefined &&
        item.venue?.location?.lng !== undefined;

      return hasGeocodesLocation || hasLocationCoords;
    },
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Location Notifications</Text>
        <Text style={styles.headerSubtitle}>
          Get notified when you&apos;re near saved restaurants
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Toggle */}
        <View style={styles.masterToggleCard}>
          <View style={styles.masterToggleContent}>
            <Icon
              name="notifications"
              type="material"
              size={24}
              color={masterEnabled ? colors.primary : colors.grey3}
            />
            <View style={styles.masterToggleText}>
              <Text style={styles.masterToggleTitle}>Enable All Notifications</Text>
              <Text style={styles.masterToggleSubtitle}>
                {isRequestingPermissions
                  ? 'Requesting permissions...'
                  : 'Master switch for all notifications'}
              </Text>
            </View>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={handleMasterToggle}
            disabled={isRequestingPermissions}
            trackColor={{
              false: colors.grey4,
              true: colors.primary,
            }}
            thumbColor={
              Platform.OS === 'android' ? colors.grey5 : undefined
            }
            accessibilityLabel="Enable all location notifications"
            accessibilityRole="switch"
            accessibilityState={{ checked: masterEnabled, disabled: isRequestingPermissions }}
            accessibilityHint="Turns on notifications for all saved restaurants"
          />
        </View>
        {/* Distance Slider */}
        <View style={[styles.sliderCard, !masterEnabled && styles.sliderCardDisabled]}>
          <Text style={[styles.sliderLabel, !masterEnabled && styles.sliderLabelDisabled]}>
            Distance: {((sliderValue || 125) / 100).toFixed(2)} miles
          </Text>
          <Slider
            value={sliderValue || 125}
            disabled={!masterEnabled} // Disable when master is off
            onValueChange={(val) => {
              setSliderValue(Math.round(val));
            }}
            onSlidingComplete={async (val) => {
              // Convert integer slider value back to decimal miles
              const milesValue = val / 100;

              // Prevent redundant updates
              if (
                Number(milesValue.toFixed(2)) ===
                Number((distanceMiles || 1.25).toFixed(2))
              ) {
                return;
              }

              // Persist to store
              dispatch(setDistanceMiles(milesValue));

              // Update geofences once per commit when master is enabled
              // Note: This global slider now serves as the default for restaurants without individual distances
              if (masterEnabled) {
                if (isUpdatingRef.current) return;
                isUpdatingRef.current = true;
                try {
                  await GeofencingService.clearAllGeofences();
                  for (const restaurant of bucketListItems as BucketListItem[]) {
                    if (restaurant.notificationsEnabled) {
                      const coords = getCoordinates(restaurant);
                      if (coords) {
                        // Use individual notification distance if set, otherwise use the new global distance
                        const alertRadius = (restaurant.notificationDistance ?? milesValue) * 1609.34;
                        await GeofencingService.addGeofence({
                          id: restaurant.id,
                          name: restaurant.venue.name,
                          latitude: coords.latitude,
                          longitude: coords.longitude,
                          radius: alertRadius,
                          venueId: restaurant.venue.id,
                        });
                      }
                    }
                  }
                  logger.info(
                    `[NotificationsScreen] Updated default geofence radius to ${milesValue.toFixed(2)} miles (restaurants with individual distances unchanged)`,
                  );
                } finally {
                  isUpdatingRef.current = false;
                }
              }
            }}
            minimumValue={10}
            maximumValue={1000}
            step={5}
            thumbStyle={{
              height: 24,
              width: 24,
            }}
            trackStyle={{ height: 6 }}
            style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}
            minimumTrackTintColor={masterEnabled ? colors.primary : colors.grey4}
            maximumTrackTintColor={colors.grey4}
            accessibilityLabel="Distance"
            accessibilityRole="adjustable"
            accessibilityValue={{ text: `${((sliderValue || 125) / 100).toFixed(2)} miles` }}
            accessibilityHint="Swipe up to increase, down to decrease distance"
          />
        </View>

        {bucketListItems.length === 0 && (
          <View style={styles.emptyStateCard}>
            <Icon
              name="location-off"
              type="material"
              size={48}
              color={colors.grey3}
            />
            <Text style={styles.emptyStateTitle}>No Restaurants to Track</Text>
            <Text style={styles.emptyStateText}>
              Add restaurants to your bucket list to enable location notifications
            </Text>
          </View>
        )}

        <View style={styles.permissionsContainer}>
          <TouchableOpacity
            style={styles.permissionHeader}
            onPress={() => {
              const newExpanded = !isPermissionsExpanded;
              setIsPermissionsExpanded(newExpanded);

              // Refresh permissions when expanding

              checkAllPermissions();
            }}
            accessibilityRole="button"
            accessibilityLabel="View permissions details"
            accessibilityHint="Double tap to expand or collapse"
            accessibilityState={{ expanded: isPermissionsExpanded }}
          >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon
                  name="shield-check"
                  type="material-community"
                  size={24}
                  color={colors.grey1}
                />
                <Text style={styles.permissionTitle}>Permissions</Text>
              </View>
              <Icon
                name={isPermissionsExpanded ? 'chevron-up' : 'chevron-down'}
                type="material-community"
                size={24}
                color={colors.grey1}
              />
            </TouchableOpacity>
            {isPermissionsExpanded && (
              <>
                <Text style={styles.permissionDescription}>
                  Location notifications require foreground and background permissions
                  to notify you when you&apos;re near a saved restaurant, even
                  when the app is closed.
                </Text>

                {!masterEnabled && (
                  <Text style={styles.permissionNote}>
                    💡 Permissions will be requested automatically when you
                    enable the master toggle above.
                  </Text>
                )}

                <View style={styles.permissionStatusCard}>
                  {/* Location Permission */}
                  <View
                    style={[
                      styles.permissionItem,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.grey4,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        permissions.location.foreground
                          ? 'check-circle'
                          : 'alert-circle'
                      }
                      type="material-community"
                      size={24}
                      color={
                        permissions.location.foreground
                          ? colors.success
                          : colors.error
                      }
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionText}>Location</Text>
                      <Text style={styles.permissionStatusText}>
                        {permissions.location.foreground ? 'Granted' : 'Denied'}
                      </Text>
                      {!permissions.location.foreground && (
                        <Text style={styles.permissionHelpText}>
                          Tap &apos;Enable Permission&apos; to allow location
                          access.
                        </Text>
                      )}
                    </View>
                    {!permissions.location.foreground && (
                      <TouchableOpacity
                        style={styles.fixButton}
                        onPress={async () => {
                          try {
                            const result =
                              await Location.requestForegroundPermissionsAsync();
                            if (result.status === 'granted') {
                              // Refresh permissions after successful request
                              setTimeout(() => refreshPermissions(), 1000);
                            }
                          } catch (error) {
                            logger.error(
                              '[NotificationsScreen] Error requesting foreground location:',
                              error,
                            );
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Enable location permission"
                        accessibilityHint="Double tap to request location access"
                      >
                        <Text style={styles.fixButtonText}>
                          Enable Permission
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Background Location Permission */}
                  <View
                    style={[
                      styles.permissionItem,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.grey4,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        permissions.location.background
                          ? 'check-circle'
                          : 'alert-circle'
                      }
                      type="material-community"
                      size={24}
                      color={
                        permissions.location.background
                          ? colors.success
                          : colors.error
                      }
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionText}>
                        Background Location
                      </Text>
                      <Text style={styles.permissionStatusText}>
                        {permissions.location.background
                          ? 'Set to "Always"'
                          : 'Not set to "Always"'}
                      </Text>
                      {!permissions.location.background && (
                        <Text style={styles.permissionHelpText}>
                          Required for notifications when app is closed. Tap
                          &apos;Enable Permission&apos; to set to
                          &apos;Always&apos;.
                        </Text>
                      )}
                    </View>
                    {!permissions.location.background && (
                      <TouchableOpacity
                        style={styles.fixButton}
                        onPress={async () => {
                          try {
                            // First ensure foreground location is granted
                            if (!permissions.location.foreground) {
                              const fgResult =
                                await Location.requestForegroundPermissionsAsync();
                              if (fgResult.status !== 'granted') {
                                return; // Can't request background without foreground
                              }
                            }

                            // Request background location permissions
                            const result =
                              await Location.requestBackgroundPermissionsAsync();
                            if (result.status === 'granted') {
                              // Refresh permissions after successful request
                              setTimeout(() => refreshPermissions(), 1000);
                            }
                          } catch (error) {
                            logger.error(
                              '[NotificationsScreen] Error requesting background location:',
                              error,
                            );
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Enable background location permission"
                        accessibilityHint="Double tap to set location access to Always"
                      >
                        <Text style={styles.fixButtonText}>
                          Enable Permission
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Notifications Permission */}
                  <View
                    style={[styles.permissionItem, { borderBottomWidth: 0 }]}
                  >
                    <Icon
                      name={
                        permissions.notifications.granted
                          ? 'check-circle'
                          : 'alert-circle'
                      }
                      type="material-community"
                      size={24}
                      color={
                        permissions.notifications.granted
                          ? colors.success
                          : colors.error
                      }
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionText}>Notifications</Text>
                      <Text style={styles.permissionStatusText}>
                        {permissions.notifications.granted
                          ? 'Enabled'
                          : 'Disabled'}
                      </Text>
                      {!permissions.notifications.granted && (
                        <Text style={styles.permissionHelpText}>
                          Tap &apos;Enable Permission&apos; to enable
                          notifications.
                        </Text>
                      )}
                    </View>
                    {!permissions.notifications.granted && (
                      <TouchableOpacity
                        style={styles.fixButton}
                        onPress={async () => {
                          try {
                            const result =
                              await Notifications.requestPermissionsAsync();
                            if (result.status === 'granted') {
                              // Refresh permissions after successful request
                              setTimeout(() => refreshPermissions(), 1000);
                            }
                          } catch (error) {
                            logger.error(
                              '[NotificationsScreen] Error requesting notifications:',
                              error,
                            );
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Enable notification permission"
                        accessibilityHint="Double tap to enable push notifications"
                      >
                        <Text style={styles.fixButtonText}>
                          Enable Permission
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            )}
        </View>

        {/* Restaurant List */}
        {bucketListItems.length > 0 && !masterEnabled && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Saved Restaurants</Text>

            <View style={styles.restaurantList}>
              {restaurantsWithLocation.map((restaurant: BucketListItem) => {
                // Defensive: ensure id and venue fields are present and valid

                // Defensive: ensure name, address, category are strings (fallback to empty string if not)
                const name =
                  typeof restaurant.venue.name === 'string'
                    ? restaurant.venue.name
                    : '';
                const address =
                  typeof restaurant.venue.address === 'string'
                    ? restaurant.venue.address
                    : '';
                const category =
                  typeof restaurant.venue.category === 'string'
                    ? restaurant.venue.category
                    : '';

                // Use the actual notificationsEnabled state from the bucket list item
                const isNotificationEnabled =
                  restaurant.notificationsEnabled === true;

                // Get individual notification distance or fall back to global distance
                const restaurantDistance = restaurant.notificationDistance ?? distanceMiles ?? 1.25;
                const restaurantId = restaurant.id as string;
                const currentSliderValue = restaurantSliderValues[restaurantId] ?? Math.round(restaurantDistance * 100);

                return (
                  <View key={restaurant.id} style={[styles.restaurantCard]}>
                    <View style={styles.restaurantCardHeader}>
                      <View style={styles.restaurantInfo}>
                        <Text style={[styles.restaurantName]}>{name}</Text>
                        <Text
                          style={[
                            styles.restaurantAddress,
                            masterEnabled && { color: colors.grey4 }, // Mute text when master is enabled
                          ]}
                          numberOfLines={1}
                        >
                          {address}
                        </Text>
                        {category ? (
                          <Text
                            style={[
                              styles.restaurantCategory,
                              masterEnabled && { color: colors.grey4 }, // Mute text when master is enabled
                            ]}
                          >
                            {category}
                          </Text>
                        ) : null}
                      </View>
                      <Switch
                        value={isNotificationEnabled}
                        disabled={masterEnabled} // Individual toggles are disabled when master is ON
                        onValueChange={async (enabled) => {
                          dispatch(
                            setNotificationEnabled({
                              id: restaurant.id as string,
                              enabled,
                            }),
                          );

                          // Geofence is only managed here when master is OFF
                          if (!masterEnabled) {
                            if (enabled) {
                              const coords = getCoordinates(restaurant);
                              if (coords) {
                                await GeofencingService.addGeofence({
                                  id: restaurant.id as string,
                                  name,
                                  latitude: coords.latitude,
                                  longitude: coords.longitude,
                                  radius: restaurantDistance * 1609.34,
                                });
                                logger.info(
                                  `[NotificationsScreen] Enabled geofence for: ${name}`,
                                );
                              }
                            } else {
                              await GeofencingService.removeGeofence(
                                restaurant.id as string,
                              );
                              logger.info(
                                `[NotificationsScreen] Disabled geofence for: ${name}`,
                              );
                            }
                          }
                        }}
                        trackColor={{
                          false: masterEnabled
                            ? colors.grey4
                            : colors.grey4,
                          true: masterEnabled
                            ? colors.grey3
                            : colors.primary,
                        }}
                        thumbColor={
                          Platform.OS === 'android'
                            ? colors.grey5
                            : undefined
                        }
                        accessibilityLabel={`Enable notifications for ${name}`}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: isNotificationEnabled, disabled: masterEnabled }}
                        accessibilityHint={masterEnabled ? "Disabled while master toggle is on" : "Turns on location notifications for this restaurant"}
                      />
                    </View>
                    {/* Individual Distance Slider - only show when notifications are enabled */}
                    {isNotificationEnabled && !masterEnabled && (
                      <View style={styles.restaurantSliderContainer}>
                        <Text style={styles.restaurantSliderLabel}>
                          Distance: {(currentSliderValue / 100).toFixed(2)} miles
                        </Text>
                        <Slider
                          value={currentSliderValue}
                          onValueChange={(val) => {
                            setRestaurantSliderValues(prev => ({
                              ...prev,
                              [restaurantId]: Math.round(val),
                            }));
                          }}
                          onSlidingComplete={async (val) => {
                            const milesValue = val / 100;

                            // Prevent redundant updates
                            if (
                              Number(milesValue.toFixed(2)) ===
                              Number(restaurantDistance.toFixed(2))
                            ) {
                              return;
                            }

                            // Update Redux state
                            dispatch(
                              setNotificationDistance({
                                id: restaurantId,
                                distance: milesValue,
                              })
                            );

                            // Update geofence with new radius
                            const coords = getCoordinates(restaurant);
                            if (coords) {
                              await GeofencingService.removeGeofence(restaurantId);
                              await GeofencingService.addGeofence({
                                id: restaurantId,
                                name,
                                latitude: coords.latitude,
                                longitude: coords.longitude,
                                radius: milesValue * 1609.34,
                              });
                              logger.info(
                                `[NotificationsScreen] Updated geofence radius for ${name} to ${milesValue.toFixed(2)} miles`
                              );
                            }
                          }}
                          minimumValue={10}
                          maximumValue={1000}
                          step={5}
                          thumbStyle={{
                            height: 20,
                            width: 20,
                          }}
                          trackStyle={{ height: 4 }}
                          style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}
                          minimumTrackTintColor={colors.primary}
                          maximumTrackTintColor={colors.grey4}
                          accessibilityLabel={`Distance for ${name}`}
                          accessibilityRole="adjustable"
                          accessibilityValue={{ text: `${(currentSliderValue / 100).toFixed(2)} miles` }}
                          accessibilityHint="Swipe up to increase, down to decrease distance"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Location Notifications Work</Text>
          <View style={styles.infoItem}>
            <Icon
              name="location-on"
              type="material"
              size={20}
              color={colors.grey2}
            />
            <Text style={styles.infoText}>
              Enable notifications for restaurants you want to visit
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon
              name="notifications-active"
              type="material"
              size={20}
              color={colors.grey2}
            />
            <Text style={styles.infoText}>
              {`Get notified when you're within ${distanceMiles?.toFixed(2)} miles`}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon
              name="battery-charging-full"
              type="material"
              size={20}
              color={colors.grey2}
            />
            <Text style={styles.infoText}>
              Works efficiently in the background
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon
              name="privacy-tip"
              type="material"
              size={20}
              color={colors.grey2}
            />
            <Text style={styles.infoText}>
              Your location data stays on your device
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey5,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.grey2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  masterToggleCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    ...(colors.isDark ? {} : Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    })),
  },
  masterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  masterToggleSubtitle: {
    fontSize: 14,
    color: colors.grey2,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 12,
    fontSize: 14,
    color: colors.primary,
  },
  emptyStateCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.grey2,
    textAlign: 'center',
    lineHeight: 20,
  },

  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  restaurantList: {
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    ...(colors.isDark ? {} : Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    })),
  },
  restaurantCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantSliderContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grey4,
    width: '100%',
  },
  restaurantSliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grey1,
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: colors.grey2,
  },
  restaurantCategory: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.grey1,
    marginLeft: 12,
    flex: 1,
  },
  debugCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 14,
    color: colors.grey2,
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  sliderCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    ...(colors.isDark ? {} : Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    })),
  },
  sliderCardDisabled: {
    opacity: 0.5,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sliderLabelDisabled: {
    color: colors.grey3,
  },
  permissionsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...(colors.isDark ? {} : Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    })),
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 10,
  },
  permissionDescription: {
    fontSize: 14,
    color: colors.grey2,
    lineHeight: 20,
    marginBottom: 16,
  },
  permissionNote: {
    fontSize: 14,
    color: colors.grey3,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionStatusCard: {
    backgroundColor: colors.grey5,
    borderRadius: 10,
    padding: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
  },
  permissionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  permissionStatusText: {
    fontSize: 14,
    color: colors.grey2,
    marginTop: 2,
  },
  permissionHelpText: {
    fontSize: 12,
    color: colors.grey3,
    marginTop: 4,
    lineHeight: 16,
  },
  fixButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  fixButtonText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  masterEnabledNote: {
    fontSize: 14,
    color: colors.grey2,
    marginBottom: 12,
    textAlign: 'center',
  },
});
