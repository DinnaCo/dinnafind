import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { selectBucketListItems, fetchBucketList } from '@/store/slices/bucketListSlice';
import { type BucketListItem } from '@/models/bucket-list';
import { LocationPermissionRequest } from '@/components/common/LocationPermissionRequest';
import { LocationStatus } from '@/components/common/LocationStatus';

export const ExploreScreen: React.FC = () => {
  const { coordinates, permissionGranted, requestLocation } = useGeolocation();
  const bucketListItems = useAppSelector(selectBucketListItems) as BucketListItem[];
  const dispatch = useAppDispatch();

  // Fetch bucket list on mount
  useEffect(() => {
    dispatch(fetchBucketList() as any);
  }, [dispatch]);

  // Debug logging
  useEffect(() => {
    console.log('🗺️ ExploreScreen: Bucket list items count:', bucketListItems.length);
    console.log('🗺️ ExploreScreen: Coordinates:', coordinates);
    console.log('🗺️ ExploreScreen: Permission granted:', permissionGranted);
  }, [bucketListItems, coordinates, permissionGranted]);

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
    console.log(`🗺️ Getting coordinates for ${item.venue.name}:`, {
      coordinates: item.venue.coordinates,
      geocodes: item.venue.geocodes,
      location: item.venue.location,
    });

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

    console.log(`❌ No valid coordinates found for ${item.venue.name}`);
    return null;
  };

  // Show location permission request if permission not granted
  if (!permissionGranted) {
    return <LocationPermissionRequest onRequestLocation={requestLocation} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={!!coordinates && permissionGranted}
          showsMyLocationButton={!!coordinates && permissionGranted}
        >
          {/* User location marker (optional, since showsUserLocation is true) */}
          {coordinates && <Marker coordinate={coordinates} title="You are here" pinColor="blue" />}
          {/* Bucket list markers */}
          {bucketListItems.map((item: BucketListItem) => {
            const itemCoordinates = getItemCoordinates(item);
            console.log(`🗺️ ExploreScreen: Item ${item.venue.name} coordinates:`, itemCoordinates);

            return itemCoordinates ? (
              <Marker
                key={item.id}
                coordinate={itemCoordinates}
                title={item.venue.name}
                description={item.venue.address || item.venue.location?.formattedAddress}
                pinColor="red"
              />
            ) : null;
          })}
        </MapView>
      </View>

      <View style={styles.content}>
        <Ionicons color="#CCCCCC" name="map-outline" size={64} />
        <Text style={styles.title}>Explore Restaurants</Text>
        <Text style={styles.description}>
          {coordinates
            ? `This screen shows your location and ${bucketListItems.length} saved bucket list restaurants on the map.`
            : 'This screen will show your location and saved restaurants once location access is granted.'}
        </Text>

        {/* Location status component */}
        <LocationStatus showDetails={true} onRetry={requestLocation} />

        <TouchableOpacity style={styles.button} onPress={() => router.push('/search')}>
          <Text style={styles.buttonText}>Search Restaurants</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
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
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExploreScreen;
