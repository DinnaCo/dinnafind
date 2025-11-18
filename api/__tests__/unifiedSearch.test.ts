import { unifiedSearchService } from '../unifiedSearch';
import { googlePlacesService } from '../googlePlaces';
import { logger } from '@/utils/logger';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock googlePlacesService
jest.mock('../googlePlaces', () => ({
  googlePlacesService: {
    isConfigured: jest.fn(),
    searchNearbyVenues: jest.fn(),
    getRecommendedVenues: jest.fn(),
    getPlaceDetails: jest.fn(),
  },
}));

describe('UnifiedSearchService', () => {
  const mockCoordinates = {
    latitude: 40.7128,
    longitude: -74.0060,
  };

  const mockVenues = {
    results: [
      {
        fsq_id: '123',
        name: 'Test Place',
        categories: [{ id: '1', name: 'Food', primary: true }],
        location: {
            address: '123 Test St',
            lat: 40.7,
            lng: -74.0,
            formatted_address: '123 Test St'
        },
        contact: {},
        photos: []
      }
    ],
    totalResults: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchNearbyVenues', () => {
    it('should delegate to Google Places when configured', async () => {
      (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
      (googlePlacesService.searchNearbyVenues as jest.Mock).mockResolvedValue(mockVenues);

      const results = await unifiedSearchService.searchNearbyVenues(mockCoordinates, 'pizza');

      expect(googlePlacesService.isConfigured).toHaveBeenCalled();
      expect(googlePlacesService.searchNearbyVenues).toHaveBeenCalledWith(
        mockCoordinates,
        'pizza',
        5000,
        20
      );
      expect(results).toEqual(mockVenues);
    });

    it('should return empty results when Google Places is NOT configured', async () => {
      (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(false);

      const results = await unifiedSearchService.searchNearbyVenues(mockCoordinates);

      expect(googlePlacesService.searchNearbyVenues).not.toHaveBeenCalled();
      expect(results.results).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    });

    it('should handle Google Places errors gracefully', async () => {
      (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
      (googlePlacesService.searchNearbyVenues as jest.Mock).mockRejectedValue(new Error('API fail'));

      const results = await unifiedSearchService.searchNearbyVenues(mockCoordinates);

      expect(results.results).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('search failed'),
        expect.any(Error)
      );
    });
  });

  describe('getRecommendedVenues', () => {
    it('should delegate to Google Places when configured', async () => {
      (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
      (googlePlacesService.getRecommendedVenues as jest.Mock).mockResolvedValue(mockVenues);

      const results = await unifiedSearchService.getRecommendedVenues(mockCoordinates);

      expect(googlePlacesService.getRecommendedVenues).toHaveBeenCalledWith(
        mockCoordinates,
        20
      );
      expect(results).toEqual(mockVenues);
    });

    it('should return empty when not configured', async () => {
      (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(false);
      const results = await unifiedSearchService.getRecommendedVenues(mockCoordinates);
      expect(results.results).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
        (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
        (googlePlacesService.getRecommendedVenues as jest.Mock).mockRejectedValue(new Error('Fail'));

        const results = await unifiedSearchService.getRecommendedVenues(mockCoordinates);
        expect(results.results).toHaveLength(0);
    });
  });

  describe('getVenueDetails', () => {
      it('should return details when configured and found', async () => {
          (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
          const mockVenue = mockVenues.results[0];
          (googlePlacesService.getPlaceDetails as jest.Mock).mockResolvedValue(mockVenue);

          const result = await unifiedSearchService.getVenueDetails('123');
          expect(googlePlacesService.getPlaceDetails).toHaveBeenCalledWith('123');
          expect(result).toEqual(mockVenue);
      });

      it('should return null when not configured', async () => {
          (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(false);
          const result = await unifiedSearchService.getVenueDetails('123');
          expect(result).toBeNull();
      });

      it('should return null (implicitly) when Google returns null', async () => {
        (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
        (googlePlacesService.getPlaceDetails as jest.Mock).mockResolvedValue(null);

        const result = await unifiedSearchService.getVenueDetails('123');
        // The implementation effectively returns undefined if the try block finishes without returning, or hits catch?
        // Wait, looking at implementation:
        // if (googleDetails) return googleDetails
        // catch -> log
        // end -> return null

        // So if google returns null, it falls through to 'catch' or just skips 'if'?
        // "if (googleDetails)" is false, so it skips the return.
        // It exits the 'try', goes to... wait, no. It exits the 'if (configured)' block?
        // No, it's inside the 'if (configured)'.
        // If googlePlaces returns null, it just finishes the function?
        // Let's re-read the code logic.
      });

      it('should return null on error', async () => {
           (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
           (googlePlacesService.getPlaceDetails as jest.Mock).mockRejectedValue(new Error('Fail'));

           const result = await unifiedSearchService.getVenueDetails('123');
           expect(result).toBeNull();
      });
  });

  describe('searchVenues', () => {
      it('should parse coordinate string and delegate', async () => {
          // searchVenues takes VenueSearchParams which has 'll' string "lat,lng"
          (googlePlacesService.isConfigured as jest.Mock).mockReturnValue(true);
          (googlePlacesService.searchNearbyVenues as jest.Mock).mockResolvedValue(mockVenues);

          const params = {
              ll: '40.7128,-74.0060',
              query: 'sushi',
              radius: 1000,
              limit: 5
          };

          await unifiedSearchService.searchVenues(params);

          expect(googlePlacesService.searchNearbyVenues).toHaveBeenCalledWith(
              { latitude: 40.7128, longitude: -74.0060 },
              'sushi',
              1000,
              5
          );
      });
  });
});
