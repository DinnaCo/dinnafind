import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onValueChange,
  style,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              isSelected && styles.segmentActive,
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
            ]}
            onPress={() => onValueChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderRadius: 8,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.grey4,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      marginLeft: -1,
    },
    segmentFirst: {
      marginLeft: 0,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    segmentLast: {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    segmentActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      zIndex: 1,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
  });
