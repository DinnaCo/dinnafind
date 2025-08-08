import { Icon } from '@rneui/themed';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { selectUser } from '@/store/slices/authSlice';
import { theme } from '@/theme';
import { UserAvatar } from '@/components/common/UserAvatar';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const currentUser = useAppSelector(selectUser);

  // Debug logging to see what user data we have
  React.useEffect(() => {
    console.log('ProfileScreen: Auth user:', user);
    console.log('ProfileScreen: Redux currentUser:', currentUser);
    console.log('ProfileScreen: User photoUrl:', currentUser?.photoUrl);
    console.log('ProfileScreen: Auth user metadata:', user?.user_metadata);
  }, [user, currentUser]);

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
          <UserAvatar user={currentUser} size={100} />
          <Text style={styles.displayName}>{currentUser?.displayName || 'No name'}</Text>
          <Text style={styles.email}>{currentUser?.email || 'No email'}</Text>
        </View>
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
    fontWeight: '600',
    color: theme.colors.grey1,
    marginTop: 12,
  },
  email: {
    fontSize: 16,
    color: theme.colors.grey2,
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
