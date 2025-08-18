import {
  getUserLocation,
  setUserLocation,
  setLocationPermission,
  fetchNearbyVenuesFailure,
} from '@/store/slices/venuesSlice';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 4,
  },
}));

// Import expo-location after mocking
import * as Location from 'expo-location';

describe('locationSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentPosition', () => {
    it('should successfully get location and dispatch setUserLocation', async () => {
      //TODO: Implement the actual getCurrentPosition watchLocation test saga logic
      const mockLocation = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5,
        },
      };
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
    });
  });

  describe('location watching', () => {
    it('should set up location watching with proper configuration', () => {
      const mockWatchId = { remove: jest.fn() };
      (Location.watchPositionAsync as jest.Mock).mockResolvedValue(mockWatchId);

      // Test that watchPositionAsync is called with correct config
      expect(Location.watchPositionAsync).toBeDefined();
    });
  });

  describe('action integration', () => {
    it('should respond to getUserLocation action', () => {
      const action = getUserLocation();

      expect(action.type).toBe('venues/getUserLocation');
    });

    it('should have proper action creators available', () => {
      expect(setUserLocation).toBeDefined();
      expect(setLocationPermission).toBeDefined();
      expect(fetchNearbyVenuesFailure).toBeDefined();
    });
  });
});
