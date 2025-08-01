/**
 * Restaurant/Venue fixture data for tests
 * Provides consistent venue objects for screen and component tests
 */

export const mockRestaurantPizza = {
  id: '1',
  name: 'Pizza Palace',
  address: '123 Main St, San Francisco, CA 94102',
  latitude: 37.7749,
  longitude: -122.4194,
  rating: 4.5,
  priceLevel: 2,
  cuisine: ['Italian', 'Pizza'],
  phoneNumber: '(415) 555-0123',
  website: 'https://pizzapalace.com',
  photos: ['https://example.com/pizza1.jpg'],
  openNow: true,
  description: 'Authentic Italian pizza with wood-fired oven',
};

export const mockRestaurantSushi = {
  id: '2',
  name: 'Sushi Paradise',
  address: '456 Ocean Ave, San Francisco, CA 94112',
  latitude: 37.7849,
  longitude: -122.4294,
  rating: 4.8,
  priceLevel: 3,
  cuisine: ['Japanese', 'Sushi'],
  phoneNumber: '(415) 555-0456',
  website: 'https://sushiparadise.com',
  photos: ['https://example.com/sushi1.jpg'],
  openNow: true,
  description: 'Fresh sushi and sashimi, omakase available',
};

export const mockRestaurantBurger = {
  id: '3',
  name: 'Burger Joint',
  address: '789 Market St, San Francisco, CA 94103',
  latitude: 37.7649,
  longitude: -122.4094,
  rating: 4.2,
  priceLevel: 1,
  cuisine: ['American', 'Burgers'],
  phoneNumber: '(415) 555-0789',
  website: 'https://burgerjoint.com',
  photos: ['https://example.com/burger1.jpg'],
  openNow: false,
  description: 'Classic American burgers and fries',
};

export const mockRestaurantClosed = {
  id: '4',
  name: 'Late Night Tacos',
  address: '321 Mission St, San Francisco, CA 94110',
  latitude: 37.7549,
  longitude: -122.3994,
  rating: 4.0,
  priceLevel: 1,
  cuisine: ['Mexican', 'Tacos'],
  phoneNumber: '(415) 555-0321',
  photos: ['https://example.com/tacos1.jpg'],
  openNow: false,
  description: 'Authentic Mexican tacos, open late',
};

export const mockRestaurants = [
  mockRestaurantPizza,
  mockRestaurantSushi,
  mockRestaurantBurger,
  mockRestaurantClosed,
];

export const mockRestaurantsNearby = [
  mockRestaurantPizza,
  mockRestaurantBurger,
];
