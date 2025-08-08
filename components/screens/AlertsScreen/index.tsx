import { Icon, Slider } from '@rneui/themed';
import React, { useEffect, useRef, useState } from 'react';
import { checkAllPermissions } from '@/services/PermissionsService';
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
import GeofencingService from '@/services/GeofencingService';
import { checkAndRequestLocationServices } from '@/utils/locationHelpers';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectMasterNotificationsEnabled,
  setMasterNotificationsEnabled,
  setNotificationEnabled,
  selectDistanceMiles,
  setDistanceMiles,
} from '@/store/slices/bucketListSlice';
import { theme } from '@/theme';
import { BucketListItem } from '@/models/bucket-list';

export function AlertsScreen() {
  const dispatch = useAppDispatch();
  const bucketListItems = useAppSelector(state => state.bucketList.items);
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);
  const [permissions, setPermissions] = useState({
    location: { foreground: false, background: false },
    notifications: { granted: false },
  });
  const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false);
  const [sliderValue, setSliderValue] = useState<number>(distanceMiles);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const perms = await checkAllPermissions();
    setPermissions(perms);
    console.log('[AlertsScreen] Current permissions:', perms);
  };
  useEffect(() => {
    setSliderValue(distanceMiles);
  }, [distanceMiles]);

  const handleMasterToggle = async (value: boolean) => {
    if (value) {
      // Check location services and request permissions first
      const locationServicesOk = await checkAndRequestLocationServices();

      if (!locationServicesOk) {
        // Don't enable if location services are disabled or permissions denied
        console.log('[AlertsScreen] Location services disabled or permissions denied');
        return;
      }

      // Update permissions state
      await checkPermissions();
    }

    dispatch(setMasterNotificationsEnabled(value));

    if (value) {
      // Master ON: enable all geofences
      // Clear all existing geofences first
      await GeofencingService.clearAllGeofences();
      for (const restaurant of bucketListItems as BucketListItem[]) {
        if (
          restaurant.venue?.geocodes?.main?.latitude &&
          restaurant.venue?.geocodes?.main?.longitude
        ) {
          await GeofencingService.addGeofence({
            id: restaurant.id,
            name: restaurant.venue.name,
            latitude: restaurant.venue.geocodes.main.latitude,
            longitude: restaurant.venue.geocodes.main.longitude,
            radius: distanceMiles * 1609.34,
            venueId: restaurant.venue.id,
          });
          console.log(`[AlertsScreen] Added geofence for: ${restaurant.venue.name}`);
        }
      }
    } else {
      // Master OFF: Revert to individual settings
      await GeofencingService.clearAllGeofences();
      for (const restaurant of bucketListItems as BucketListItem[]) {
        if (
          restaurant.notificationsEnabled &&
          restaurant.venue?.geocodes?.main?.latitude &&
          restaurant.venue?.geocodes?.main?.longitude
        ) {
          await GeofencingService.addGeofence({
            id: restaurant.id,
            name: restaurant.venue.name,
            latitude: restaurant.venue.geocodes.main.latitude,
            longitude: restaurant.venue.geocodes.main.longitude,
            radius: distanceMiles * 1609.34,
            venueId: restaurant.venue.id,
          });
          console.log(`[AlertsScreen] Re-added geofence for: ${restaurant.venue.name}`);
        }
      }
    }
  };
  console.log('🔍 Bucket list items:', JSON.stringify(bucketListItems));

  const restaurantsWithLocation = bucketListItems.filter((item: BucketListItem) => {
    return (
      item.venue?.geocodes?.main?.latitude !== undefined &&
      item.venue?.geocodes?.main?.longitude !== undefined
    );
  });
  console.log('🔍 Restaurants with location:', restaurantsWithLocation);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Location Alerts</Text>
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
              color={masterEnabled ? theme.colors.primary : theme.colors.grey3}
            />
            <View style={styles.masterToggleText}>
              <Text style={styles.masterToggleTitle}>Enable All Alerts</Text>
              <Text style={styles.masterToggleSubtitle}>Master switch for all notifications</Text>
            </View>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={handleMasterToggle}
            trackColor={{
              false: theme.colors.grey4,
              true: theme.colors.primary,
            }}
            thumbColor={Platform.OS === 'android' ? theme.colors.grey5 : undefined}
          />
        </View>
        {/* Distance Slider */}
        <View style={styles.sliderCard}>
          <Text style={styles.sliderLabel}>Alert Distance: {sliderValue?.toFixed(2)} miles</Text>
          <Slider
            value={sliderValue}
            disabled={!masterEnabled} // Disable when master is off
            onValueChange={val => {
              setSliderValue(val);
            }}
            onSlidingComplete={async val => {
              // Prevent redundant updates
              if (Number(val.toFixed(2)) === Number(distanceMiles.toFixed(2))) {
                return;
              }

              // Persist to store
              dispatch(setDistanceMiles(val));

              // Update geofences once per commit when master is enabled
              if (masterEnabled) {
                if (isUpdatingRef.current) return;
                isUpdatingRef.current = true;
                try {
                  await GeofencingService.clearAllGeofences();
                  for (const restaurant of bucketListItems as BucketListItem[]) {
                    if (
                      restaurant.notificationsEnabled &&
                      restaurant.venue?.geocodes?.main?.latitude &&
                      restaurant.venue?.geocodes?.main?.longitude
                    ) {
                      await GeofencingService.addGeofence({
                        id: restaurant.id,
                        name: restaurant.venue.name,
                        latitude: restaurant.venue.geocodes.main.latitude,
                        longitude: restaurant.venue.geocodes.main.longitude,
                        radius: val * 1609.34,
                        venueId: restaurant.venue.id,
                      });
                    }
                  }
                  console.log(
                    `[AlertsScreen] Updated all geofence radii to ${val.toFixed(2)} miles`
                  );
                } finally {
                  isUpdatingRef.current = false;
                }
              }
            }}
            minimumValue={0.1}
            maximumValue={10}
            step={0.05}
            thumbStyle={{ height: 24, width: 24 }}
            trackStyle={{ height: 6 }}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.grey4}
          />
        </View>

        {bucketListItems.length === 0 && (
          <View style={styles.emptyStateCard}>
            <Icon name="location-off" type="material" size={48} color={theme.colors.grey3} />
            <Text style={styles.emptyStateTitle}>No Restaurants to Track</Text>
            <Text style={styles.emptyStateText}>
              Add restaurants to your bucket list to enable location alerts
            </Text>
          </View>
        )}

        {masterEnabled && (
          <View style={styles.permissionsContainer}>
            <TouchableOpacity
              style={styles.permissionHeader}
              onPress={() => setIsPermissionsExpanded(!isPermissionsExpanded)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon
                  name="shield-check"
                  type="material-community"
                  size={24}
                  color={theme.colors.grey1}
                />
                <Text style={styles.permissionTitle}>Permissions</Text>
              </View>
              <Icon
                name={isPermissionsExpanded ? 'chevron-up' : 'chevron-down'}
                type="material-community"
                size={24}
                color={theme.colors.grey1}
              />
            </TouchableOpacity>
            {isPermissionsExpanded && (
              <>
                <Text style={styles.permissionDescription}>
                  Location alerts require foreground and background permissions to notify you when
                  you&apos;re near a saved restaurant, even when the app is closed.
                </Text>

                <View style={styles.permissionStatusCard}>
                  {/* Location Permission */}
                  <View
                    style={[
                      styles.permissionItem,
                      { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4 },
                    ]}
                  >
                    <Icon
                      name={permissions.location.foreground ? 'check-circle' : 'alert-circle'}
                      type="material-community"
                      size={24}
                      color={
                        permissions.location.foreground ? theme.colors.success : theme.colors.error
                      }
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionText}>Location</Text>
                      <Text style={styles.permissionStatusText}>
                        {permissions.location.foreground ? 'Granted' : 'Denied'}
                      </Text>
                      {!permissions.location.foreground && (
                        <Text style={styles.permissionHelpText}>
                          Tap &apos;Open Settings&apos;, go to Location, and select &apos;While
                          Using the App&apos;.
                        </Text>
                      )}
                    </View>
                    {!permissions.location.foreground && (
                      <TouchableOpacity
                        style={styles.fixButton}
                        onPress={() => Linking.openSettings()}
                      >
                        <Text style={styles.fixButtonText}>Open Settings</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Background Location Permission */}
                  <View
                    style={[
                      styles.permissionItem,
                      { borderBottomWidth: 1, borderBottomColor: theme.colors.grey4 },
                    ]}
                  >
                    <Icon
                      name={permissions.location.background ? 'check-circle' : 'alert-circle'}
                      type="material-community"
                      size={24}
                      color={
                        permissions.location.background ? theme.colors.success : theme.colors.error
                      }
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionText}>Background Location</Text>
                      <Text style={styles.permissionStatusText}>
                        {permissions.location.background
                          ? 'Set to "Always"'
                          : 'Not set to "Always"'}
                      </Text>
                      {!permissions.location.background && (
                        <Text style={styles.permissionHelpText}>
                          Required for alerts when app is closed. Select &apos;Always&apos;.
                        </Text>
                      )}
                    </View>
                    {!permissions.location.background && (
                      <TouchableOpacity
                        style={styles.fixButton}
                        onPress={() => Linking.openSettings()}
                      >
                        <Text style={styles.fixButtonText}>Open Settings</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Notifications Permission */}
                  <View style={[styles.permissionItem, { borderBottomWidth: 0 }]}>
                    <Icon
                      name={permissions.notifications.granted ? 'check-circle' : 'alert-circle'}
                      type="material-community"
                      size={24}
                      color={
                        permissions.notifications.granted
                          ? theme.colors.success
                          : theme.colors.error
                      }
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionText}>Notifications</Text>
                      <Text style={styles.permissionStatusText}>
                        {permissions.notifications.granted ? 'Enabled' : 'Disabled'}
                      </Text>
                      {!permissions.notifications.granted && (
                        <Text style={styles.permissionHelpText}>
                          Enable notifications to receive alerts.
                        </Text>
                      )}
                    </View>
                    {!permissions.notifications.granted && (
                      <TouchableOpacity
                        style={styles.fixButton}
                        onPress={() => Linking.openSettings()}
                      >
                        <Text style={styles.fixButtonText}>Open Settings</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Restaurant List */}
        {!masterEnabled && bucketListItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Saved Restaurants</Text>
            <View style={styles.restaurantList}>
              {restaurantsWithLocation.map((restaurant: BucketListItem) => {
                // Defensive: ensure id and venue fields are present and valid

                // Defensive: ensure name, address, category are strings (fallback to empty string if not)
                const name = typeof restaurant.venue.name === 'string' ? restaurant.venue.name : '';
                const address =
                  typeof restaurant.venue.address === 'string' ? restaurant.venue.address : '';
                const category =
                  typeof restaurant.venue.category === 'string' ? restaurant.venue.category : '';

                return (
                  <View key={restaurant.id} style={styles.restaurantCard}>
                    <View style={styles.restaurantInfo}>
                      <Text style={styles.restaurantName}>{name}</Text>
                      <Text style={styles.restaurantAddress} numberOfLines={1}>
                        {address}
                      </Text>
                      {category ? <Text style={styles.restaurantCategory}>{category}</Text> : null}
                    </View>
                    <Switch
                      value={restaurant.notificationsEnabled === true}
                      disabled={masterEnabled} // Individual toggles are disabled when master is ON
                      onValueChange={async enabled => {
                        dispatch(setNotificationEnabled({ id: restaurant.id as string, enabled }));

                        // Geofence is only managed here when master is OFF
                        if (!masterEnabled) {
                          if (enabled) {
                            if (
                              restaurant.venue?.geocodes?.main?.latitude &&
                              restaurant.venue?.geocodes?.main?.longitude
                            ) {
                              await GeofencingService.addGeofence({
                                id: restaurant.id as string,
                                name,
                                latitude: restaurant.venue.geocodes.main.latitude,
                                longitude: restaurant.venue.geocodes.main.longitude,
                                radius: distanceMiles * 1609.34,
                              });
                              console.log(`[AlertsScreen] Enabled geofence for: ${name}`);
                            }
                          } else {
                            await GeofencingService.removeGeofence(restaurant.id as string);
                            console.log(`[AlertsScreen] Disabled geofence for: ${name}`);
                          }
                        }
                      }}
                      trackColor={{
                        false: theme.colors.grey4,
                        true: theme.colors.primary,
                      }}
                      thumbColor={Platform.OS === 'android' ? theme.colors.grey5 : undefined}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Location Alerts Work</Text>
          <View style={styles.infoItem}>
            <Icon name="location-on" type="material" size={20} color={theme.colors.grey2} />
            <Text style={styles.infoText}>Enable alerts for restaurants you want to visit</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon
              name="notifications-active"
              type="material"
              size={20}
              color={theme.colors.grey2}
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
              color={theme.colors.grey2}
            />
            <Text style={styles.infoText}>Works efficiently in the background</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="privacy-tip" type="material" size={20} color={theme.colors.grey2} />
            <Text style={styles.infoText}>Your location data stays on your device</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.grey5,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.backgroundDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.grey2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  masterToggleCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
    color: theme.colors.backgroundDark,
  },
  masterToggleSubtitle: {
    fontSize: 14,
    color: theme.colors.grey2,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 12,
    fontSize: 14,
    color: theme.colors.primary,
  },
  emptyStateCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.backgroundDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.grey2,
    textAlign: 'center',
    lineHeight: 20,
  },

  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.backgroundDark,
    marginBottom: 12,
  },
  restaurantList: {
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.backgroundDark,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: theme.colors.grey2,
  },
  restaurantCategory: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.backgroundDark,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.grey1,
    marginLeft: 12,
    flex: 1,
  },
  debugCard: {
    backgroundColor: theme.colors.background,
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
    color: theme.colors.backgroundDark,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 14,
    color: theme.colors.grey2,
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  sliderCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
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
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.backgroundDark,
    marginBottom: 8,
  },
  permissionsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
    color: theme.colors.backgroundDark,
    marginLeft: 10,
  },
  permissionDescription: {
    fontSize: 14,
    color: theme.colors.grey2,
    lineHeight: 20,
    marginBottom: 16,
  },
  permissionStatusCard: {
    backgroundColor: theme.colors.grey5,
    borderRadius: 10,
    padding: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey4,
  },
  permissionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.backgroundDark,
  },
  permissionStatusText: {
    fontSize: 14,
    color: theme.colors.grey2,
    marginTop: 2,
  },
  permissionHelpText: {
    fontSize: 12,
    color: theme.colors.grey3,
    marginTop: 4,
    lineHeight: 16,
  },
  fixButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  fixButtonText: {
    color: theme.colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
});
