import { router } from 'expo-router';

// Map old route names to new expo-router paths
const routeMap: Record<string, string> = {
  Search: '/search',
  Explore: '/',
  BucketList: '/bucket-list',
  Profile: '/profile',
  Detail: '/detail',
};

// Define the type for route parameters
type RouteParams = Record<string, string | number | boolean | undefined>;

export const navigate = (routeName: string, params?: RouteParams) => {
  const path = (routeMap[routeName] as keyof typeof routeMap) || `/${routeName.toLowerCase()}`;

  // Ensure path is a valid route string for expo-router
  // Type assertion to 'any' to satisfy the stricter type requirements of router.push
  router.push(path as any, params as any);
};

export const goBack = () => {
  router.back();
};
