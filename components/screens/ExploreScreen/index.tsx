import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import {
  selectBucketListItems,
  fetchBucketList,
} from '@/store/slices/bucketListSlice';
import { type BucketListItem } from '@/models/bucket-list';
import { LocationStatus } from '@/components/common/LocationStatus';
import { LocationPermissionRequest } from '@/components/common/LocationPermissionRequest';
import { logger } from '@/utils/logger';
import { useThemeColors } from '@/hooks/useThemeColors';

export const ExploreScreen: React.FC = () => {
  const colors = useThemeColors();
  const { coordinates, permissionGranted, permissionChecked, requestLocation } =
    useGeolocation();
  const bucketListItems = useAppSelector(
    selectBucketListItems,
  ) as BucketListItem[];
  const dispatch = useAppDispatch();

  // Fetch bucket list on mount
  useEffect(() => {
    dispatch(fetchBucketList() as any);
  }, [dispatch]);

  const initialRegion = coordinates
    ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (coordinates && mapRef.current) {
      const region: Region = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [coordinates]);

  // Helper function to get coordinates from bucket list item
  const getItemCoordinates = (item: BucketListItem) => {
    // Try coordinates first
    if (
      item.venue.coordinates &&
      typeof item.venue.coordinates.latitude === 'number' &&
      typeof item.venue.coordinates.longitude === 'number'
    ) {
      return item.venue.coordinates;
    }

    // Try geocodes
    if (
      item.venue.geocodes?.main?.latitude &&
      item.venue.geocodes?.main?.longitude &&
      typeof item.venue.geocodes.main.latitude === 'number' &&
      typeof item.venue.geocodes.main.longitude === 'number'
    ) {
      return {
        latitude: item.venue.geocodes.main.latitude,
        longitude: item.venue.geocodes.main.longitude,
      };
    }

    // Try location lat/lng
    if (
      item.venue.location?.lat &&
      item.venue.location?.lng &&
      typeof item.venue.location.lat === 'number' &&
      typeof item.venue.location.lng === 'number'
    ) {
      return {
        latitude: item.venue.location.lat,
        longitude: item.venue.location.lng,
      };
    }

    logger.info(`❌ No valid coordinates found for ${item.venue.name}`);
    return null;
  };

  const styles = createStyles(colors);

  // Show loading state while checking permissions
  if (!permissionChecked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons color={colors.grey3} name="map-outline" size={64} />
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show location permission overlay when permission not granted
  if (!permissionGranted && permissionChecked) {
    return <LocationPermissionRequest onRequestLocation={requestLocation} showButtons={false} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {coordinates ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* User location marker (optional, since showsUserLocation is true) */}
            <Marker
              coordinate={coordinates}
              title="You are here"
              pinColor="blue"
            />
            {/* Bucket list markers */}
            {bucketListItems.map((item: BucketListItem) => {
              const itemCoordinates = getItemCoordinates(item);
              logger.info(
                `🗺️ ExploreScreen: Item ${item.venue.name} coordinates:`,
                itemCoordinates,
              );

              return itemCoordinates ? (
                <Marker
                  key={item.id}
                  coordinate={itemCoordinates}
                  title={item.venue.name}
                  description={
                    item.venue.address || item.venue.location?.formattedAddress
                  }
                  pinColor="red"
                />
              ) : null;
            })}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons color={colors.grey3} name="map-outline" size={48} />
            <Text style={styles.mapPlaceholderText}>Loading map...</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Ionicons color={colors.grey3} name="map-outline" size={64} />
        <Text style={styles.title}>Explore Restaurants</Text>
        <Text style={styles.description}>
          {coordinates
            ? `This screen shows your location and ${bucketListItems.length} saved bucket list restaurants on the map.`
            : 'Getting your location...'}
        </Text>

        {/* Only show location status if there's an issue getting coordinates (but permission is granted) */}
        {!coordinates && <LocationStatus showDetails={false} />}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/search')}
          accessibilityRole="button"
          accessibilityLabel="Search restaurants"
          accessibilityHint="Double tap to search for restaurants"
        >
          <Text style={styles.buttonText}>Search Restaurants</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey5,
  },
  mapContainer: {
    width: '100%',
    height: Dimensions.get('window').height * 0.5,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.grey2,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey5,
  },
  mapPlaceholderText: {
    fontSize: 18,
    color: colors.grey2,
    marginTop: 10,
  },
});

export default ExploreScreen;
