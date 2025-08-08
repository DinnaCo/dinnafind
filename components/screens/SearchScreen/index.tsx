import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { foursquareService } from '@/api/foursquare';
import { type Coordinates, type Venue } from '@/models/venue';
import { FoursquareCategory } from '@/config/foursquare';
import { useGeolocation } from '@/hooks/useGeolocation';

// Austin coordinates (default location)
const DEFAULT_COORDINATES: Coordinates = {
  latitude: 30.2672,
  longitude: -97.7431,
};

const DEFAULT_ICON = require('@/assets/images/default_88.png');

export const SearchScreen: React.FC = () => {
  const location = useGeolocation();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [venues, setVenues] = useState<any[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Search venues function - similar to the API test screen
  const searchVenues = useCallback(
    async (query: string) => {
      const currentCoordinates: Coordinates = {
        latitude: location.coordinates?.latitude || DEFAULT_COORDINATES.latitude,
        longitude: location.coordinates?.longitude || DEFAULT_COORDINATES.longitude,
      };

      setLoaded(false);

      try {
        const data = await foursquareService.searchNearbyVenues(
          currentCoordinates,
          query,
          [FoursquareCategory.Food], // Use the category ID for food
          50000,
          40
        );

        // Transform the results to match the expected format
        const transformedVenues = data.results.map((venue: Venue) => {
          // Create a venue object that matches the structure expected by renderItem
          return {
            id: venue.fsq_id || venue.id,
            name: venue.name,
            categories: venue.categories || [
              {
                name: 'Restaurant',
                icon: {
                  prefix: 'https://ss3.4sqi.net/img/categories_v2/food/default_',
                  suffix: '.png',
                },
              },
            ],
            location: {
              formattedAddress:
                venue.location?.formatted_address ||
                venue.location?.formattedAddress ||
                [venue.location?.address, venue.location?.locality, venue.location?.region]
                  .filter(Boolean)
                  .join(', '),
              lat: venue.geocodes?.main?.latitude || venue.location?.lat,
              lng: venue.geocodes?.main?.longitude || venue.location?.lng,
            },
            referralId: venue.fsq_id || venue.id, // Required for keyExtractor
          };
        });

        setVenues(transformedVenues);
        setLoaded(true);
      } catch (err: any) {
        console.error('Error fetching venues:', err);
        setVenues([]);
        setLoaded(true);
      }
    },
    [location.coordinates]
  );

  // Search handler - called when search input changes
  const searchHandler = (value: string) => {
    setSearchQuery(value);
    // Use debounced search with 300ms delay
    setTimeout(() => searchVenues(value), 300);
  };

  // Initial search on component mount
  useEffect(() => {
    // Perform a default search when the component mounts
    searchVenues('restaurants'); // You can change 'restaurants' to any default query
  }, [searchVenues]);

  // Key extractor for the FlatList
  const keyExtractor = (item: any, index: number) => {
    return item.referralId?.toString() || item.id?.toString() || index.toString();
  };

  // Render item for the FlatList
  const renderItem = ({ item }: { item: any }) => {
    // Get icon URL
    let iconUrl = DEFAULT_ICON;
    if (
      item.categories &&
      item.categories.length > 0 &&
      item.categories[0].icon &&
      item.categories[0].icon.prefix &&
      item.categories[0].icon.suffix
    ) {
      iconUrl = `${item.categories[0].icon.prefix}88${item.categories[0].icon.suffix}`;
    }

    const categoryName =
      item.categories && item.categories.length > 0 ? item.categories[0].name : 'Restaurant';

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => {
          const iconPrefix = item.categories && item.categories[0]?.icon?.prefix;
          const iconSuffix = item.categories && item.categories[0]?.icon?.suffix;
          router.push({
            pathname: '/detail',
            params: {
              venueId: item.id,
              ...(iconPrefix && iconSuffix ? { iconPrefix, iconSuffix } : {}),
            },
          });
        }}
      >
        <Image defaultSource={DEFAULT_ICON} source={{ uri: iconUrl }} style={styles.iconImage} />
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{categoryName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // Render the restaurant list based on state
  const renderRestaurantList = () => {
    if (loaded) {
      return (
        <View style={styles.listContainer}>
          <FlatList
            contentContainerStyle={styles.flatListContent}
            data={venues}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.statusText}>Loading Restaurants and Venues</Text>
        <ActivityIndicator color="#FF4500" size="large" style={styles.loader} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant Search</Text>
      </View>
      <View style={styles.listContainer}>
        <TextInput
          placeholder="Restaurants"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={text => searchHandler(text)}
        />
        {renderRestaurantList()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
  },
  listContainer: {
    flex: 1,
    padding: 4,
  },
  searchInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#333333',
  },
  loader: {
    marginTop: 10,
  },
  subtitleView: {
    flexDirection: 'row',
    paddingLeft: 2,
    paddingTop: 5,
  },
  ratingText: {
    paddingLeft: 2,
    color: 'blue',
  },
  iconImage: {
    width: 50,
    height: 50,
    backgroundColor: '#CCC',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
});

export default SearchScreen;
