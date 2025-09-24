import { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ViewStyle, View } from 'react-native';
import { Icon } from '@rneui/themed';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SpinningButtonProps {
  title: string;
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: {
    name: string;
    type?: string;
    size?: number;
    color?: string;
  };
  variant?: 'primary' | 'google' | 'github' | 'apple';
}

export function SpinningButton({
  title,
  onPress,
  loading,
  disabled = false,
  style,
  icon,
  variant = 'primary',
}: SpinningButtonProps) {
  const colors = useThemeColors();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
    } else {
      spinValue.setValue(0);
    }
  }, [loading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = createStyles(colors);

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'google':
        return {
          container: styles.authButton,
          text: styles.authButtonText,
          icon: { color: colors.isDark ? '#FFFFFF' : '#000000' },
        };
      case 'github':
        return {
          container: styles.authButton,
          text: styles.authButtonText,
          icon: { color: colors.isDark ? '#FFFFFF' : '#000000' },
        };
      case 'apple':
        return {
          container: styles.authButton,
          text: styles.authButtonText,
          icon: { color: colors.isDark ? '#FFFFFF' : '#000000' },
        };
      case 'primary':
      default:
        return {
          container: styles.primaryButton,
          text: styles.primaryButtonText,
          icon: { color: '#FFFFFF' },
        };
    }
  };

  const variantStyles = getVariantStyles();

  const buttonStyle = [
    styles.button,
    variantStyles.container,
    (loading || disabled) && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    variantStyles.text,
  ];

  const iconColor = loading ? variantStyles.icon.color : (icon?.color || variantStyles.icon.color);

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={loading ? "Loading, please wait" : "Double tap to activate"}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
    >
      {loading ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }} testID="spinning-icon">
          <Icon name="refresh" type="material" size={20} color={iconColor} />
        </Animated.View>
      ) : (
        <View style={styles.contentContainer}>
          {icon && (
            <View style={styles.iconContainer}>
              <Icon
                name={icon.name}
                type={icon.type || 'material'}
                size={icon.size || 20}
                color={iconColor}
              />
            </View>
          )}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    button: {
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
      minHeight: 52,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    authButton: {
      backgroundColor: colors.isDark ? '#2D2D2D' : '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.isDark ? '#404040' : '#E0E0E0',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    authButtonText: {
      color: colors.isDark ? '#FFFFFF' : '#000000',
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      marginRight: 12,
    },
  });
