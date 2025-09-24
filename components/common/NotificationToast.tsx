import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Notifications from 'expo-notifications';
import { logger } from '@/utils/logger';
import {
  requestMissingPermissions,
  checkAllPermissions,
} from '@/services/PermissionsService';

interface NotificationToastProps {
  isVisible: boolean;
  onDismiss: () => void;
  missingPermissions: {
    notifications: boolean;
    backgroundLocation: boolean;
  };
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  isVisible,
  onDismiss,
  missingPermissions,
}) => {
  const colors = useThemeColors();
  const [slideAnim] = useState(new Animated.Value(-100));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Determine what message to show based on missing permissions
  const getToastContent = () => {
    if (
      missingPermissions.notifications &&
      missingPermissions.backgroundLocation
    ) {
      return {
        title: 'Hey! Several permissions are needed',
        subtitle:
          'Click here to enable notifications and background location',
        actionText: 'Enable Permissions',
      };
    } else if (missingPermissions.notifications) {
      return {
        title: 'Hey! Notifications aren&apos;t enabled',
        subtitle:
          'Click here to enable notifications for DinnaFind',
        actionText: 'Enable Notifications',
      };
    } else if (missingPermissions.backgroundLocation) {
      return {
        title: 'Hey! Background location isn&apos;t set to "Always"',
        subtitle:
          'Click here to enable background location when the app is closed',
        actionText: 'Enable Background Location',
      };
    }
    return {
      title: 'Hey! Some permissions are needed',
      subtitle: 'Click here to enable required permissions for location notifications',
      actionText: 'Enable Permissions',
    };
  };

  const toastContent = getToastContent();

  useEffect(() => {
    if (isVisible) {
      // Slide in from top
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Slide out to top
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim, onDismiss]);

  const handleEnableNotifications = async () => {
    try {
      // Request missing permissions directly through system dialogs
      const requested = await requestMissingPermissions();

      if (requested) {
        logger.info(
          '[NotificationToast] Permissions requested, waiting for user response...',
        );
        // Wait a moment for user to respond to permission prompts
        setTimeout(() => {
          // Check if permissions are now granted
          checkAllPermissions().then((perms) => {
            if (perms.notifications.granted && perms.location.background) {
              logger.info(
                '[NotificationToast] All permissions granted, dismissing toast',
              );
              onDismiss();
            }
          });
        }, 1000);
      } else {
        logger.info(
          '[NotificationToast] No permissions requested, dismissing toast',
        );
        onDismiss();
      }
    } catch (error) {
      logger.error('[NotificationToast] Error handling permissions:', error);
      // Fallback to opening settings if something goes wrong
      Linking.openSettings();
    }
  };

  if (!isVisible) return null;

  const styles = createStyles(colors);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="notifications-outline" size={24} color="#FF4500" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{toastContent.title}</Text>
          <Text style={styles.subtitle}>{toastContent.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Ionicons name="close" size={20} color={colors.grey2} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleEnableNotifications}
      >
        <Text style={styles.actionButtonText}>{toastContent.actionText}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: colors.background,
      marginHorizontal: 16,
      marginTop: 60, // Account for status bar and safe area
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFF5F0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 14,
      color: colors.grey2,
      lineHeight: 18,
    },
    dismissButton: {
      padding: 4,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FF4500',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      gap: 8,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
