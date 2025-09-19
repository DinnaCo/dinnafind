import type React from 'react';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
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
import { unifiedSearchService } from '@/api/unifiedSearch';
import { useAppSelector } from '@/store';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  addToBucketList,
  fetchBucketList,
} from '@/store/slices/bucketListSlice';
import { AnyAction } from 'redux';

import { getVenueDetails } from '@/api/venueDetailsService';
import type { BucketListItem } from '@/models/bucket-list';
import type { StandardizedVenueDetails } from '@/models/venue';
import { branchService } from '@/services/BranchService';

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default icon for when venue doesn't have photos
const DEFAULT_ICON =
  'https://ss3.4sqi.net/img/categories_v2/food/default_512.png';

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
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const params = useLocalSearchParams();
  const iconPrefix =
    typeof params.iconPrefix === 'string' ? params.iconPrefix : undefined;
  const iconSuffix =
    typeof params.iconSuffix === 'string' ? params.iconSuffix : undefined;

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
  const [fetchAttempted, setFetchAttempted] = useState<Set<string>>(new Set());

  // Parse the venue data from various sources FIRST
  let venue = null;

  // Priority 1: Check params.data
  if (params.data) {
    try {
      const decodedData = decodeURIComponent(params.data as string);
      venue = JSON.parse(decodedData);
      logger.info('Using decoded venue data from URL params:', venue);
    } catch (error) {
      logger.error('Error parsing encoded venue data:', error);
    }
  }
  // Priority 3: Try to parse from itemData param
  else if (params.itemData) {
    try {
      venue =
        typeof params.itemData === 'string'
          ? JSON.parse(params.itemData)
          : params.itemData;
      logger.info('Using itemData param');
    } catch (error) {
      logger.error('Error parsing venue data:', error);
    }
  }

  // If we still don't have venue data but have fetched basic data, use it
  if (!venue && basicVenueData) {
    venue = basicVenueData;
  }

  logger.info('Final venue data:', venue);

  // Get saved venues to check if this one is already saved (normalize IDs)
  const savedVenues = useAppSelector(
    (state) => state.bucketList.items,
  ) as BucketListItem[];

  // Determine venueId from all available sources
  const venueId = venueDetails?.fsq_id || basicVenueData?.id || venue?.fsq_id || venue?.id || params.venueId;

  let savedVenue: BucketListItem | undefined = undefined;
  if (venueId) {
    savedVenue = savedVenues.find(
      (item: import('@/models/bucket-list').BucketListItem) => {
        const itemId =
          typeof item.id === 'string' ? item.id.split('?')[0] : undefined;
        const venueItemId =
          item.venue && typeof item.venue.id === 'string'
            ? item.venue.id.split('?')[0]
            : undefined;
        const cleanVenueId = typeof venueId === 'string' ? venueId.split('?')[0] : venueId;
        return itemId === cleanVenueId || venueItemId === cleanVenueId;
      },
    );
  }
  const isVenueSaved = !!savedVenue;
  const isVenueVisited = !!(savedVenue && savedVenue.visitedAt);

  // Determine iconUrl: prefer Redux state (savedVenue), then category icon from venue data, then params, then fallback
  let iconUrl = DEFAULT_ICON;

  // First, try to get icon from saved venue
  if (savedVenue?.venue?.iconUrl) {
    iconUrl = savedVenue.venue.iconUrl;
  }
  // Second, try to get from venue or basicVenueData categories (Google Places with icon mapping)
  else if (venue?.categories?.[0]?.icon?.prefix && venue?.categories?.[0]?.icon?.suffix) {
    iconUrl = `${venue.categories[0].icon.prefix}88${venue.categories[0].icon.suffix}`;
    logger.info('📸 Using venue category icon:', iconUrl);
  }
  else if (basicVenueData?.categories?.[0]?.icon?.prefix && basicVenueData?.categories?.[0]?.icon?.suffix) {
    iconUrl = `${basicVenueData.categories[0].icon.prefix}88${basicVenueData.categories[0].icon.suffix}`;
    logger.info('📸 Using basicVenueData category icon:', iconUrl);
  }
  // Third, try params
  else if (iconPrefix && iconSuffix) {
    iconUrl = `${iconPrefix}88${iconSuffix}`;
  }
  // Fourth, try venueDetails iconUrl or category icon
  else if (venueDetails?.iconUrl) {
    iconUrl = venueDetails.iconUrl;
  }
  else if (
    venueDetails?.categories &&
    venueDetails.categories.length > 0 &&
    venueDetails.categories[0].icon &&
    venueDetails.categories[0].icon.prefix &&
    venueDetails.categories[0].icon.suffix
  ) {
    iconUrl = `${venueDetails.categories[0].icon.prefix}88${venueDetails.categories[0].icon.suffix}`;
    logger.info('📸 Using venueDetails category icon:', iconUrl);
  }

  // Fetch venue details when component mounts or when we only have an ID
  useEffect(() => {
    const fetchVenueData = async () => {
      // If we only have a venueId and no venue data, fetch basic data first
      if (!venue && params.venueId && !isLoadingBasicData && !basicVenueData) {
        const fetchKey = `basic-${params.venueId}`;

        // Prevent infinite loop - only attempt fetch once per ID
        if (fetchAttempted.has(fetchKey)) {
          logger.info('Skipping duplicate fetch attempt for:', params.venueId);
          return;
        }

        setIsLoadingBasicData(true);
        setFetchAttempted(prev => new Set(prev).add(fetchKey));

        try {
          logger.info('Fetching venue data for ID:', params.venueId);
          const details = await unifiedSearchService.getVenueDetails(
            params.venueId as string,
          );

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
            setVenueDetails(details as any);
          } else {
            logger.error('No details returned for venue ID:', params.venueId);
            setDetailsError('Venue not found. This may be an incompatible venue ID.');
          }
        } catch (error) {
          logger.error('Error fetching basic venue data:', error);
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
        logger.info('No venue ID available for fetching details');
        return;
      }

      // Skip if we already have venue details
      if (venueDetails && venueDetails.fsq_id === venueId) {
        return;
      }

      const fetchKey = `details-${venueId}`;

      // Prevent infinite loop - only attempt fetch once per ID
      if (fetchAttempted.has(fetchKey)) {
        logger.info('Skipping duplicate details fetch for:', venueId);
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError(null);
      setFetchAttempted(prev => new Set(prev).add(fetchKey));

      try {
        logger.info('Fetching venue details for ID:', venueId);
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
        logger.error('Error fetching venue details:', error);
        setDetailsError('Failed to load venue details');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchVenueData();
  }, [
    basicVenueData,
    fetchAttempted,
    iconUrl,
    isLoadingBasicData,
    params.venueId,
    venue,
    venueDetails,
    venueId,
  ]);

  // Auto-save logic: if autoSave param is true and not already saved, save after details load
  useEffect(() => {
    if (
      params.autoSave === 'true' &&
      !isVenueSaved &&
      venueDetails &&
      !autoSaveTriggered
    ) {
      const venueToSave = { ...venueDetails, iconUrl };
      dispatch(addToBucketList(venueToSave) as any);
      setAutoSaveTriggered(true);
      // Optionally, show a confirmation
      Alert.alert(
        'Saved',
        `${venueDetails.name} has been added to your bucket list!`,
      );
      // Refresh the bucket list after saving
      setTimeout(() => {
        dispatch(fetchBucketList() as unknown as AnyAction);
      }, 500);
    }
  }, [
    params.autoSave,
    isVenueSaved,
    venueDetails,
    autoSaveTriggered,
    iconUrl,
    dispatch,
  ]);

  // Fetch bucket list to make sure it's up to date
  useEffect(() => {
    dispatch(fetchBucketList() as unknown as AnyAction);
  }, [dispatch]);

  // Show loading state when fetching basic data
  if (isLoadingBasicData || (!venue && params.venueId)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        router.replace('/(tabs)');
      }
    };
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons color={colors.primary} name="alert-circle-outline" size={64} />
          <Text style={styles.errorText}>Venue data not available</Text>
          <Text style={styles.debugText}>
            Debug: params = {JSON.stringify(params)}
          </Text>
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
      : (venue.category ?? 'Restaurant');

  // Handle address - prioritize venue details, then fallback to basic venue data
  const venueAddress =
    (venueDetails?.location?.formatted_address ||
      venue.location?.formattedAddress ||
      venue.location?.formatted_address ||
      venue.address) ??
    'Address not available';

  const getHeroImageUrl = () => {
    logger.info('🔍 getHeroImageUrl called');
    logger.info('📸 venueDetails?.photos:', venueDetails?.photos);
    logger.info('📸 venue?.categories:', venue?.categories);

    // If we have venue details with photos, use the first photo
    if (venueDetails?.photos && venueDetails.photos.length > 0) {
      const photo = venueDetails.photos[0];

      // Validate photo structure
      if (!photo.prefix || !photo.suffix) {
        if (
          venue.categories &&
          venue.categories.length > 0 &&
          venue.categories[0].icon &&
          venue.categories[0].icon.prefix &&
          venue.categories[0].icon.suffix
        ) {
          const fallbackUrl = `${venue.categories[0].icon.prefix}512${venue.categories[0].icon.suffix}`;
          logger.info('📸 Falling back to category icon:', fallbackUrl);
          return fallbackUrl;
        }
        return DEFAULT_ICON;
      }

      // Google Places photos: prefix contains full URL with params, suffix is the API key
      // Other photos: prefix needs a size inserted before suffix
      // Detect which type by checking the hostname of the prefix URL
      let isGooglePlacesPhoto = false;
      try {
        const parsedUrl = new URL(photo.prefix);
        const googlePlacesHosts = ['maps.googleapis.com', 'places.googleapis.com'];
        isGooglePlacesPhoto = googlePlacesHosts.includes(parsedUrl.hostname);
      } catch (e) {
        // If parsing fails, assume CDN photo format
        isGooglePlacesPhoto = false;
      }

      let photoUrl = '';

      if (isGooglePlacesPhoto) {
        // Google Places: just concatenate prefix + suffix (API key)
        photoUrl = `${photo.prefix}${photo.suffix}`;
        logger.info('📸 Using Google Places photo:', photoUrl);
      } else {
        // CDN photos: insert size between prefix and suffix
        const sizes = ['original', '800', '600', '400'];

        for (const size of sizes) {
          photoUrl = `${photo.prefix}${size}${photo.suffix}`;
          logger.info(`📸 Trying photo size ${size}:`, photoUrl);

          // If we have width/height info, prefer a size that's close to what we want
          if (photo.width && photo.height) {
            if (
              size === 'original' ||
              (photo.width >= 600 && photo.height >= 600)
            ) {
              break;
            }
          } else {
            // If no size info, use original
            if (size === 'original') {
              break;
            }
          }
        }
      }

      logger.info('📸 Final photo URL:', photoUrl);
      return photoUrl;
    }

    // Fallback to category icon
    if (
      venue.categories &&
      venue.categories.length > 0 &&
      venue.categories[0].icon &&
      venue.categories[0].icon.prefix &&
      venue.categories[0].icon.suffix
    ) {
      logger.info('📸 Using category icon as fallback');
      // Use the highest resolution icon (512px)
      const iconUrl = `${venue.categories[0].icon.prefix}512${venue.categories[0].icon.suffix}`;

      return iconUrl;
    }

    logger.info('📸 Using default icon');
    return DEFAULT_ICON;
  };

  const heroImageUrl = getHeroImageUrl();

  // Handle saving venue to bucket list
  const handleSaveVenue = () => {
    logger.info('Save button pressed, venue:', venue);

    if (!isVenueSaved) {
      const venueToSave = { ...venueDetails, iconUrl };
      logger.info('🗺️ venueToSave🗺️🗺️', JSON.stringify(venueToSave));

      dispatch(addToBucketList(venueToSave) as any);
      Alert.alert('Saved', `${venueName} has been added to your bucket list!`);

      // Refresh the bucket list after saving
      setTimeout(() => {
        dispatch(fetchBucketList() as unknown as AnyAction);
      }, 500);
    } else {
      Alert.alert(
        'Already Saved',
        `${venueName} is already in your bucket list.`,
      );
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
        Linking.canOpenURL(url).then((supported) => {
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
    // Use venueId from any available source
    const shareVenueId = venueId;

    if (!shareVenueId) {
      Alert.alert('Error', 'Venue information not available');
      return;
    }

    try {
      // Create a Branch universal link
      logger.info('[Share] Creating Branch link for venue:', shareVenueId);

      const branchLink = await branchService.createVenueLink(
        shareVenueId,
        venueName,
        {
          channel: 'share',
          feature: 'venue_share',
          data: {
            venueId: shareVenueId,
            venueName: venueName,
            venueCategory: venueCategory,
            venueAddress: venueAddress,
            autoSave: true,
            type: 'restaurant',
          },
        }
      );

      logger.info('[Share] Branch link created:', branchLink);

      // Prepare share message
      const message = `Check out ${venueName}${venueCategory ? ` - ${venueCategory}` : ''}${venueAddress ? `\n${venueAddress}` : ''}\n\nSave it to your bucket list: ${branchLink}`;

      // Share using Branch universal link
      await Share.share({
        message: message,
        url: branchLink,
        title: `Check out ${venueName} on DinnaFind`,
      });

      logger.info('[Share] Share dialog opened successfully');
    } catch (error) {
      logger.error('[Share] Failed to create shareable link:', error);
      Alert.alert(
        'Share Failed',
        'Unable to create a shareable link. Please check your internet connection and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => router.back()}
          >
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {venueName}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Hero image section */}
        <View style={styles.heroContainer}>
          {/* Placeholder image (always rendered, shown when hero image fails) */}
          <Image
            resizeMode="cover"
            source={{ uri: iconUrl }}
            style={[
              styles.heroImage,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
              },
            ]}
            onError={(e) =>
              logger.info('Placeholder image error:', e.nativeEvent.error)
            }
          />

          {/* Hero image (overlays placeholder when loaded) */}
          <Image
            resizeMode="cover"
            source={{ uri: heroImageUrl }}
            style={[
              styles.heroImage,
              {
                opacity: imageLoaded ? 1 : 0,
                zIndex: 2,
              },
            ]}
            onLoad={() => {
              logger.info('✅ Hero image loaded successfully');
              setImageLoaded(true);
            }}
            onError={(e) => {
              logger.error(
                '❌ Failed to load hero image:',
                e.nativeEvent.error,
              );
              logger.info('Attempted URL:', heroImageUrl);
              logger.info('📸 Falling back to placeholder image');

              // Try to validate if the URL is accessible
              if (
                heroImageUrl &&
                heroImageUrl !== DEFAULT_ICON &&
                heroImageUrl !== iconUrl
              ) {
                logger.info('🔍 Testing hero image URL accessibility...');
                fetch(heroImageUrl, { method: 'HEAD' })
                  .then((response) => {
                    logger.info(
                      '📸 Hero image URL response status:',
                      response.status,
                    );
                  })
                  .catch((error) => {
                    logger.info('📸 Hero image URL fetch error:', error);
                  });
              }

              // Keep placeholder visible on error
            }}
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
            <Ionicons
              color={colors.textSecondary}
              name="location"
              size={18}
              style={styles.addressIcon}
            />
            <Text style={styles.venueAddress}>{venueAddress}</Text>
          </View>

          {/* Error message for details */}
          {detailsError && (
            <View style={styles.errorMessageContainer}>
              <Ionicons color={colors.primary} name="warning-outline" size={16} />
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
                    <Marker
                      coordinate={{ latitude: lat, longitude: lng }}
                      title={venueName}
                    />
                  </MapView>
                </View>
              );
            }
            return null;
          })()}

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isVenueSaved && styles.savedActionButton,
              ]}
              onPress={handleSaveVenue}
            >
              <Ionicons
                color="#FFFFFF"
                name={isVenueSaved ? 'bookmark' : 'bookmark-outline'}
                size={24}
              />
              <Text style={styles.actionButtonText}></Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareVenue}
            >
              <Ionicons color="#FFFFFF" name="share-social-outline" size={24} />
              <Text style={styles.actionButtonText}></Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetDirections}
            >
              <Ionicons color="#FFFFFF" name="navigate-outline" size={24} />
              <Text style={styles.actionButtonText}></Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
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
    backgroundColor: colors.grey5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.grey5,
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
    color: colors.text,
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
    color: colors.textSecondary,
  },
  mapContainer: {
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4, // Add some container padding
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 0, // Allow flex shrinking
  },
  savedActionButton: {
    backgroundColor: colors.success, // Green for already saved items
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    flexShrink: 1, // Allow text to shrink if needed
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 24,
  },
  debugText: {
    fontSize: 12,
    color: colors.grey3,
    marginBottom: 12,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
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
    backgroundColor: colors.isDark ? 'rgba(255, 69, 0, 0.1)' : '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.isDark ? 'rgba(255, 69, 0, 0.3)' : '#FFE5E5',
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
