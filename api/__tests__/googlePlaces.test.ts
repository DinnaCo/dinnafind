import { googlePlacesService } from '../googlePlaces';
import Constants from 'expo-constants';
import { logger } from '@/utils/logger';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Expo Constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: 'test-api-key',
    },
  },
}));

describe('GooglePlacesService', () => {
  const mockCoordinates = {
    latitude: 40.7128,
    longitude: -74.0060,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  describe('Configuration', () => {
    it('should be configured when API key is present', () => {
      expect(googlePlacesService.isConfigured()).toBe(true);
    });
  });

  describe('searchNearbyVenues', () => {
    it('should successfully search and transform venues', async () => {
      const mockGoogleResponse = {
        places: [
          {
            id: 'place123',
            displayName: { text: 'Test Restaurant' },
            formattedAddress: '123 Test St',
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
            },
            rating: 4.5,
            userRatingCount: 100,
            priceLevel: 2,
            primaryType: 'restaurant',
            types: ['restaurant', 'food'],
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGoogleResponse,
      });

      const results = await googlePlacesService.searchNearbyVenues(mockCoordinates, 'pizza');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchText',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Goog-Api-Key': 'test-api-key',
          }),
        })
      );

      expect(results.results).toHaveLength(1);
      const venue = results.results[0];
      expect(venue.fsq_id).toBe('place123');
      expect(venue.name).toBe('Test Restaurant');
      expect(venue.rating).toBe(4.5);
      expect(venue.price?.tier).toBe(2);
      expect(venue.categories[0].name).toBe('Restaurant');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access Denied' }),
      });

      const results = await googlePlacesService.searchNearbyVenues(mockCoordinates);

      // Should return empty results and log error
      expect(results.results).toHaveLength(0);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

      const results = await googlePlacesService.searchNearbyVenues(mockCoordinates);

      expect(results.results).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(
        '[GooglePlaces] Search error details:',
        expect.objectContaining({ isNetworkError: true })
      );
    });

    it('should respect custom radius and limit', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ places: [] }),
        });

        await googlePlacesService.searchNearbyVenues(mockCoordinates, 'test', 1000, 5);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('"radius":1000'),
            })
        );

        // Don't check for maxResultCount in regex string reliably, but we know limit is passed.
        // Or parses the body
         const lastCall = (global.fetch as jest.Mock).mock.calls[0];
         const body = JSON.parse(lastCall[1].body);
         expect(body.maxResultCount).toBe(5);
         expect(body.locationBias.circle.radius).toBe(1000);
    });
  });

  describe('getRecommendedVenues', () => {
     it('should fetch and sort recommendations by rating', async () => {
        const mockGoogleResponse = {
            places: [
                { id: '1', rating: 4.0, displayName: { text: 'Good Place' } },
                { id: '2', rating: 4.8, displayName: { text: 'Best Place' } },
                { id: '3', rating: 3.5, displayName: { text: 'Okay Place' } }
            ]
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockGoogleResponse,
        });

        const results = await googlePlacesService.getRecommendedVenues(mockCoordinates);

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('places:searchNearby'),
            expect.any(Object)
        );

        // Verify sorting
        expect(results.results).toHaveLength(3);
        expect(results.results[0].rating).toBe(4.8);
        expect(results.results[1].rating).toBe(4.0);
        expect(results.results[2].rating).toBe(3.5);
     });
  });

  describe('getPlaceDetails', () => {
      it('should fetch place details successfully', async () => {
          const mockPlaceDetails = {
              id: 'place123',
              displayName: { text: 'Detailed Place' },
              nationalPhoneNumber: '555-0123',
              websiteUri: 'https://example.com'
          };

          (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              json: async () => mockPlaceDetails,
          });

          const venue = await googlePlacesService.getPlaceDetails('place123');

          expect(global.fetch).toHaveBeenCalledWith(
              'https://places.googleapis.com/v1/places/place123',
              expect.objectContaining({ method: 'GET' })
          );

          expect(venue).not.toBeNull();
          expect(venue?.contact?.phone).toBe('555-0123');
          expect(venue?.contact?.url).toBe('https://example.com');
      });

      it('should return null on error', async () => {
          (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: false,
              status: 404,
              json: async () => ({ error: 'Not Found' })
          });

          const venue = await googlePlacesService.getPlaceDetails('invalid-id');
          expect(venue).toBeNull();
          expect(logger.error).toHaveBeenCalled();
      });
  });
});
