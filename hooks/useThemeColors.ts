import { useColorScheme } from 'react-native';
import { theme } from '@/theme';
import { useAppSelector } from '@/store';
import { selectTheme } from '@/store/slices/uiSlice';

/**
 * Hook to get theme colors that respond to user preference and system color scheme
 * Use this for custom StyleSheets and plain React Native components
 */
export function useThemeColors() {
  const systemColorScheme = useColorScheme();
  const userThemePreference = useAppSelector(selectTheme);

  // Determine if dark mode should be active:
  // - If user set 'auto', follow system preference
  // - Otherwise, use user's explicit choice
  const isDark = userThemePreference === 'auto'
    ? systemColorScheme === 'dark'
    : userThemePreference === 'dark';

  return {
    // Backgrounds
    background: isDark ? theme.colors.backgroundDark : theme.colors.background,
    surface: isDark ? theme.colors.surfaceDark : theme.colors.surface,

    // Text
    text: isDark ? theme.colors.textDark : theme.colors.text,
    textSecondary: isDark ? theme.colors.textSecondaryDark : theme.colors.textSecondary,

    // Primary colors (same in both modes)
    primary: theme.colors.primary,
    primaryDark: theme.colors.primaryDark,
    primaryLight: theme.colors.primaryLight,
    secondary: theme.colors.secondary,

    // Status colors (same in both modes)
    error: theme.colors.error,
    warning: theme.colors.warning,
    success: theme.colors.success,
    info: theme.colors.info,

    // Grays (inverted in dark mode)
    grey1: isDark ? theme.colors.grey6 : theme.colors.grey1,
    grey2: isDark ? theme.colors.grey5 : theme.colors.grey2,
    grey3: isDark ? theme.colors.grey4 : theme.colors.grey3,
    grey4: isDark ? theme.colors.grey3 : theme.colors.grey4,
    grey5: isDark ? theme.colors.grey2 : theme.colors.grey5,
    grey6: isDark ? theme.colors.grey1 : theme.colors.grey6,

    // Helper
    isDark,
  };
}
