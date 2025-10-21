import { getDistance, getDistanceString } from '../distanceUtils';

describe('distanceUtils', () => {
  describe('getDistance', () => {
    it('calculates distance between two points correctly', () => {
      // New York (40.7128, -74.0060) to London (51.5074, -0.1278)
      // Approximate distance: ~3461 miles
      const distance = getDistance(40.7128, -74.0060, 51.5074, -0.1278);
      // Allow for some variance depending on Earth radius used in implementations (miles)
      expect(Math.round(distance)).toBe(3461); 
    });

    it('returns 0 for same points', () => {
      const distance = getDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });
  });

  describe('getDistanceString', () => {
    it('formats miles correctly', () => {
      // Create a distance that is definitely > 0.1 miles
      // 1 degree latitude is approx 69 miles
      const result = getDistanceString(40, -74, 41, -74);
      expect(result).toMatch(/\d+\.\d+ mi/);
    });

    it('formats feet correctly for short distances', () => {
      // Very close points
      const result = getDistanceString(40.7128, -74.0060, 40.7129, -74.0060);
      expect(result).toMatch(/\d+ ft/);
    });
  });
});
