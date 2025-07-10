import { Icon, Slider } from '@rneui/themed';
import React, { useEffect } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useGeofencing } from '@/hooks/useGeofencing';
import GeofencingService from '@/services/GeofencingService';
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
  const { error, isInitialized } = useGeofencing();
  const bucketListItems = useAppSelector(state => state.bucketList.items);
  const masterEnabled = useAppSelector(selectMasterNotificationsEnabled);
  const distanceMiles = useAppSelector(selectDistanceMiles);

  useEffect(() => {
    if (error) {
      Alert.alert('Location Permission Required', error);
    }
  }, [error]);

  // Fix type error: ensure bucketListItems is typed, or use type guard
  const restaurantsWithNotificationsEnabled = bucketListItems.filter(
    (item: any) => item.notificationsEnabled === true
  );

  const handleMasterToggle = async (value: boolean) => {
    dispatch(setMasterNotificationsEnabled(value));

    // Always rebuild geofences based on current state
    await GeofencingService.removeAllGeofences();

    if (value) {
      // Master ON: Track ALL restaurants with notifications enabled
      for (const restaurant of bucketListItems as BucketListItem[]) {
        if (
          restaurant.venue &&
          restaurant.venue.coordinates &&
          typeof restaurant.venue.coordinates.latitude === 'number' &&
          typeof restaurant.venue.coordinates.longitude === 'number'
        ) {
          await GeofencingService.addGeofence({
            id: restaurant.id,
            name: restaurant.venue.name,
            latitude: restaurant.venue.coordinates.latitude,
            longitude: restaurant.venue.coordinates.longitude,
          });
        }
      }
    } else {
      // Master OFF: Still track individually enabled restaurants
      for (const restaurant of bucketListItems as BucketListItem[]) {
        if (
          restaurant.venue &&
          restaurant.venue.coordinates &&
          typeof restaurant.venue.coordinates.latitude === 'number' &&
          typeof restaurant.venue.coordinates.longitude === 'number'
        ) {
          await GeofencingService.addGeofence({
            id: restaurant.id,
            name: restaurant.venue.name,
            latitude: restaurant.venue.coordinates.latitude,
            longitude: restaurant.venue.coordinates.longitude,
          });
        }
      }
    }
  };
  console.log('🔍 Bucket list items:', bucketListItems);

  const restaurantsWithLocation = bucketListItems.filter((item: BucketListItem) => {
    return (
      item.venue?.coordinates?.latitude !== undefined &&
      item.venue?.coordinates?.longitude !== undefined
    );
  });
  console.log('🔍 Restaurants with location:', restaurantsWithLocation);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Location Alerts</Text>
        <Text style={styles.headerSubtitle}>
          Get notified when you{`'`}re near saved restaurants
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
          <Text style={styles.sliderLabel}>Alert Distance: {distanceMiles?.toFixed(2)} miles</Text>
          <Slider
            value={distanceMiles}
            onValueChange={value => dispatch(setDistanceMiles(value))}
            minimumValue={0.1}
            maximumValue={10}
            step={0.05}
            thumbStyle={{ height: 24, width: 24 }}
            trackStyle={{ height: 6 }}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.grey4}
          />
        </View>

        {bucketListItems.length === 0 && isInitialized && (
          <View style={styles.emptyStateCard}>
            <Icon name="location-off" type="material" size={48} color={theme.colors.grey3} />
            <Text style={styles.emptyStateTitle}>No Restaurants to Track</Text>
            <Text style={styles.emptyStateText}>
              Add restaurants to your bucket list to enable location alerts
            </Text>
          </View>
        )}

        {/* Active Alerts Count */}
        {masterEnabled && (
          <View style={styles.activeCountCard}>
            <Icon name="check-circle" type="material" size={20} color={theme.colors.success} />
            <Text style={styles.activeCountText}>{bucketListItems.length} active alerts</Text>
          </View>
        )}

        {/* Restaurant List */}
        {!masterEnabled && bucketListItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Saved Restaurants</Text>
            <View style={styles.restaurantList}>
              {bucketListItems.map((restaurant: BucketListItem) => {
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
                      onValueChange={enabled => {
                        dispatch(setNotificationEnabled({ id: restaurant.id as string, enabled }));
                        if (enabled) {
                          GeofencingService.addGeofence({
                            id: restaurant.id as string,
                            name,
                            latitude: restaurant.venue?.coordinates?.latitude ?? 0,
                            longitude: restaurant.venue?.coordinates?.longitude ?? 0,
                          });
                        } else {
                          GeofencingService.removeGeofence(restaurant.id as string);
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
  activeCountCard: {
    backgroundColor: theme.colors.success + '10',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  activeCountText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.success,
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
});
