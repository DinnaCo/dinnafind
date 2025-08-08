/**
 * Utility functions for generating shareable deep deferred links
 */

/**
 * Generate a shareable deep link that will route to a venue and optionally auto-save it
 * @param venueId - The Foursquare venue ID
 * @param autoSave - Whether to automatically save the venue when the link is opened
 * @returns A deep link URL that can be shared
 */
export function generateVenueDeepLink(venueId: string, autoSave: boolean = false): string {
  const baseUrl = 'dinnafind://restaurant/';
  const queryParams = autoSave ? '?save=true' : '';
  return `${baseUrl}${venueId}${queryParams}`;
}

/**
 * Generate a shareable deep link for a venue with auto-save enabled
 * @param venueId - The Foursquare venue ID
 * @returns A deep link URL that will auto-save the venue when opened
 */
export function generateVenueSaveDeepLink(venueId: string): string {
  return generateVenueDeepLink(venueId, true);
}

/**
 * Generate a shareable deep link for viewing a venue without auto-save
 * @param venueId - The Foursquare venue ID
 * @returns A deep link URL that will show the venue details
 */
export function generateVenueViewDeepLink(venueId: string): string {
  return generateVenueDeepLink(venueId, false);
}

/**
 * Parse a venue deep link to extract the venue ID and auto-save flag
 * @param url - The deep link URL
 * @returns Object containing venueId and autoSave flag, or null if invalid
 */
export function parseVenueDeepLink(url: string): { venueId: string; autoSave: boolean } | null {
  try {
    if (!url.startsWith('dinnafind://restaurant/')) {
      return null;
    }

    const pathPart = url.replace('dinnafind://restaurant/', '');
    const [venueId, ...rest] = pathPart.split('/');
    console.log('venueId ', JSON.stringify({ venueId, rest }));

    if (!venueId) {
      return null;
    }

    // Check for query parameters
    const queryStart = venueId.indexOf('?');
    let actualVenueId = venueId;
    let autoSave = false;
    console.log('queryStart  ', JSON.stringify({ queryStart }));
    if (queryStart > -1) {
      actualVenueId = venueId.substring(0, queryStart);
      const queryString = venueId.substring(queryStart + 1);
      const pairs = queryString.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key === 'save' && value === 'true') {
          autoSave = true;
        }
      });
    }

    // Additional cleanup to ensure no query parameters remain in the venue ID
    const finalQueryStart = actualVenueId.indexOf('?');
    if (finalQueryStart > -1) {
      actualVenueId = actualVenueId.substring(0, finalQueryStart);
    }

    return {
      venueId: actualVenueId,
      autoSave,
    };
  } catch (error) {
    console.error('Error parsing venue deep link:', error);
    return null;
  }
}
