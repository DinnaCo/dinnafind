import type React from 'react';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useDispatch } from 'react-redux';
import { foursquareV3Service } from '@/api/foursquareV3';
import { useAppSelector } from '@/store';
import { addToBucketList, fetchBucketList } from '@/store/slices/bucketListSlice';
import { AnyAction } from 'redux';

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default icon for when venue doesn't have photos - using the highest resolution
const DEFAULT_ICON = 'https://ss3.4sqi.net/img/categories_v2/food/default_512.png';

interface VenueDetails {
  fsq_id: string;
  name: string;
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
  };
  location: {
    formatted_address: string;
    address: string;
    locality: string;
    region: string;
    postcode: string;
    country: string;
  };
  photos: {
    id: string;
    created_at: string;
    prefix: string;
    suffix: string;
    width: number;
    height: number;
    classifications: string[];
  }[];
  rating: number;
}

export const DetailScreen: React.FC = () => {
  // State for venue details
  const [venueDetails, setVenueDetails] = useState<VenueDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [basicVenueData, setBasicVenueData] = useState<any>(null);
  const [isLoadingBasicData, setIsLoadingBasicData] = useState(false);

  const params = useLocalSearchParams();
  const dispatch = useDispatch();

  // Normalize venueId (strip query params)
  let venue: any = null;
  const { data, itemData } = params;
  if (params.data) {
    try {
      const decodedData = decodeURIComponent(params.data as string);
      venue = JSON.parse(decodedData);
    } catch (error) {}
  } else if (params.itemData) {
    try {
      venue = typeof params.itemData === 'string' ? JSON.parse(params.itemData) : params.itemData;
    } catch (error) {}
  }
  if (!venue && basicVenueData) {
    venue = basicVenueData;
  }
  const normalizedVenueId = (venue?.id || venue?.fsq_id)?.split('?')[0];

  // Get saved venues to check if this one is already saved (normalize IDs)
  const savedVenues = useAppSelector(state => state.bucketList.items);
  const savedVenue =
    venue && normalizedVenueId
      ? savedVenues.find(item => {
          const anyItem = item as any;
          const itemId = typeof anyItem.id === 'string' ? anyItem.id.split('?')[0] : undefined;
          const venueItemId =
            anyItem.venue && typeof anyItem.venue.id === 'string'
              ? anyItem.venue.id.split('?')[0]
              : undefined;
          return itemId === normalizedVenueId || venueItemId === normalizedVenueId;
        })
      : null;
  const isVenueSaved = !!savedVenue;
  const isVenueVisited = !!(savedVenue && (savedVenue as any).visitedAt);

  // Fetch venue details when component mounts or when we only have an ID
  useEffect(() => {
    const fetchVenueData = async () => {
      // If we only have a venueId and no venue data, fetch basic data first
      if (!venue && params.venueId && !isLoadingBasicData && !basicVenueData) {
        setIsLoadingBasicData(true);
        try {
          const cleanVenueId = (params.venueId as string).split('?')[0]; // Remove any query params
          // Guard: Check for valid venueId
          if (!cleanVenueId || typeof cleanVenueId !== 'string' || !cleanVenueId.trim()) {
            setDetailsError('Invalid or missing venue ID');
            setIsLoadingBasicData(false);
            return;
          }
          console.log('Fetching venue data for ID:', cleanVenueId);
          const details = await foursquareV3Service.getPlacesDetails(cleanVenueId);

          if (details) {
            // Create a basic venue object from the details
            const basicVenue = {
              id: details.fsq_id,
              fsq_id: details.fsq_id,
              name: details.name,
              categories: details.categories || [],
              location: details.location,
              geocodes: details.geocodes,
              referralId: details.fsq_id,
            };
            setBasicVenueData(basicVenue);
            setVenueDetails(details);
          }
        } catch (error) {
          console.error('Error fetching basic venue data:', error);
          setDetailsError('Failed to load venue information');
        } finally {
          setIsLoadingBasicData(false);
        }
        return;
      }

      // Regular flow for when we have venue data
      if (!venue) return;

      const venueId = normalizedVenueId;
      // Guard: Check for valid venueId
      if (!venueId || typeof venueId !== 'string' || !venueId.trim()) {
        setDetailsError('Invalid or missing venue ID');
        setIsLoadingDetails(false);
        return;
      }

      // Skip if we already have venue details
      if (venueDetails && venueDetails.fsq_id === venueId) {
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError(null);

      try {
        console.log('Fetching venue details for ID:', venueId);
        const details = await foursquareV3Service.getPlacesDetails(venueId);

        if (details) {
          console.log('Venue details fetched successfully');
          setVenueDetails(details);
        } else {
          setDetailsError('Failed to fetch venue details');
        }
      } catch (error) {
        console.error('Error fetching venue details:', error);
        setDetailsError('Failed to load venue details');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchVenueData();
  }, [venue, params.venueId, basicVenueData, venueDetails, isLoadingBasicData, normalizedVenueId]);

  // Fetch bucket list to make sure it's up to date
  useEffect(() => {
    dispatch(fetchBucketList() as unknown as AnyAction);
  }, [dispatch]);

  // Handle auto-save from deep link
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  useEffect(() => {
    const shouldAutoSave = params.autoSave === 'true';
    if (
      shouldAutoSave &&
      venue &&
      !isVenueSaved &&
      !isLoadingBasicData &&
      !isLoadingDetails &&
      !hasAutoSaved
    ) {
      setHasAutoSaved(true);
      console.log('[AutoSave] Auto-saving venue from deep link:', venue);
      // Make sure the venue has an fsq_id for compatibility
      const venueToSave = venue.fsq_id ? venue : { ...venue, fsq_id: normalizedVenueId };
      dispatch(addToBucketList(venueToSave) as any);
      setTimeout(() => {
        Alert.alert('Saved!', `${venue?.name || 'Restaurant'} has been added to your bucket list!`);
      }, 500);
      setTimeout(() => {
        dispatch(fetchBucketList() as unknown as AnyAction);
      }, 1000);
    }
  }, [
    venue,
    isVenueSaved,
    isLoadingBasicData,
    isLoadingDetails,
    params.autoSave,
    dispatch,
    hasAutoSaved,
    normalizedVenueId,
  ]);

  // Show loading state when fetching basic data
  if (isLoadingBasicData || (!venue && params.venueId)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={styles.errorText}>Loading venue information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback for when no venue data is available
  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons color="#FF4500" name="alert-circle-outline" size={64} />
          <Text style={styles.errorText}>Venue data not available</Text>
          <Text style={styles.debugText}>Debug: params = {JSON.stringify(params)}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Using venue details if available, otherwise fallback to basic venue data
  const venueName = (venueDetails?.name || venue.name) ?? 'Restaurant';

  // Handle category - could be in categories array or single category field
  const venueCategory =
    venue.categories && venue.categories.length > 0
      ? venue.categories[0].name
      : venue.category ?? 'Restaurant';

  // Handle address - prioritize venue details, then fallback to basic venue data
  const venueAddress =
    (venueDetails?.location?.formatted_address ||
      venue.location?.formattedAddress ||
      venue.location?.formatted_address ||
      venue.address) ??
    'Address not available';

  // Get photos from venue details or fallback to category icon
  const getHeroImageUrl = () => {
    // If we have venue details with photos, use the first photo
    if (venueDetails?.photos && venueDetails.photos.length > 0) {
      const photo = venueDetails.photos[0];
      // Use a large size for the hero image (original size or 800px)
      const size = photo.width > 800 ? 'original' : '800';
      return `${photo.prefix}${size}${photo.suffix}`;
    }

    // Fallback to category icon
    if (
      venue.categories &&
      venue.categories.length > 0 &&
      venue.categories[0].icon &&
      venue.categories[0].icon.prefix &&
      venue.categories[0].icon.suffix
    ) {
      // Use the highest resolution icon (512px)
      return `${venue.categories[0].icon.prefix}512${venue.categories[0].icon.suffix}`;
    }

    return DEFAULT_ICON;
  };

  const heroImageUrl = getHeroImageUrl();

  // Handle saving venue to bucket list (normalize ID)
  const handleSaveVenue = () => {
    console.log('Save button pressed, venue:', venue);
    if (!isVenueSaved) {
      // Make sure the venue has an fsq_id for compatibility
      const venueToSave = venue.fsq_id ? venue : { ...venue, fsq_id: normalizedVenueId };
      console.log('Dispatching addToBucketList with:', venueToSave);
      dispatch(addToBucketList(venueToSave) as any);
      Alert.alert('Saved', `${venueName} has been added to your bucket list!`);
      setTimeout(() => {
        dispatch(fetchBucketList() as unknown as AnyAction);
      }, 500);
    } else {
      Alert.alert('Already Saved', `${venueName} is already in your bucket list.`);
    }
  };

  // Handle opening maps for directions
  const handleGetDirections = () => {
    // Check for coordinates in different possible locations, prioritize venue details
    const lat =
      venueDetails?.geocodes?.main?.latitude ||
      venue.location?.lat ||
      venue.coordinates?.latitude ||
      venue.geocodes?.main?.latitude;
    const lng =
      venueDetails?.geocodes?.main?.longitude ||
      venue.location?.lng ||
      venue.coordinates?.longitude ||
      venue.geocodes?.main?.longitude;

    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:?q=${venueName}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${venueName}`,
      });

      if (url) {
        Linking.canOpenURL(url).then(supported => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Alert.alert('Error', 'Maps application is not available');
          }
        });
      }
    } else {
      Alert.alert('Error', 'Location coordinates not available');
    }
  };

  // Handle sharing the venue
  const handleShareVenue = async () => {
    const venueId = venue?.id || venue?.fsq_id;
    if (venueId) {
      // Generate a deep link that will auto-save the venue
      const deepLink = `dinnafind://restaurant/${venueId}?save=true`;
      const message = `Check out ${venueName} - ${venueCategory}\n${venueAddress}\n\nSave to your bucket list: ${deepLink}`;
      try {
        await Share.share({
          message,
          url: deepLink,
          title: venueName,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to open share dialog');
      }
    } else {
      Alert.alert('Error', 'Unable to generate share link - venue ID not available');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
            <Ionicons color="#333333" name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {venueName}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Hero image section */}
        <View style={styles.heroContainer}>
          <Image resizeMode="cover" source={{ uri: heroImageUrl }} style={styles.heroImage} />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{venueCategory}</Text>
          </View>
          {/* Visited badge */}
          {isVenueVisited && (
            <View style={styles.visitedBadge}>
              <Ionicons color="#FFFFFF" name="checkmark-circle" size={20} />
              <Text style={styles.visitedBadgeText}>Visited</Text>
            </View>
          )}
          {/* Loading indicator for details */}
          {isLoadingDetails && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          )}
        </View>

        {/* Details section */}
        <View style={styles.detailsContainer}>
          <Text style={styles.venueName}>{venueName}</Text>

          <View style={styles.addressContainer}>
            <Ionicons color="#666666" name="location" size={18} style={styles.addressIcon} />
            <Text style={styles.venueAddress}>{venueAddress}</Text>
          </View>

          {/* Error message for details */}
          {detailsError && (
            <View style={styles.errorMessageContainer}>
              <Ionicons color="#FF4500" name="warning-outline" size={16} />
              <Text style={styles.errorMessageText}>{detailsError}</Text>
            </View>
          )}

          {/* Map section if coordinates are available */}
          {(() => {
            const lat =
              venueDetails?.geocodes?.main?.latitude ||
              venue.location?.lat ||
              venue.coordinates?.latitude ||
              venue.geocodes?.main?.latitude;
            const lng =
              venueDetails?.geocodes?.main?.longitude ||
              venue.location?.lng ||
              venue.coordinates?.longitude ||
              venue.geocodes?.main?.longitude;

            if (lat && lng) {
              return (
                <View style={styles.mapContainer}>
                  <MapView
                    style={{ height: 180, borderRadius: 8 }}
                    initialRegion={{
                      latitude: lat,
                      longitude: lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    pointerEvents="none" // Makes the map non-interactive, like a preview
                  >
                    <Marker coordinate={{ latitude: lat, longitude: lng }} title={venueName} />
                  </MapView>
                </View>
              );
            }
            return null;
          })()}

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, isVenueSaved && styles.savedActionButton]}
              onPress={handleSaveVenue}
            >
              <Ionicons
                color="#FFFFFF"
                name={isVenueSaved ? 'bookmark' : 'bookmark-outline'}
                size={24}
              />
              <Text style={styles.actionButtonText}>{isVenueSaved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShareVenue}>
              <Ionicons color="#FFFFFF" name="share-social-outline" size={24} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
              <Ionicons color="#FFFFFF" name="navigate-outline" size={24} />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
  backIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 16,
  },
  venueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressIcon: {
    marginRight: 8,
  },
  venueAddress: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
  },
  mapContainer: {
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FF4500',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  savedActionButton: {
    backgroundColor: '#4CAF50', // Green for already saved items
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 12,
    marginBottom: 24,
  },
  debugText: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 12,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  visitedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  visitedBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  errorMessageText: {
    fontSize: 14,
    color: '#FF4500',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});

export default DetailScreen;
