import { foursquareV3Service } from './foursquareV3';

export interface StandardizedVenueDetails {
  id: string;
  fsq_id: string;
  name: string;
  categories: Array<{
    id: string;
    name: string;
    icon?: {
      prefix?: string;
      suffix?: string;
    };
  }>;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    neighborhood?: string[];
    formattedAddress?: string;
    crossStreet?: string;
    lat?: number;
    lng?: number;
    locality?: string;
    region?: string;
    formatted_address?: string;
  };
  geocodes?: {
    main?: {
      latitude?: number;
      longitude?: number;
    };
  };
  photos?: Array<{
    id: string;
    prefix?: string;
    suffix?: string;
    width?: number;
    height?: number;
    created_at?: string;
  }>;
  rating?: number;
  ratingColor?: string;
  price?: {
    tier: number;
    message: string;
    currency?: string;
  };
  hours?: {
    status?: string;
    isOpen?: boolean;
    openNow?: boolean;
    displayHours?: string[];
    display?: string;
    is_local_holiday?: boolean;
    open_now?: boolean;
  };
  contact?: {
    phone?: string;
    formattedPhone?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    email?: string;
    url?: string;
    tel?: string;
    website?: string;
  };
  description?: string;
  url?: string;
  verified?: boolean;
  stats?: {
    tipCount?: number;
    usersCount?: number;
    checkinsCount?: number;
  };
  distance?: number;
  chains?: any[];
  timezone?: string;
}

export async function getVenueDetails(venueId: string): Promise<StandardizedVenueDetails> {
  const cleanVenueId = venueId.split('?')[0];
  if (!cleanVenueId || typeof cleanVenueId !== 'string' || !cleanVenueId.trim()) {
    throw new Error('Invalid venue ID');
  }
  const raw = await foursquareV3Service.getPlacesDetails(cleanVenueId);
  if (!raw) throw new Error('Venue not found');
  return {
    id: raw.fsq_id || raw.id,
    fsq_id: raw.fsq_id || raw.id,
    name: raw.name || 'Unknown Venue',
    categories: (raw.categories || []).map((cat: any) => ({
      id: cat.id || cat.fsq_id || '',
      name: cat.name || 'Unknown Category',
      icon: cat.icon ? { prefix: cat.icon.prefix, suffix: cat.icon.suffix } : undefined,
    })),
    location: {
      address: raw.location?.address,
      city: raw.location?.city || raw.location?.locality,
      state: raw.location?.state || raw.location?.region,
      country: raw.location?.country,
      postalCode: raw.location?.postalCode || raw.location?.postcode,
      neighborhood: raw.location?.neighborhood,
      formattedAddress: raw.location?.formattedAddress || raw.location?.formatted_address,
      crossStreet: raw.location?.crossStreet,
      lat: raw.location?.lat,
      lng: raw.location?.lng,
      locality: raw.location?.locality,
      region: raw.location?.region,
      formatted_address: raw.location?.formatted_address || raw.location?.formattedAddress,
    },
    geocodes: raw.geocodes,
    photos: (raw.photos || []).map((photo: any) => ({
      id: photo.id || '',
      prefix: photo.prefix,
      suffix: photo.suffix,
      width: photo.width,
      height: photo.height,
      created_at: photo.created_at,
    })),
    rating: raw.rating,
    ratingColor: raw.ratingColor,
    price: raw.price,
    hours: raw.hours,
    contact: {
      phone: raw.contact?.phone || raw.tel,
      formattedPhone: raw.contact?.formattedPhone,
      twitter: raw.contact?.twitter,
      instagram: raw.contact?.instagram,
      facebook: raw.contact?.facebook,
      email: raw.contact?.email,
      url: raw.contact?.url || raw.website,
      tel: raw.tel,
      website: raw.website,
    },
    description: raw.description,
    url: raw.url,
    verified: raw.verified,
    stats: raw.stats,
    distance: raw.distance,
    chains: raw.chains,
    timezone: raw.timezone,
  };
}
