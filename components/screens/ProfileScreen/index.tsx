import { Icon } from '@rneui/themed';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { selectUser } from '@/store/slices/authSlice';
import { selectTheme, setTheme } from '@/store/slices/uiSlice';
import { useThemeColors } from '@/hooks/useThemeColors';
import { UserAvatar } from '@/components/common/UserAvatar';
import { logger } from '@/utils/logger';
import { branchService } from '@/services/BranchService';
import * as ExpoClipboard from 'expo-clipboard';

export function ProfileScreen() {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const { user, signOut, deleteAccount } = useAuth();
  const currentUser = useAppSelector(selectUser);
  const currentTheme = useAppSelector(selectTheme);

  // Debug logging to see what user data we have
  React.useEffect(() => {
    logger.info('ProfileScreen: Auth user:', user);
    logger.info('ProfileScreen: Redux currentUser:', currentUser);
    logger.info('ProfileScreen: User photoUrl:', currentUser?.photoUrl);
    logger.info('ProfileScreen: Auth user metadata:', user?.user_metadata);
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

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteAccount();
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Success', 'Your account has been deleted.');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ],
    );
  };

  const handleThemeChange = (newTheme: 'auto' | 'light' | 'dark') => {
    dispatch(setTheme(newTheme));
  };

  const getThemeLabel = (themeValue: 'auto' | 'light' | 'dark') => {
    switch (themeValue) {
      case 'auto':
        return 'System';
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
    }
  };

  const handleGenerateTestLink = async () => {
    try {
      logger.info('[TestLink] Generating test Branch link...');

      // Create a test venue link for a popular restaurant
      // Using Foursquare venue ID for testing
      const testVenueId = '4a3b1f00f964a520c6b51fe3'; // Example: popular restaurant
      const testVenueName = 'Test Restaurant - DinnaFind';

      const branchLink = await branchService.createVenueLink(
        testVenueId,
        testVenueName,
        {
          channel: 'test',
          feature: 'test_share',
          campaign: 'development_testing',
          tags: ['test', 'development'],
          data: {
            venueId: testVenueId,
            venueName: testVenueName,
            venueCategory: 'Restaurant',
            venueAddress: '123 Test Street',
            autoSave: true,
            type: 'restaurant',
          },
        }
      );

      logger.info('[TestLink] Branch link created:', branchLink);

      // Copy to clipboard
      await ExpoClipboard.setStringAsync(branchLink);

      // Show options to share or just copy
      Alert.alert(
        'Test Branch Link Generated',
        `Link copied to clipboard!\n\n${branchLink}\n\nThis link will:\n• Open the app if installed\n• Redirect to App Store/Play Store if not installed\n• Work on both iOS and Android`,
        [
          {
            text: 'Share via Text',
            onPress: async () => {
              try {
                await Share.share({
                  message: `Check out this restaurant on DinnaFind!\n\n${branchLink}`,
                  title: 'Test DinnaFind Link',
                });
              } catch (error) {
                logger.error('[TestLink] Share failed:', error);
              }
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      logger.error('[TestLink] Failed to generate test link:', error);
      Alert.alert('Error', `Failed to generate test link: ${error.message}`);
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <UserAvatar user={currentUser} size={100} />
          <Text style={styles.displayName}>
            {currentUser?.displayName || 'No name'}
          </Text>
          <Text style={styles.email}>{currentUser?.email || 'No email'}</Text>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Icon
                  name="brightness-6"
                  type="material"
                  size={24}
                  color={colors.grey1}
                />
                <Text style={styles.settingLabel}>Theme</Text>
              </View>
              <View style={styles.themeButtons}>
                {(['auto', 'light', 'dark'] as const).map((themeOption) => (
                  <TouchableOpacity
                    key={themeOption}
                    style={[
                      styles.themeButton,
                      currentTheme === themeOption && styles.themeButtonActive,
                    ]}
                    onPress={() => handleThemeChange(themeOption)}
                    accessibilityRole="button"
                    accessibilityLabel={`${getThemeLabel(themeOption)} theme`}
                    accessibilityState={{ selected: currentTheme === themeOption }}
                    accessibilityHint={`Double tap to switch to ${getThemeLabel(themeOption)} mode`}
                  >
                    <Text
                      style={[
                        styles.themeButtonText,
                        currentTheme === themeOption && styles.themeButtonTextActive,
                      ]}
                    >
                      {getThemeLabel(themeOption)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityHint="Signs you out of your account"
        >
          <Icon
            name="logout"
            type="material"
            size={24}
            color={colors.error}
          />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Developer Tools - Only show in development */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devSectionTitle}>Developer Tools</Text>
            <TouchableOpacity
              style={styles.testLinkButton}
              onPress={handleGenerateTestLink}
              accessibilityRole="button"
              accessibilityLabel="Generate test Branch link"
              accessibilityHint="Creates a shareable test link for development testing"
            >
              <Icon
                name="link"
                type="material"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.testLinkText}>Generate Test Branch Link</Text>
            </TouchableOpacity>
            <Text style={styles.devHelperText}>
              Creates a shareable Branch.io link that works on both iOS and Android.
              Perfect for testing deep linking!
            </Text>
          </View>
        )}

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityHint="Permanently deletes your account and all data"
          >
            <Icon
              name="delete-forever"
              type="material"
              size={24}
              color="white"
            />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey5,
  },
  content: {
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: colors.background,
    marginBottom: 20,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.grey1,
    marginTop: 12,
  },
  email: {
    fontSize: 16,
    color: colors.grey2,
    marginTop: 4,
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'column',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.grey1,
    marginLeft: 12,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grey4,
    backgroundColor: colors.background,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  themeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.grey2,
  },
  themeButtonTextActive: {
    color: 'white',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey2,
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
    borderBottomColor: colors.grey5,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.backgroundDark,
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
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
  devSection: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  devSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  testLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
    minHeight: 44,
  },
  testLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  devHelperText: {
    fontSize: 12,
    color: colors.grey2,
    lineHeight: 16,
    marginTop: 4,
  },
  dangerZone: {
    marginTop: 40,
    marginHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.grey4,
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});
