import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon } from '@rneui/themed';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { fetchBucketList } from '@/store/slices/bucketListSlice';
import { selectUser } from '@/store/slices/authSlice';
import { theme } from '@/theme';
import { persistor } from '@/store';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);

  const clearBucketList = async () => {
    try {
      // Clear the bucket list for the current user
      const userId = currentUser?.id || 'user-1';
      await AsyncStorage.removeItem(`bucketList_${userId}`);
      console.log('AsyncStorage storage', JSON.stringify(await AsyncStorage.getAllKeys));
      // Refresh the bucket list
      dispatch(fetchBucketList() as any);
    } catch (error) {
      const err = error as any;
      Alert.alert('Error', 'Failed to clear bucket list');
    }
  };

  const clearPersistedRedux = async () => {
    try {
      await persistor.purge();
      Alert.alert(
        'Redux State Cleared',
        'Persisted Redux state has been cleared. The app will reset.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to clear persisted Redux state');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image source={{ uri: currentUser?.photoUrl }} />
          <Text style={styles.email}>{currentUser?.displayName || 'No email'}</Text>
          <Text style={styles.email}>{currentUser?.email || 'No email'}</Text>
        </View>

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="person" type="material" size={24} color={theme.colors.grey1} />
            <Text style={styles.menuItemText}>Edit Profile</Text>
            <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="notifications" type="material" size={24} color={theme.colors.grey1} />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="info" type="material" size={24} color={theme.colors.grey1} />
            <Text style={styles.menuItemText}>About DinnaFind</Text>
            <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Icon name="privacy-tip" type="material" size={24} color={theme.colors.grey1} />
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
          </TouchableOpacity>
        </View> */}

        {/* Development Tools - Only show in __DEV__ */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Development Tools</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/test-deferred-link')}
            >
              <Icon name="link" type="material" size={24} color={theme.colors.grey1} />
              <Text style={styles.menuItemText}>Test Deep Links</Text>
              <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={clearBucketList}>
              <Icon name="delete" type="material" size={24} color={theme.colors.grey1} />
              <Text style={styles.menuItemText}>Clear Bucket List</Text>
              <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={clearPersistedRedux}>
              <Icon name="refresh" type="material" size={24} color={theme.colors.grey1} />
              <Text style={styles.menuItemText}>Clear Persisted Redux & Reset State</Text>
              <Icon name="chevron-right" type="material" size={24} color={theme.colors.grey3} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Icon name="logout" type="material" size={24} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.grey5,
  },
  content: {
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  displayName: {
    fontSize: 20,
    color: theme.colors.grey1,
    marginTop: 12,
  },
  email: {
    fontSize: 16,
    color: theme.colors.grey1,
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.grey2,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey5,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.backgroundDark,
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 30,
  },
  debugSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
