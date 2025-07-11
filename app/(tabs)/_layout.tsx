import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React from 'react';
import { Icon } from '@rneui/themed';
import { Tabs, Redirect } from 'expo-router';
import { useAppSelector } from '@/store';
import { useAuth } from '@/contexts/AuthContext';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function TabLayout() {
  const colors = useThemeColors();
  const { user, loading } = useAuth();
  const bucketListCount = useAppSelector(
    (state) => state.bucketList.items.length,
  );

  const styles = createStyles(colors);

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

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Redirect to auth if not signed in
  if (!user) {
    return <Redirect href="/auth" />;
  }

  // Note: Removed initialization loading screen - now handled by spinning buttons in auth screen

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grey3,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          paddingVertical: Platform.OS === 'ios' ? 10 : 5,
          height: Platform.OS === 'ios' ? 90 : 70,
          backgroundColor: colors.background,
          borderTopColor: colors.grey4,
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
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Icon
              color={color}
              name="notifications"
              size={size}
              type="material"
            />
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey5,
  },
  tabIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});
