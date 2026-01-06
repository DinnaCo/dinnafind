/**
 * BranchService Tests
 *
 * Note: BranchService is a singleton that loads the react-native-branch module lazily.
 * These tests focus on the URL conversion logic and fallback behavior.
 */

import { logger } from '@/utils/logger';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    geofence: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Mock react-native-branch to not be available
jest.mock('react-native', () => ({
  NativeModules: {
    // RNBranch not available - simulates Branch SDK not being initialized
  },
}));

describe('BranchService', () => {
  // Import after mocks
  let branchService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      branchService = require('../BranchService').branchService;
    });
  });

  describe('Availability', () => {
    it('returns false when Branch SDK is not available', () => {
      expect(branchService.isAvailable()).toBe(false);
    });

    it('returns false before initialization', () => {
      expect(branchService.isAvailable()).toBe(false);
    });
  });

  describe('Fallback Behavior', () => {
    it('throws error when creating venue link and Branch is not available', async () => {
      const venueId = 'venue123';
      await expect(branchService.createVenueLink(venueId)).rejects.toThrow(
        'Branch is not available - cannot create shareable link'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws error when creating venue link with venue name and Branch is not available', async () => {
      const venueId = 'venue456';
      const venueName = 'Test Restaurant';
      await expect(branchService.createVenueLink(venueId, venueName)).rejects.toThrow(
        'Branch is not available - cannot create shareable link'
      );
    });

    it('throws error when creating venue link with properties and Branch is not available', async () => {
      const venueId = 'venue789';
      const properties = {
        channel: 'instagram',
        data: { userId: 'user123' },
      };
      await expect(branchService.createVenueLink(venueId, 'Test', properties)).rejects.toThrow(
        'Branch is not available - cannot create shareable link'
      );
    });

    it('throws error when creating bucket list link and Branch is not available', async () => {
      await expect(branchService.createBucketListLink()).rejects.toThrow(
        'Branch is not available - cannot create shareable link'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws error when creating bucket list link with properties and Branch is not available', async () => {
      const properties = {
        channel: 'email',
        data: { itemCount: '5' },
      };
      await expect(branchService.createBucketListLink(properties)).rejects.toThrow(
        'Branch is not available - cannot create shareable link'
      );
    });
  });

  describe('URL Conversion (Internal Logic)', () => {
    it('converts restaurant deep link data with autoSave', () => {
      const data = {
        type: 'restaurant' as const,
        venueId: 'venue123',
        autoSave: true,
      };

      const url = branchService.convertBranchDataToUrl(data);

      expect(url).toBe('dinnafind://restaurant/venue123?autoSave=true');
    });

    it('converts restaurant deep link data without autoSave', () => {
      const data = {
        type: 'restaurant' as const,
        venueId: 'venue123',
        autoSave: false,
      };

      const url = branchService.convertBranchDataToUrl(data);

      expect(url).toBe('dinnafind://restaurant/venue123?');
    });

    it('converts bucket-list deep link data', () => {
      const data = {
        type: 'bucket-list' as const,
      };

      const url = branchService.convertBranchDataToUrl(data);

      expect(url).toBe('dinnafind://bucket-list');
    });

    it('converts auth callback deep link data', () => {
      const data = {
        type: 'auth' as const,
      };

      const url = branchService.convertBranchDataToUrl(data);

      expect(url).toBe('dinnafind://auth-callback');
    });

    it('falls back to restaurant URL for unknown types', () => {
      const data = {
        type: 'unknown' as any,
        venueId: 'venue123',
      };

      const url = branchService.convertBranchDataToUrl(data);

      expect(url).toBe('dinnafind://restaurant/venue123?autoSave=true');
    });

    it('handles missing venueId in fallback', () => {
      const data = {
        type: 'unknown' as any,
      };

      const url = branchService.convertBranchDataToUrl(data);

      expect(url).toBe('dinnafind://restaurant/unknown?autoSave=true');
    });

    it('handles restaurant link with undefined autoSave', () => {
      const data = {
        type: 'restaurant' as const,
        venueId: 'venue456',
      };

      const url = branchService.convertBranchDataToUrl(data);

      // When autoSave is undefined, it should not add the parameter
      expect(url).toMatch(/dinnafind:\/\/restaurant\/venue456/);
    });
  });

  describe('Error Handling', () => {
    it('returns null when getting last referring params and Branch is not available', async () => {
      const result = await branchService.getLastReferringParams();

      expect(result).toBeNull();
      // When Branch is not available, it uses dummy implementation that returns null
    });

    it('does not throw when tracking event and Branch is not available', async () => {
      await expect(
        branchService.trackEvent('test_event', { foo: 'bar' }),
      ).resolves.not.toThrow();

      // When Branch is not available, it logs debug message and returns silently
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping event tracking')
      );
    });
  });

  describe('Initialization Safety', () => {
    it('handles multiple initialization attempts safely', async () => {
      await branchService.initialize();
      await branchService.initialize();
      await branchService.initialize();

      // Should not throw or cause issues
      expect(branchService.isAvailable()).toBe(false);
    });

    it('logs warning when Branch native module is not available', async () => {
      await branchService.initialize();

      expect(logger.warn).toHaveBeenCalledWith(
        '[Branch] Native module not available. Branch features will be disabled.',
      );
    });
  });

  describe('Link Data Structure', () => {
    it('throws error when creating restaurant link (Branch not available)', async () => {
      await expect(
        branchService.createVenueLink('test-venue-id')
      ).rejects.toThrow('Branch is not available - cannot create shareable link');
    });

    it('throws error when creating bucket list link (Branch not available)', async () => {
      await expect(
        branchService.createBucketListLink()
      ).rejects.toThrow('Branch is not available - cannot create shareable link');
    });

    it('throws error for venue IDs with special characters (Branch not available)', async () => {
      const venueId = 'venue-123_ABC.xyz';
      await expect(
        branchService.createVenueLink(venueId)
      ).rejects.toThrow('Branch is not available - cannot create shareable link');
    });
  });
});
