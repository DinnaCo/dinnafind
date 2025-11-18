import type { Venue, VenueSearchParams, VenueSearchResponse, Coordinates } from '@/models/venue';
import { googlePlacesService } from './googlePlaces';
import { logger } from '@/utils/logger';

/**
 * Unified Search Service
 * Uses Google Places API for venue search
 */
class UnifiedSearchService {
  /**
   * Search for nearby venues using Google Places
   */
  async searchNearbyVenues(
    coordinates: Coordinates,
    query?: string,
    categories?: string,
    radius: number = 5000,
    limit: number = 20
  ): Promise<VenueSearchResponse> {
    logger.info('[UnifiedSearch] Starting search', {
      coordinates,
      query,
      radius,
      limit,
      googleConfigured: googlePlacesService.isConfigured(),
    });

    if (googlePlacesService.isConfigured()) {
      try {
        logger.info('[UnifiedSearch] Using Google Places search');
        const googleResults = await googlePlacesService.searchNearbyVenues(
          coordinates,
          query,
          radius,
          limit
        );

        logger.info('[UnifiedSearch] Google Places search completed', {
          resultsCount: googleResults.results.length,
        });
        return googleResults;
      } catch (error: any) {
        logger.error('[UnifiedSearch] Google Places search failed', error);
        return {
          results: [],
          totalResults: 0,
        };
      }
    }

    logger.error('[UnifiedSearch] Google Places not configured');
    return {
      results: [],
      totalResults: 0,
    };
  }

  /**
   * Get recommended venues using Google Places
   */
  async getRecommendedVenues(
    coordinates: Coordinates,
    limit: number = 20
  ): Promise<VenueSearchResponse> {
    logger.info('[UnifiedSearch] Getting recommended venues');

    if (googlePlacesService.isConfigured()) {
      try {
        logger.info('[UnifiedSearch] Using Google Places recommendations');
        const googleResults = await googlePlacesService.getRecommendedVenues(coordinates, limit);

        logger.info('[UnifiedSearch] Google Places recommendations completed', {
          resultsCount: googleResults.results.length,
        });
        return googleResults;
      } catch (error: any) {
        logger.error('[UnifiedSearch] Google Places recommendations failed', error);
        return {
          results: [],
          totalResults: 0,
        };
      }
    }

    logger.error('[UnifiedSearch] Google Places not configured');
    return {
      results: [],
      totalResults: 0,
    };
  }

  /**
   * Get venue details from Google Places
   */
  async getVenueDetails(venueId: string): Promise<Venue | null> {
    logger.info('[UnifiedSearch] Getting venue details', { venueId });

    if (googlePlacesService.isConfigured()) {
      try {
        logger.info('[UnifiedSearch] Fetching Google Place details');
        const googleDetails = await googlePlacesService.getPlaceDetails(venueId);

        if (googleDetails) {
          logger.info('[UnifiedSearch] Google Place details retrieved');
          return googleDetails;
        }
      } catch (error: any) {
        logger.error('[UnifiedSearch] Google Place details failed', error);
      }
    }

    logger.error('[UnifiedSearch] Failed to get venue details');
    return null;
  }

  /**
   * Search venues with custom parameters
   */
  async searchVenues(params: VenueSearchParams): Promise<VenueSearchResponse> {
    const [lat, lng] = params.ll.split(',').map(Number);

    return await this.searchNearbyVenues(
      { latitude: lat, longitude: lng },
      params.query,
      params.categories,
      params.radius || 5000,
      params.limit || 20
    );
  }

  /**
   * Fetch venues by coordinates (legacy compatibility)
   */
  async fetchVenues(coordinates: Coordinates): Promise<VenueSearchResponse> {
    return await this.searchNearbyVenues(coordinates);
  }
}

// Export singleton instance
export const unifiedSearchService = new UnifiedSearchService();
export default unifiedSearchService;
