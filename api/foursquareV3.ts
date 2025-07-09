import { type Coordinates } from '@/models/venue';
import {
  FOURSQUARE_API_KEY as ENV_API_KEY,
  FOURSQUARE_CLIENT_ID as ENV_CLIENT_ID,
  FOURSQUARE_CLIENT_SECRET as ENV_CLIENT_SECRET,
} from '@/utils/env';
import {
  FOURSQUARE_API_KEY as CONFIG_API_KEY,
  FOURSQUARE_CLIENT_ID as CONFIG_CLIENT_ID,
  FOURSQUARE_CLIENT_SECRET as CONFIG_CLIENT_SECRET,
  FOURSQUARE_API_URL,
} from '@/config/foursquare';

// Use direct config if env vars are not loaded
const FOURSQUARE_API_KEY = ENV_API_KEY !== 'dev-api-key' ? ENV_API_KEY : CONFIG_API_KEY;

// React Native-compatible HTTP client instead of Axios
class ReactNativeHTTPClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(baseURL: string, headers: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.headers = headers;
  }

  async get(endpoint: string, options: { params?: Record<string, any> } = {}) {
    const { params = {} } = options;

    // Build URL with query parameters (avoiding URL constructor)
    let url = this.baseURL + endpoint;

    const queryParams = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
      .join('&');

    if (queryParams) {
      url += `?${queryParams}`;
    }

    console.log('🌐 Making request to:', url);
    console.log(
      `%c this.headersr ` + JSON.stringify(this.headers, null, 4),
      'color:white; background:green; font-size: 20px'
    );
    console.log('🔑 Authorization header:', this.headers.Authorization ? 'Present' : 'Missing');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status} Error:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  }
}

// Validate API key and create client
console.log('🔧 Foursquare API Key loaded:', FOURSQUARE_API_KEY ? 'Present' : 'Missing');
if (FOURSQUARE_API_KEY === 'dev-api-key') {
  console.warn('⚠️ Using development API key - API calls will fail');
}

// Create a React Native-compatible client with proper FSQ API key format
const foursquareClient = new ReactNativeHTTPClient(FOURSQUARE_API_URL, {
  Accept: 'application/json',
  Authorization: FOURSQUARE_API_KEY,
});

/**
 * FoursquareV3Service - A service for interacting with the Foursquare Places API v3
 * Modified to use fetch instead of Axios for React Native compatibility
 */
export class FoursquareV3Service {
  private static instance: FoursquareV3Service;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of the service
   */
  public static getInstance(): FoursquareV3Service {
    if (!FoursquareV3Service.instance) {
      FoursquareV3Service.instance = new FoursquareV3Service();
    }
    return FoursquareV3Service.instance;
  }

  /**
   * Search for venues near a specified location
   */
  public async searchVenues(params: {
    ll: string;
    query?: string;
    categories?: string;
    radius?: number;
    limit?: number;
    sort?: string;
  }) {
    try {
      console.log('🔍 Searching venues with params:', params);
      const response = await foursquareClient.get('/places/search', { params });
      console.log('✅ Venues search successful');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to search venues:', error);
      throw error;
    }
  }

  /**
   * Get venue details by ID
   */
  public async getVenueDetails(venueId: string) {
    try {
      const response = await foursquareClient.get(`/places/${venueId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get venue details for ID ${venueId}:`, error);
      throw error;
    }
  }

  public async getPlacesDetails(fsqId: string) {
    try {
      const searchParams = new URLSearchParams({
        fields: 'fsq_id,name,geocodes,location,photos,rating',
        session_token: 'sessionToken',
      }).toString();

      const results = await fetch(`https://api.foursquare.com/v3/places/${fsqId}?${searchParams}`, {
        method: 'get',
        headers: new Headers({
          Accept: 'application/json',
          Authorization: FOURSQUARE_API_KEY || 'dev-api-key',
        }),
      });
      const data = await results.json();
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Search venues near the user's current location
   */
  public async searchNearbyVenues(
    coordinates: Coordinates,
    query?: string,
    categories?: string[],
    radius = 4828,
    limit = 20
  ) {
    const params: any = {
      ll: `${coordinates.latitude},${coordinates.longitude}`,
      radius,
      limit,
    };

    if (query) {
      params.query = query;
    }

    if (categories && categories.length > 0) {
      params.categories = categories.join(',');
    }

    return this.searchVenues(params);
  }

  /**
   * Get recommended venues near the specified location
   */
  public async getRecommendedVenues(coordinates: Coordinates, limit = 10) {
    return this.searchVenues({
      ll: `${coordinates.latitude},${coordinates.longitude}`,
      limit,
      sort: 'RATING',
    });
  }
}

function normalizeVenueId(venueId: string): string {
  return venueId.split('?')[0];
}

export async function getPlacesDetails(venueId: string) {
  const cleanVenueId = normalizeVenueId(venueId);
  const searchParams = new URLSearchParams({
    fields: 'fsq_id,name,geocodes,location,photos,rating',
    session_token: 'sessionToken',
  }).toString();
  const url = `https://api.foursquare.com/v3/places/${cleanVenueId}?${searchParams}`;
  const response = await fetch(url, {
    headers: {
      Authorization: FOURSQUARE_API_KEY || 'dev-api-key', // Replace with your actual key or config
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Venue details fetch failed:', text);
    throw new Error(`Failed to fetch venue details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Export a singleton instance
export const foursquareV3Service = FoursquareV3Service.getInstance();
