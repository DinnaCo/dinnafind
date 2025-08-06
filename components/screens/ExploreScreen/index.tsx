import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import {
  selectBucketListItems,
  addToBucketList,
  fetchBucketList,
} from '@/store/slices/bucketListSlice';
import { type BucketListItem } from '@/models/bucket-list';
import { LocationPermissionRequest } from '@/components/common/LocationPermissionRequest';

export const ExploreScreen: React.FC = () => {
  const {
    coordinates,
    loading: locationLoading,
    error: locationError,
    permissionGranted,
    requestLocation,
  } = useGeolocation();
  const bucketListItems = useAppSelector(selectBucketListItems) as BucketListItem[];
  const dispatch = useAppDispatch();

  // Fetch bucket list on mount
  useEffect(() => {
    dispatch(fetchBucketList());
  }, [dispatch]);

  // Debug logging
  useEffect(() => {
    console.log('🗺️ ExploreScreen: Bucket list items count:', bucketListItems.length);
    console.log('🗺️ ExploreScreen: Coordinates:', coordinates);
    console.log('🗺️ ExploreScreen: Permission granted:', permissionGranted);
    console.log('🗺️ ExploreScreen: Location loading:', locationLoading);
    console.log('🗺️ ExploreScreen: Location error:', locationError);

    if (bucketListItems.length > 0) {
      console.log('🗺️ ExploreScreen: First item:', bucketListItems[0]);
      console.log('🗺️ ExploreScreen: First item venue:', bucketListItems[0].venue);
      console.log(
        '🗺️ ExploreScreen: First item coordinates:',
        bucketListItems[0].venue.coordinates
      );
      console.log('🗺️ ExploreScreen: First item geocodes:', bucketListItems[0].venue.geocodes);
      console.log('🗺️ ExploreScreen: First item location:', bucketListItems[0].venue.location);
    }
  }, [bucketListItems, coordinates, permissionGranted, locationLoading, locationError]);

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

  // Test function to add sample bucket list items
  const addTestItems = () => {
    const testItems = [
      {
        fsq_id: 'test-venue-1',
        name: 'Franklin Barbecue',
        categories: [{ name: 'Barbecue Restaurant' }],
        location: {
          formatted_address: '900 E 11th St, Austin, TX 78702',
          lat: 30.2741,
          lng: -97.7394,
        },
        geocodes: {
          main: {
            latitude: 30.2741,
            longitude: -97.7394,
          },
        },
      },
      {
        fsq_id: 'test-venue-2',
        name: 'Uchi',
        categories: [{ name: 'Sushi Restaurant' }],
        location: {
          formatted_address: '801 S Lamar Blvd, Austin, TX 78704',
          lat: 30.2597,
          lng: -97.7497,
        },
        geocodes: {
          main: {
            latitude: 30.2597,
            longitude: -97.7497,
          },
        },
      },
      {
        fsq_id: 'test-venue-3',
        name: 'Veracruz All Natural',
        categories: [{ name: 'Mexican Restaurant' }],
        location: {
          formatted_address: '1704 E Cesar Chavez St, Austin, TX 78702',
          lat: 30.2647,
          lng: -97.7314,
        },
        geocodes: {
          main: {
            latitude: 30.2647,
            longitude: -97.7314,
          },
        },
      },
    ];

    testItems.forEach(item => {
      dispatch(addToBucketList(item) as any);
    });
  };

  // Show location permission request if permission not granted
  if (!permissionGranted && !locationLoading) {
    return <LocationPermissionRequest onRequestLocation={requestLocation} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        {locationLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF4500" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}
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

        {locationError && <Text style={styles.errorText}>Location error: {locationError}</Text>}

        <TouchableOpacity style={styles.button} onPress={() => router.push('/search')}>
          <Text style={styles.buttonText}>Search Restaurants</Text>
        </TouchableOpacity>

        {/* Manual location request button if needed */}
        {!coordinates && permissionGranted && !locationLoading && (
          <TouchableOpacity style={styles.locationButton} onPress={requestLocation}>
            <Text style={styles.buttonText}>Get My Location</Text>
          </TouchableOpacity>
        )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
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
  debugButton: {
    backgroundColor: '#666666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF4500',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  locationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
});

export default ExploreScreen;
