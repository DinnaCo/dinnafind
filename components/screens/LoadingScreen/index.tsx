import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
}) => {
  const colors = useThemeColors();
  const [showRetry, setShowRetry] = useState(false);
  const router = useRouter();

  // Show retry option if loading takes too long
  useEffect(() => {
    const retryTimer = setTimeout(() => {
      setShowRetry(true);
    }, 8000); // Show retry after 8 seconds

    return () => clearTimeout(retryTimer);
  }, []);

  const handleRetry = () => {
    // Navigate to the main app and let it reinitialize
    router.replace('/(tabs)');
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="restaurant-outline" size={64} color={colors.primary} />
        <Text style={styles.title}>DinnaFind</Text>
        <Text style={styles.message}>{message}</Text>

        {showRetry && (
          <View style={styles.retryContainer}>
            <Text style={styles.retryText}>Taking longer than expected?</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grey5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  retryText: {
    fontSize: 14,
    color: colors.grey2,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default LoadingScreen;
