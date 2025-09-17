import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { logger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { unifiedSearchService } from '@/api/unifiedSearch';
import { type Coordinates } from '@/models/venue';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useThemeColors } from '@/hooks/useThemeColors';

// Austin coordinates (default location)
const DEFAULT_COORDINATES: Coordinates = {
  latitude: 30.2672,
  longitude: -97.7431,
};

const DEFAULT_ICON = require('@/assets/images/default_88.png');

// Distance options for filter (in meters, displayed as miles)
// Values are progressively larger to ensure more results
// Note: Google Places API max radius is 50,000 meters (~31 miles)
const DISTANCE_OPTIONS = [
  { label: '1mi', value: 1609, displayText: '1mi' },
  { label: '3mi', value: 4828, displayText: '3mi' },
  { label: '5mi', value: 8047, displayText: '5mi' },
  { label: '10mi', value: 16093, displayText: '10mi' },
  { label: '25mi', value: 40234, displayText: '25mi' },
  { label: 'Any distance', value: 50000, displayText: 'Any distance' }, // Google Places API max
];

interface SearchCache {
  [key: string]: {
    venues: any[];
    timestamp: number;
  };
}

function SearchScreen() {
  const colors = useThemeColors();
  const location = useGeolocation();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [venues, setVenues] = useState<any[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchRadius, setSearchRadius] = useState<number>(1609); // Start with 1mi
  const [searchCache, setSearchCache] = useState<SearchCache>({});

  // Refs for timeouts
  const searchTimeout = useRef<number | null>(null);
  const radiusTimeout = useRef<number | null>(null);

  // Generate cache key for search + radius combination
  const getCacheKey = (query: string, radius: number) => {
    return `${query.toLowerCase().trim()}_${radius}`;
  };

  // Check if cached data is still valid (5 minutes)
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < 5 * 60 * 1000; // 5 minutes
  };

  // Get formatted distance text for header
  const getDistanceText = (radius: number) => {
    const option = DISTANCE_OPTIONS.find((opt) => opt.value === radius);
    return option?.displayText || `${(radius * 0.000621371).toFixed(1)}mi`;
  };

  // Search venues function with caching
  const searchVenues = useCallback(
    async (query: string, radius: number = searchRadius) => {
      const currentCoordinates: Coordinates = {
        latitude:
          location.coordinates?.latitude || DEFAULT_COORDINATES.latitude,
        longitude:
          location.coordinates?.longitude || DEFAULT_COORDINATES.longitude,
      };

      const cacheKey = getCacheKey(query, radius);

      // Check cache first
      if (
        searchCache[cacheKey] &&
        isCacheValid(searchCache[cacheKey].timestamp)
      ) {
        logger.info(
          `📦 Using cached results for: ${query} within ${getDistanceText(radius)}`,
        );
        setVenues(searchCache[cacheKey].venues);
        setLoaded(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoaded(false);

      try {
        logger.info(
          `🔍 Searching for: ${query || 'restaurants'} within ${getDistanceText(radius)}`,
        );

        const data = await unifiedSearchService.searchNearbyVenues(
          currentCoordinates,
          query || 'restaurant',
          undefined, // No category filter
          radius,
          50, // Increased limit for better results
        );

        logger.info(
          `✅ Search results: ${data.results?.length || 0} venues found within ${getDistanceText(radius)}`,
        );

        // Transform and sort results
        const transformedVenues = (data.results || [])
          .map((venue: any) => ({
            id: venue.fsq_id || venue.id || venue.place_id,
            fsq_id: venue.fsq_id || venue.id || venue.place_id,
            name: venue.name || 'Unknown Restaurant',
            categories: venue.categories || [],
            location: venue.location || {},
            geocodes: venue.geocodes,
            distance: venue.distance,
            rating: venue.rating || 0,
            referralId: venue.fsq_id || venue.id || venue.place_id,
          }))
          // Sort by rating first, then distance
          .sort((a: any, b: any) => {
            if (a.rating && b.rating && a.rating !== b.rating) {
              return b.rating - a.rating; // Higher rating first
            }
            return (a.distance || 0) - (b.distance || 0); // Closer distance first
          });

        // Cache the results
        setSearchCache((prev) => ({
          ...prev,
          [cacheKey]: {
            venues: transformedVenues,
            timestamp: Date.now(),
          },
        }));

        setVenues(transformedVenues);
        setLoaded(true);
      } catch (err: any) {
        logger.error('❌ Error fetching venues:', err);
        setVenues([]);
        setLoaded(true);
      } finally {
        setLoading(false);
      }
    },
    [
      location.coordinates?.latitude,
      location.coordinates?.longitude,
      searchCache,
      searchRadius,
    ],
  );

  // Navigate to venue details
  const navigateToVenue = (item: any) => {
    const venueName = item.name || 'Unknown Restaurant';
    logger.info('Navigating to venue:', venueName);

    const venueId = item.fsq_id || item.id;

    if (venueId) {
      // Pass the complete venue data so detail view can display immediately
      const venueData = encodeURIComponent(JSON.stringify(item));

      // Use href string format to avoid router warning
      const href = `/detail?venueId=${String(venueId)}&data=${venueData}`;
      router.push(href as any);
    }
  };

  // Search handler with debounce
  const searchHandler = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // Clear any existing timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      // Set new timeout for debounced search
      searchTimeout.current = setTimeout(() => {
        const queryToSearch = value.length > 0 ? value : 'restaurants';
        searchVenues(queryToSearch, searchRadius);
      }, 300);
    },
    [searchVenues, searchRadius],
  );

  // Radius change handler with debounce
  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      setSearchRadius(newRadius);

      // Clear any existing timeout
      if (radiusTimeout.current) {
        clearTimeout(radiusTimeout.current);
      }

      // Debounce radius changes
      radiusTimeout.current = setTimeout(() => {
        const queryToSearch =
          searchQuery.length > 0 ? searchQuery : 'restaurants';
        searchVenues(queryToSearch, newRadius);
      }, 200); // Shorter debounce for radius changes
    },
    [searchQuery, searchVenues],
  );

  // Initial search on component mount
  useEffect(() => {
    searchVenues('restaurants', searchRadius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRadius]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      if (radiusTimeout.current) {
        clearTimeout(radiusTimeout.current);
      }
    };
  }, []);

  // Key extractor for the FlatList
  const keyExtractor = (item: any, index: number) => {
    return (
      item.referralId?.toString() || item.id?.toString() || index.toString()
    );
  };

  // Render distance filter chips
  const renderDistanceFilter = () => {
    return (
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {DISTANCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterChip,
                searchRadius === option.value && styles.filterChipActive,
              ]}
              onPress={() => handleRadiusChange(option.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  searchRadius === option.value && styles.filterChipTextActive,
                ]}
              >
                {option.label || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render results header with count and distance
  const renderResultsHeader = () => {
    if (!loaded || loading) return null;

    const resultCount = venues.length;
    const distanceText = getDistanceText(searchRadius);

    return (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsHeaderText}>
          {resultCount} restaurant{resultCount !== 1 ? 's' : ''} within{' '}
          {distanceText}
        </Text>
        {resultCount > 0 && searchRadius < 50000 && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => {
              const nextRadiusIndex =
                DISTANCE_OPTIONS.findIndex(
                  (opt) => opt.value === searchRadius,
                ) + 1;
              if (nextRadiusIndex < DISTANCE_OPTIONS.length) {
                handleRadiusChange(DISTANCE_OPTIONS[nextRadiusIndex].value);
              }
            }}
          >
            <Text style={styles.expandButtonText}>
              Show more distant results
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#FF4500" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render item for the FlatList with safe text handling
  const renderItem = ({ item }: { item: any }) => {
    if (!item) {
      return null;
    }

    // Safely extract and validate all values
    const category = item?.categories?.[0];
    const iconUrl =
      category?.icon?.prefix && category?.icon?.suffix
        ? `${category.icon.prefix}88${category.icon.suffix}`
        : null;

    // Ensure all text values are strings and not undefined/null
    const categoryName =
      typeof category?.name === 'string' && category.name.length > 0
        ? category.name
        : 'Restaurant';
    const itemName =
      typeof item?.name === 'string' && item.name.length > 0
        ? item.name
        : 'Unknown Restaurant';
    const formattedAddress =
      typeof item?.location?.formatted_address === 'string' &&
      item.location.formatted_address.length > 0
        ? item.location.formatted_address
        : '';

    // Safely handle rating
    const hasValidRating =
      typeof item?.rating === 'number' &&
      !isNaN(item.rating) &&
      item.rating > 0;
    const ratingText = hasValidRating ? String(item.rating.toFixed(1)) : '';

    // Safely handle distance (convert meters to miles)
    const hasValidDistance =
      typeof item?.distance === 'number' &&
      !isNaN(item.distance) &&
      item.distance > 0;
    const distanceInMiles = hasValidDistance
      ? (item.distance * 0.000621371).toFixed(1)
      : '0';
    const distanceText = hasValidDistance ? `${distanceInMiles} mi away` : '';

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => navigateToVenue(item)}
      >
        <Image
          source={iconUrl ? { uri: iconUrl } : DEFAULT_ICON}
          style={styles.iconImage}
          defaultSource={DEFAULT_ICON}
        />
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{itemName}</Text>
            {hasValidRating && ratingText.length > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{ratingText}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemSubtitle}>{categoryName}</Text>
          {formattedAddress.length > 0 && (
            <Text style={styles.itemAddress} numberOfLines={1}>
              {formattedAddress}
            </Text>
          )}
          {hasValidDistance && distanceText.length > 0 && (
            <Text style={styles.itemDistance}>{distanceText}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // Render the restaurant list based on state
  const renderRestaurantList = () => {
    if (loading && !loaded) {
      const distanceText = getDistanceText(searchRadius);
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.statusText}>
            Finding restaurants within {distanceText}...
          </Text>
          <ActivityIndicator
            color="#FF4500"
            size="large"
            style={styles.loader}
          />
        </View>
      );
    }

    if (loaded && venues.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#CCCCCC" />
          <Text style={styles.statusText}>No restaurants found</Text>
          <Text style={styles.subtitleText}>
            Try expanding your search distance or different keywords
          </Text>
          {searchRadius < 50000 && (
            <TouchableOpacity
              style={styles.expandSearchButton}
              onPress={() => {
                const nextRadiusIndex =
                  DISTANCE_OPTIONS.findIndex(
                    (opt) => opt.value === searchRadius,
                  ) + 1;
                if (nextRadiusIndex < DISTANCE_OPTIONS.length) {
                  handleRadiusChange(DISTANCE_OPTIONS[nextRadiusIndex].value);
                }
              }}
            >
              <Text style={styles.expandSearchButtonText}>
                Search wider area
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <>
        {renderResultsHeader()}
        <FlatList
          contentContainerStyle={styles.flatListContent}
          data={venues}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
        />
      </>
    );
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={20}
            color={colors.grey3}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search restaurants..."
            placeholderTextColor={colors.grey3}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={searchHandler}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search restaurants"
            accessibilityHint="Enter restaurant name to search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => searchHandler('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              accessibilityHint="Double tap to clear search text"
            >
              <Ionicons name="close-circle" size={20} color={colors.grey3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Distance Filter */}
      {renderDistanceFilter()}

      <View style={styles.listContainer}>{renderRestaurantList()}</View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey5,
  },
  header: {
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey5,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.text,
  },

  // Distance Filter Styles
  filterContainer: {
    backgroundColor: colors.background,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.grey5,
    borderWidth: 1,
    borderColor: colors.grey4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grey2,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Results Header Styles
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsHeaderText: {
    fontSize: 14,
    color: colors.grey2,
    fontWeight: '500',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },

  listContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  statusText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    color: colors.text,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: colors.grey2,
    textAlign: 'center',
    marginBottom: 16,
  },
  expandSearchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 44,
  },
  expandSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginTop: 10,
  },

  // List Item Styles (Enhanced)
  iconImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.grey5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.grey5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.grey2,
    marginTop: 2,
  },
  itemAddress: {
    fontSize: 12,
    color: colors.grey3,
    marginTop: 2,
  },
  itemDistance: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
});

export { SearchScreen };
export default SearchScreen;
