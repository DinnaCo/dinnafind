import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { Icon } from '@rneui/themed';
import { Tabs, Redirect } from 'expo-router';

import { useAppSelector } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { LoadingScreen } from '@/components/screens/LoadingScreen';

import { theme } from '@/theme';

// Badge component for tab icons
const TabBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { isInitializing, initializationError } = useAppInitialization();
  const bucketListCount = useAppSelector(state => state.bucketList.items.length);
  const [activeGeofencesCount, setActiveGeofencesCount] = React.useState(0);

  React.useEffect(() => {
    // Get initial count of active geofences
    import('@/services/GeofencingService').then(async ({ default: service }) => {
      // Initialize service first if needed
      await service.initialize();
      const activeCount = service.getActiveGeofences().length;
      setActiveGeofencesCount(activeCount);
    });
  }, []);

  // Update active geofences count when bucket list changes
  React.useEffect(() => {
    const activeCount = bucketListCount; // For now, use bucket list count
    setActiveGeofencesCount(activeCount);
  }, [bucketListCount]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Redirect to auth if not signed in
  if (!user) {
    return <Redirect href="/auth" />;
  }

  // Show initialization loading screen
  if (isInitializing) {
    return (
      <LoadingScreen
        message="Setting up your app..."
        error={initializationError}
        onRetry={() => {
          // Retry initialization by triggering a re-render
          window.location.reload();
        }}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.grey3,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          paddingVertical: Platform.OS === 'ios' ? 10 : 5,
          height: Platform.OS === 'ios' ? 90 : 70,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Icon color={color} name="explore" size={size} type="material" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Icon color={color} name="search" size={size} type="material" />
          ),
        }}
      />
      <Tabs.Screen
        name="bucket-list"
        options={{
          title: 'Bucket List',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.tabIconContainer}>
              <Icon color={color} name="bookmark" size={size} type="material" />
              <TabBadge count={bucketListCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.tabIconContainer}>
              <Icon color={color} name="notifications" size={size} type="material" />
              <TabBadge count={activeGeofencesCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon color={color} name="person" size={size} type="material" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  tabIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF4500',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});
