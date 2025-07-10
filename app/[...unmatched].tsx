import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { logger } from '@/utils/logger';
export default function CatchAllScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Get the current route
  const route = params.unmatched
    ? Array.isArray(params.unmatched)
      ? params.unmatched.join('/')
      : params.unmatched
    : '';

  useEffect(() => {
    logger.info('Catch-all route hit:', route);

    // Don't redirect if this is a valid route (like auth/index)
    // The auth route should handle its own navigation
    if (route.startsWith('auth/') || route === 'auth') {
      logger.info('Valid auth route, not redirecting');
      return;
    }

    // Small delay to ensure navigation is ready
    const timer = setTimeout(() => {
      // For any unmatched route, go to home
      logger.info('Unmatched route, redirecting to home...');
      setShouldRedirect(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [route]);

  // Don't render anything for valid routes - let them through
  if (route.startsWith('auth/') || route === 'auth') {
    return null;
  }

  // Redirect to home for truly unmatched routes
  if (shouldRedirect) {
    return <Redirect href="/(tabs)" />;
  }

  // Show loading spinner while deciding
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF4500" />
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
