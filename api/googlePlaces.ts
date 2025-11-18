import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import type { Venue, VenueSearchParams, VenueSearchResponse, Coordinates } from '@/models/venue';
import { logger } from '@/utils/logger';
import { getIconForGooglePlaceType } from '@/utils/categoryIconMapper';

/**
 * Google Places API Service
 * Uses the new Google Places API (successor to Places API)
 * Documentation: https://developers.google.com/maps/documentation/places/web-service/overview
 */
class GooglePlacesService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL = 'https://places.googleapis.com/v1';

  constructor() {
    // Try multiple sources for the API key
    this.apiKey =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
      process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
      '';

    logger.info('[GooglePlaces] Environment check:', {
      hasConstantsExtra: !!Constants.expoConfig?.extra,
      hasProcessEnv: !!process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
      constantsValue: Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.substring(0, 10),
      processEnvValue: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.substring(0, 10),
    });

    if (!this.apiKey) {
      logger.warn('[GooglePlaces] ⚠️ API key not configured');
      logger.warn('[GooglePlaces] Checked Constants.expoConfig.extra and process.env');
    } else {
      logger.info('[GooglePlaces] ✅ API key configured successfully!');
      logger.info('[GooglePlaces] API key length:', this.apiKey.length);
      logger.info('[GooglePlaces] API key first 10 chars:', this.apiKey.substring(0, 10));
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        // Field mask - specify only fields we need to avoid billing issues
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.primaryType',
      },
    });

    // Add response interceptor for better error logging
    this.client.interceptors.response.use(
      response => response,
      error => {
        logger.error('[GooglePlaces] API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        throw error;
      }
    );
  }

  /**
   * Check if Google Places API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  /**
   * Search for nearby places using Text Search
   */
  async searchNearbyVenues(
    coordinates: Coordinates,
    query?: string,
    radius: number = 5000,
    limit: number = 20
  ): Promise<VenueSearchResponse> {
    try {
      if (!this.isConfigured()) {
        const error = new Error('Google Places API key not configured');
        logger.error('[GooglePlaces] Configuration error:', error);
        throw error;
      }

      logger.info('[GooglePlaces] Searching nearby venues', {
        coordinates,
        query,
        radius,
        limit,
        apiKeyConfigured: true,
        baseURL: this.baseURL,
      });

      const searchQuery = query || 'restaurant';

      // Google Places API has a maximum radius of 50,000 meters
      const effectiveRadius = Math.min(radius, 50000);

      logger.info('[GooglePlaces] Using radius:', {
        requested: radius,
        effective: effectiveRadius,
        capped: radius > 50000,
      });

      // Use Text Search (New) API
      const requestBody = {
        textQuery: searchQuery,
        locationBias: {
          circle: {
            center: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            },
            radius: effectiveRadius,
          },
        },
        maxResultCount: Math.min(limit, 20), // Google max is 20 per request
        rankPreference: 'DISTANCE',
        languageCode: 'en',
      };

      logger.info('[GooglePlaces] Request details:', {
        url: `${this.baseURL}/places:searchText`,
        body: requestBody,
      });

      // Use native fetch instead of axios since we verified it works
      const response = await fetch(`${this.baseURL}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.primaryType',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      logger.info('[GooglePlaces] Search successful', {
        resultsCount: data.places?.length || 0,
      });

      return this.transformGooglePlacesToVenues(data.places || [], coordinates);
    } catch (error: any) {
      logger.error('[GooglePlaces] Search error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        isNetworkError: error.message?.includes('Network request failed'),
        code: error.code,
      });

      // Provide helpful error messages
      if (error.message?.includes('Network request failed')) {
        logger.error('[GooglePlaces] Network error - check:');
        logger.error('  1. Google Cloud billing is enabled');
        logger.error('  2. Places API (New) is enabled');
        logger.error('  3. API key has no restrictions or allows Places API');
      }

      // Return empty results on error so fallback can be used
      return {
        results: [],
        totalResults: 0,
      };
    }
  }

  /**
   * Get recommended/top-rated venues nearby
   */
  async getRecommendedVenues(
    coordinates: Coordinates,
    limit: number = 20
  ): Promise<VenueSearchResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Google Places API key not configured');
      }

      logger.info('[GooglePlaces] Getting recommended venues', { coordinates, limit });

      // Use native fetch instead of axios
      const requestBody = {
        includedTypes: ['restaurant', 'cafe', 'bar'],
        maxResultCount: Math.min(limit, 20),
        locationRestriction: {
          circle: {
            center: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            },
            radius: 5000, // 5km radius for recommendations
          },
        },
        rankPreference: 'POPULARITY', // Get popular places
        languageCode: 'en',
      };

      const response = await fetch(`${this.baseURL}/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.primaryType',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      logger.info('[GooglePlaces] Recommendations retrieved', {
        resultsCount: data.places?.length || 0,
      });

      const venues = this.transformGooglePlacesToVenues(
        data.places || [],
        coordinates
      );

      // Sort by rating (descending)
      venues.results.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      return venues;
    } catch (error: any) {
      logger.error('[GooglePlaces] Recommendations error:', error);

      return {
        results: [],
        totalResults: 0,
      };
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<Venue | null> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Google Places API key not configured');
      }

      logger.info('[GooglePlaces] Getting place details', { placeId });

      // Use native fetch instead of axios
      const response = await fetch(`${this.baseURL}/places/${placeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'priceLevel',
            'currentOpeningHours',
            'regularOpeningHours',
            'primaryType',
            'types',
            'nationalPhoneNumber',
            'internationalPhoneNumber',
            'websiteUri',
            'photos',
            'editorialSummary',
          ].join(','),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      logger.info('[GooglePlaces] Place details retrieved');

      const venues = this.transformGooglePlacesToVenues([data]);
      return venues.results[0] || null;
    } catch (error: any) {
      logger.error('[GooglePlaces] Place details error:', error);
      return null;
    }
  }

  /**
   * Search venues with custom parameters
   */
  async searchVenues(params: VenueSearchParams): Promise<VenueSearchResponse> {
    try {
      const [lat, lng] = params.ll.split(',').map(Number);

      return await this.searchNearbyVenues(
        { latitude: lat, longitude: lng },
        params.query,
        params.radius || 5000,
        params.limit || 20
      );
    } catch (error: any) {
      logger.error('[GooglePlaces] Search venues error:', error);

      return {
        results: [],
        totalResults: 0,
      };
    }
  }

  /**
   * Transform Google Places API response to our Venue format
   */
  private transformGooglePlacesToVenues(
    places: any[],
    userLocation?: Coordinates
  ): VenueSearchResponse {
    const venues: Venue[] = places.map(place => {
      // Calculate distance if user location provided
      let distance: number | undefined;
      if (userLocation && place.location) {
        distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          place.location.latitude,
          place.location.longitude
        );
      }

      // Extract primary type/category
      const primaryType = place.primaryType || place.types?.[0] || 'restaurant';

      // Get icon for this place type
      const categoryIcon = getIconForGooglePlaceType(primaryType);

      // Map Google price level (0-4) to our format
      let price;
      if (place.priceLevel !== undefined && place.priceLevel !== null) {
        const tier = place.priceLevel;
        price = {
          tier,
          message: '$'.repeat(tier),
          currency: 'USD',
        };
      }

      // Transform opening hours
      let hours;
      if (place.currentOpeningHours || place.regularOpeningHours) {
        const openingHours = place.currentOpeningHours || place.regularOpeningHours;
        hours = {
          openNow: openingHours.openNow,
          displayHours: openingHours.weekdayDescriptions || [],
        };
      }

      // Transform photos
      const photos = (place.photos || []).map((photo: any, index: number) => ({
        id: `${place.id}_photo_${index}`,
        prefix: `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=1000&maxWidthPx=1000&key=`,
        suffix: this.apiKey,
        width: photo.widthPx,
        height: photo.heightPx,
      }));

      return {
        fsq_id: place.id || place.name, // Use Google Place ID
        name: place.displayName?.text || place.name || 'Unknown',
        location: {
          address: place.formattedAddress,
          lat: place.location?.latitude,
          lng: place.location?.longitude,
          formatted_address: place.formattedAddress,
        },
        categories: [
          {
            id: primaryType,
            name: this.formatCategoryName(primaryType),
            primary: true,
            icon: categoryIcon || undefined,
          },
        ],
        rating: place.rating,
        price,
        hours,
        contact: {
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
          url: place.websiteUri,
        },
        description: place.editorialSummary?.text,
        photos,
        distance,
        stats: {
          usersCount: place.userRatingCount,
        },
      };
    });

    return {
      results: venues,
      totalResults: venues.length,
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Format Google Place type to readable category name
   */
  private formatCategoryName(type: string): string {
    const typeMap: Record<string, string> = {
      restaurant: 'Restaurant',
      cafe: 'Café',
      bar: 'Bar',
      bakery: 'Bakery',
      meal_takeaway: 'Takeaway',
      meal_delivery: 'Delivery',
      food: 'Food',
      night_club: 'Night Club',
      coffee_shop: 'Coffee Shop',
      fast_food_restaurant: 'Fast Food',
      pizza_restaurant: 'Pizza',
      american_restaurant: 'American',
      italian_restaurant: 'Italian',
      mexican_restaurant: 'Mexican',
      chinese_restaurant: 'Chinese',
      japanese_restaurant: 'Japanese',
      thai_restaurant: 'Thai',
      indian_restaurant: 'Indian',
    };

    return typeMap[type] || type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

// Export singleton instance
export const googlePlacesService = new GooglePlacesService();
export default googlePlacesService;
