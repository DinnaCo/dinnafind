import type React from 'react';

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Icon } from '@rneui/themed';

import { useThemeColors } from '@/hooks/useThemeColors';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
}) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
        <Icon color="white" name={category.icon} size={24} />
      </View>
      <Text style={styles.name}>{category.name}</Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { alignItems: 'center', marginHorizontal: 8 },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    name: { fontSize: 14, color: colors.grey1, textAlign: 'center' },
  });
