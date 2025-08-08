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

import { getVenueDetails, StandardizedVenueDetails } from '@/api/venueDetailsService';

import type { BucketListItem } from '@/models/bucket-list';

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default icon for when venue doesn't have photos - using the highest resolution
const DEFAULT_ICON = 'https://ss3.4sqi.net/img/categories_v2/food/default_512.png';

// Update VenueDetails interface to make rating optional
interface VenueDetails {
  fsq_id: string;
  name: string;
  geocodes?: {
    main?: {
      latitude?: number;
      longitude?: number;
    };
  };
  location: {
    formatted_address?: string;
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
  };
  photos?: {
    id: string;
    created_at?: string;
    prefix?: string;
    suffix?: string;
    width?: number;
    height?: number;
    classifications?: string[];
  }[];
  rating?: number;
  iconUrl?: string;
  categories?: any[];
}

export const DetailScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const iconPrefix = typeof params.iconPrefix === 'string' ? params.iconPrefix : undefined;
  const iconSuffix = typeof params.iconSuffix === 'string' ? params.iconSuffix : undefined;

  const dispatch = useDispatch();

  // State for venue details
  const [venueDetails, setVenueDetails] = useState<VenueDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Add these state variables at the top if not already present
  const [basicVenueData, setBasicVenueData] = useState<any>(null);
  const [isLoadingBasicData, setIsLoadingBasicData] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [autoSaveTriggered, setAutoSaveTriggered] = useState(false);

  // Get saved venues to check if this one is already saved (normalize IDs)
  const savedVenues = useAppSelector(state => state.bucketList.items) as BucketListItem[];
  let savedVenue: BucketListItem | undefined = undefined;
  const venueId = venueDetails?.fsq_id || basicVenueData?.id;
  if (venueId) {
    savedVenue = savedVenues.find((item: import('@/models/bucket-list').BucketListItem) => {
      const itemId = typeof item.id === 'string' ? item.id.split('?')[0] : undefined;
      const venueItemId =
        item.venue && typeof item.venue.id === 'string' ? item.venue.id.split('?')[0] : undefined;
      return itemId === venueId || venueItemId === venueId;
    });
  }
  const isVenueSaved = !!savedVenue;
  const isVenueVisited = !!(savedVenue && savedVenue.visitedAt);

  // Determine iconUrl: prefer Redux state (savedVenue), then params, then venueDetails, then fallback
  let iconUrl = DEFAULT_ICON;
  if (savedVenue?.venue?.iconUrl) {
    iconUrl = savedVenue.venue.iconUrl;
  } else if (iconPrefix && iconSuffix) {
    iconUrl = `${iconPrefix}88${iconSuffix}`;
  } else if (venueDetails?.iconUrl) {
    iconUrl = venueDetails.iconUrl;
  } else if (
    venueDetails?.categories &&
    venueDetails.categories.length > 0 &&
    venueDetails.categories[0].icon &&
    venueDetails.categories[0].icon.prefix &&
    venueDetails.categories[0].icon.suffix
  ) {
    iconUrl = `${venueDetails.categories[0].icon.prefix}88${venueDetails.categories[0].icon.suffix}`;
  }

  // Parse the venue data from various sources
  let venue = null;

  // Priority 1: Check Redux store
  if (params.data) {
    try {
      const decodedData = decodeURIComponent(params.data as string);
      venue = JSON.parse(decodedData);
      console.log('Using decoded venue data from URL params:', venue);
    } catch (error) {
      console.error('Error parsing encoded venue data:', error);
    }
  }
  // Priority 3: Try to parse from itemData param
  else if (params.itemData) {
    try {
      venue = typeof params.itemData === 'string' ? JSON.parse(params.itemData) : params.itemData;
      console.log('Using itemData param');
    } catch (error) {
      console.error('Error parsing venue data:', error);
    }
  }

  // If we still don't have venue data but have fetched basic data, use it
  if (!venue && basicVenueData) {
    venue = basicVenueData;
  }

  console.log('Final venue data:', venue);

  // Fetch venue details when component mounts or when we only have an ID
  useEffect(() => {
    const fetchVenueData = async () => {
      // If we only have a venueId and no venue data, fetch basic data first
      if (!venue && params.venueId && !isLoadingBasicData && !basicVenueData) {
        setIsLoadingBasicData(true);
        try {
          console.log('Fetching venue data for ID:', params.venueId);
          const details = await foursquareV3Service.getPlacesDetails(params.venueId as string);

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

      // Use the top-level venueId
      if (!venueId) {
        console.log('No venue ID available for fetching details');
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
        const details = await getVenueDetails(venueId);

        if (details) {
          const venueDetailsObj = {
            ...details,
            iconUrl,
          };
          setVenueDetails(venueDetailsObj);
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
  }, [iconUrl, venueId]);

  // Auto-save logic: if autoSave param is true and not already saved, save after details load
  useEffect(() => {
    if (params.autoSave === 'true' && !isVenueSaved && venueDetails && !autoSaveTriggered) {
      const venueToSave = { ...venueDetails, iconUrl };
      dispatch(addToBucketList(venueToSave) as any);
      setAutoSaveTriggered(true);
      // Optionally, show a confirmation
      Alert.alert('Saved', `${venueDetails.name} has been added to your bucket list!`);
      // Refresh the bucket list after saving
      setTimeout(() => {
        dispatch(fetchBucketList() as unknown as AnyAction);
      }, 500);
    }
  }, [params.autoSave, isVenueSaved, venueDetails, autoSaveTriggered, iconUrl, dispatch]);

  // Fetch bucket list to make sure it's up to date
  useEffect(() => {
    dispatch(fetchBucketList() as unknown as AnyAction);
  }, [dispatch]);

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
    const handleGoBack = () => {
      // Try to go back, otherwise go home
      try {
        router.back();
      } catch {
        router.replace('/');
      }
    };
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons color="#FF4500" name="alert-circle-outline" size={64} />
          <Text style={styles.errorText}>Venue data not available</Text>
          <Text style={styles.debugText}>Debug: params = {JSON.stringify(params)}</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
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

  const getHeroImageUrl = () => {
    // If we have venue details with photos, use the first photo
    if (venueDetails?.photos && venueDetails.photos.length > 0) {
      const photo = venueDetails.photos[0];
      // Use a large size for the hero image (original size or 800px)
      const size = photo.width && photo.width > 800 ? 'original' : '800';
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

  // Handle saving venue to bucket list
  const handleSaveVenue = () => {
    console.log('Save button pressed, venue:', venue);

    if (!isVenueSaved) {
      const venueToSave = { ...venueDetails, iconUrl };
      console.log('🗺️ venueToSave🗺️🗺️', JSON.stringify(venueToSave));

      dispatch(addToBucketList(venueToSave) as any);
      Alert.alert('Saved', `${venueName} has been added to your bucket list!`);

      // Refresh the bucket list after saving
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
    const deepLink = `dinnafind://restaurant/${venueDetails?.fsq_id}?autoSave=true`;
    const message = `Check out ${venueName} - ${venueCategory}\n${venueAddress}\n\nSave to your bucket list: ${deepLink}`;
    try {
      await Share.share({
        url: deepLink,
        title: venueName,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to open share dialog');
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
          {/* Placeholder image (shown until real image loads) */}
          {!imageLoaded && (
            <Image resizeMode="cover" source={{ uri: iconUrl }} style={styles.heroImage} />
          )}
          {/* Real image (shown after load) */}
          <Image
            resizeMode="cover"
            source={{ uri: heroImageUrl }}
            style={[styles.heroImage]}
            onLoad={() => setImageLoaded(true)}
          />

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
