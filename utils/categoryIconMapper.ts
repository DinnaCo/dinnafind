/**
 * Category Icon Mapper
 * Maps Google Places types to category icon URLs using a public icon CDN
 * This provides visual variety for different restaurant/food establishment types
 */

export interface CategoryIcon {
  prefix: string;
  suffix: string;
}

/**
 * Base URL for category icons
 * These are publicly available icons from a CDN
 */
const ICON_BASE = 'https://ss3.4sqi.net/img/categories_v2';

/**
 * Mapping of Google Places types to category icon paths
 */
const GOOGLE_TO_ICON_PATHS: Record<string, string> = {
  // General
  'restaurant': 'food/default',
  'food': 'food/default',

  // American
  'american_restaurant': 'food/newamerican',
  'southern_restaurant': 'food/southern',

  // Asian
  'chinese_restaurant': 'food/chinese',
  'japanese_restaurant': 'food/japanese',
  'thai_restaurant': 'food/thai',
  'vietnamese_restaurant': 'food/vietnamese',
  'korean_restaurant': 'food/korean',
  'indian_restaurant': 'food/indian',
  'asian_restaurant': 'food/asian',
  'sushi_restaurant': 'food/sushi',
  'ramen_restaurant': 'food/ramen',

  // European
  'italian_restaurant': 'food/italian',
  'french_restaurant': 'food/french',
  'greek_restaurant': 'food/greek',
  'spanish_restaurant': 'food/spanish',
  'german_restaurant': 'food/german',

  // Latin American
  'mexican_restaurant': 'food/mexican',
  'brazilian_restaurant': 'food/brazilian',
  'latin_american_restaurant': 'food/latinamerican',
  'argentinian_restaurant': 'food/argentinian',

  // Middle Eastern
  'middle_eastern_restaurant': 'food/middleeastern',
  'turkish_restaurant': 'food/turkish',
  'mediterranean_restaurant': 'food/mediterranean',

  // Specific Food Types
  'pizza_restaurant': 'food/pizza',
  'hamburger_restaurant': 'food/burger',
  'steak_house': 'food/steakhouse',
  'seafood_restaurant': 'food/seafood',
  'barbecue_restaurant': 'food/bbq',
  'fast_food_restaurant': 'food/fastfood',
  'sandwich_shop': 'food/deli',
  'breakfast_restaurant': 'food/breakfast',
  'brunch_restaurant': 'food/breakfast',
  'vegan_restaurant': 'food/vegetarian',
  'vegetarian_restaurant': 'food/vegetarian',

  // Cafes & Coffee
  'cafe': 'food/coffeeshop',
  'coffee_shop': 'food/coffeeshop',
  'bakery': 'food/bakery',
  'dessert_shop': 'food/dessert',
  'ice_cream_shop': 'food/icecream',
  'donut_shop': 'food/donuts',

  // Drinks & Nightlife
  'bar': 'nightlife/pub',
  'night_club': 'nightlife/nightclub',
  'wine_bar': 'nightlife/wine_bar',
  'cocktail_bar': 'nightlife/cocktails',
  'beer_bar': 'nightlife/beergarden',
  'pub': 'nightlife/pub',
  'sports_bar': 'nightlife/sportsbar',
  'lounge': 'nightlife/lounge',

  // Casual Dining
  'meal_takeaway': 'food/default',
  'meal_delivery': 'food/default',
  'diner': 'food/diner',
  'buffet_restaurant': 'food/buffet',

  // Specialty
  'food_truck': 'food/foodtruck',
  'food_court': 'food/default',
};

/**
 * Get category icon URLs for a Google Places type
 * @param googlePlaceType - The primary type from Google Places API
 * @returns CategoryIcon object with prefix and suffix, or null if not found
 */
export function getIconForGooglePlaceType(googlePlaceType: string): CategoryIcon | null {
  const iconPath = GOOGLE_TO_ICON_PATHS[googlePlaceType];

  if (!iconPath) {
    // Return default food icon for unmapped types
    return {
      prefix: `${ICON_BASE}/food/default_`,
      suffix: '.png',
    };
  }

  return {
    prefix: `${ICON_BASE}/${iconPath}_`,
    suffix: '.png',
  };
}

/**
 * Get full icon URL for a given size
 * @param googlePlaceType - The primary type from Google Places API
 * @param size - Icon size (32, 64, 88, 256, 512)
 * @returns Full URL to the icon image
 */
export function getIconUrl(googlePlaceType: string, size: number = 88): string {
  const icon = getIconForGooglePlaceType(googlePlaceType);

  if (!icon) {
    return `${ICON_BASE}/food/default_${size}.png`;
  }

  return `${icon.prefix}${size}${icon.suffix}`;
}

/**
 * Get icon object for multiple types (returns icon for first matched type)
 * @param googlePlaceTypes - Array of types from Google Places API
 * @returns CategoryIcon object with prefix and suffix
 */
export function getIconForGooglePlaceTypes(googlePlaceTypes: string[]): CategoryIcon {
  if (!googlePlaceTypes || googlePlaceTypes.length === 0) {
    return {
      prefix: `${ICON_BASE}/food/default_`,
      suffix: '.png',
    };
  }

  // Try each type until we find a match
  for (const type of googlePlaceTypes) {
    const icon = getIconForGooglePlaceType(type);
    if (icon && GOOGLE_TO_ICON_PATHS[type]) {
      return icon;
    }
  }

  // Default fallback
  return {
    prefix: `${ICON_BASE}/food/default_`,
    suffix: '.png',
  };
}
