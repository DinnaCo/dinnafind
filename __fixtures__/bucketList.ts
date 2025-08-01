/**
 * Bucket List fixture data for tests
 * Provides consistent bucket list items for testing BucketListScreen and related features
 */

import type { BucketListItem } from '@/models/bucket-list';

export const mockBucketListItemHigh: BucketListItem = {
  id: 'bucket-1',
  fsq_id: 'fsq-pizza-123',
  venueId: '1',
  userId: 'user-123',
  venue: {
    id: '1',
    name: 'Pizza Palace',
    categories: [
      {
        id: 'cat-italian',
        name: 'Italian Restaurant',
      },
    ],
    location: {
      formatted_address: '123 Main St, San Francisco, CA 94102',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      lat: 37.7749,
      lng: -122.4194,
    },
    geocodes: {
      main: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
    rating: 4.5,
  },
  priority: 'high',
  notes: 'Try the margherita pizza',
  tags: ['Italian', 'Pizza', 'Date Night'],
  addedAt: new Date('2024-01-01T00:00:00Z').getTime(),
  plannedVisitDate: new Date('2024-02-14T19:00:00Z').getTime(),
};

export const mockBucketListItemMedium: BucketListItem = {
  id: 'bucket-2',
  fsq_id: 'fsq-sushi-456',
  venueId: '2',
  userId: 'user-123',
  venue: {
    id: '2',
    name: 'Sushi Paradise',
    categories: [
      {
        id: 'cat-japanese',
        name: 'Japanese Restaurant',
      },
    ],
    location: {
      formatted_address: '456 Ocean Ave, San Francisco, CA 94112',
      address: '456 Ocean Ave',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94112',
      lat: 37.7849,
      lng: -122.4294,
    },
    geocodes: {
      main: {
        latitude: 37.7849,
        longitude: -122.4294,
      },
    },
    rating: 4.8,
  },
  priority: 'medium',
  notes: 'Get the omakase',
  tags: ['Japanese', 'Sushi'],
  addedAt: new Date('2024-01-02T00:00:00Z').getTime(),
};

export const mockBucketListItemVisited: BucketListItem = {
  id: 'bucket-3',
  fsq_id: 'fsq-burger-789',
  venueId: '3',
  userId: 'user-123',
  venue: {
    id: '3',
    name: 'Burger Joint',
    categories: [
      {
        id: 'cat-american',
        name: 'American Restaurant',
      },
    ],
    location: {
      formatted_address: '789 Market St, San Francisco, CA 94103',
      address: '789 Market St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      lat: 37.7649,
      lng: -122.4094,
    },
    geocodes: {
      main: {
        latitude: 37.7649,
        longitude: -122.4094,
      },
    },
    rating: 4.2,
  },
  priority: 'low',
  notes: 'Great burgers!',
  tags: ['Burgers', 'Casual'],
  addedAt: new Date('2024-01-03T00:00:00Z').getTime(),
  visitedAt: new Date('2024-01-15T00:00:00Z').getTime(),
  userRating: 5,
  review: 'Amazing burgers, will come back!',
};

export const mockBucketListItemNoNotes: BucketListItem = {
  id: 'bucket-4',
  fsq_id: 'fsq-tacos-321',
  venueId: '4',
  userId: 'user-123',
  venue: {
    id: '4',
    name: 'Late Night Tacos',
    categories: [
      {
        id: 'cat-mexican',
        name: 'Mexican Restaurant',
      },
    ],
    location: {
      formatted_address: '321 Mission St, San Francisco, CA 94110',
      address: '321 Mission St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94110',
      lat: 37.7549,
      lng: -122.3994,
    },
    geocodes: {
      main: {
        latitude: 37.7549,
        longitude: -122.3994,
      },
    },
    rating: 4.0,
  },
  addedAt: new Date('2024-01-04T00:00:00Z').getTime(),
};

export const mockBucketListItemWithPhoto: BucketListItem = {
  id: 'bucket-5',
  fsq_id: 'fsq-fancy-999',
  venueId: '5',
  userId: 'user-123',
  venue: {
    id: '5',
    name: 'Fancy French Bistro',
    categories: [
      {
        id: 'cat-french',
        name: 'French Restaurant',
      },
    ],
    location: {
      formatted_address: '555 Pine St, San Francisco, CA 94108',
      address: '555 Pine St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94108',
      lat: 37.7905,
      lng: -122.4041,
    },
    geocodes: {
      main: {
        latitude: 37.7905,
        longitude: -122.4041,
      },
    },
    rating: 4.9,
    photo: 'https://example.com/french-bistro.jpg',
  },
  priority: 'high',
  notes: 'Special occasion place',
  tags: ['French', 'Fine Dining', 'Romantic'],
  addedAt: new Date('2024-01-05T00:00:00Z').getTime(),
  plannedVisitDate: new Date('2024-03-01T20:00:00Z').getTime(),
};

export const mockBucketListItems = [
  mockBucketListItemHigh,
  mockBucketListItemMedium,
  mockBucketListItemVisited,
  mockBucketListItemNoNotes,
  mockBucketListItemWithPhoto,
];

export const mockBucketListItemsUnvisited = [
  mockBucketListItemHigh,
  mockBucketListItemMedium,
  mockBucketListItemNoNotes,
  mockBucketListItemWithPhoto,
];

export const mockBucketListItemsVisited = [mockBucketListItemVisited];

export const mockBucketListItemsHighPriority = [
  mockBucketListItemHigh,
  mockBucketListItemWithPhoto,
];
