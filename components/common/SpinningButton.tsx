import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';
import { theme } from '@/theme';

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
  variant?: 'primary' | 'google';
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

  const buttonStyle = [
    styles.button,
    variant === 'google' ? styles.googleButton : styles.primaryButton,
    (loading || disabled) && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    variant === 'google' ? styles.googleButtonText : styles.primaryButtonText,
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={loading || disabled}>
      {loading ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }} testID="spinning-icon">
          <Icon name="refresh" type="material" size={20} color="white" />
        </Animated.View>
      ) : (
        <>
          {icon && (
            <Icon
              name={icon.name}
              type={icon.type || 'material'}
              size={icon.size || 20}
              color={icon.color || 'white'}
            />
          )}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: 'white',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
