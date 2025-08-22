import React, { ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider as RNEThemeProvider, createTheme } from '@rneui/themed';
import { theme as baseTheme } from '@/theme';
import { useAppSelector } from '@/store';
import { selectTheme } from '@/store/slices/uiSlice';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const userThemePreference = useAppSelector(selectTheme);

  // Determine if dark mode should be active:
  // - If user set 'auto', follow system preference
  // - Otherwise, use user's explicit choice
  const isDark = userThemePreference === 'auto'
    ? systemColorScheme === 'dark'
    : userThemePreference === 'dark';

  // Create React Native Elements theme based on system color scheme
  const rneTheme = useMemo(
    () =>
      createTheme({
        lightColors: {
          primary: baseTheme.colors.primary,
          secondary: baseTheme.colors.secondary,
          background: baseTheme.colors.background,
          white: baseTheme.colors.background,
          black: baseTheme.colors.text,
          grey0: baseTheme.colors.grey1,
          grey1: baseTheme.colors.grey2,
          grey2: baseTheme.colors.grey3,
          grey3: baseTheme.colors.grey4,
          grey4: baseTheme.colors.grey5,
          grey5: baseTheme.colors.grey6,
          error: baseTheme.colors.error,
          warning: baseTheme.colors.warning,
          success: baseTheme.colors.success,
        },
        darkColors: {
          primary: baseTheme.colors.primary,
          secondary: baseTheme.colors.secondary,
          background: baseTheme.colors.backgroundDark,
          white: baseTheme.colors.surfaceDark,
          black: baseTheme.colors.textDark,
          grey0: baseTheme.colors.grey6,
          grey1: baseTheme.colors.grey5,
          grey2: baseTheme.colors.grey4,
          grey3: baseTheme.colors.grey3,
          grey4: baseTheme.colors.grey2,
          grey5: baseTheme.colors.grey1,
          error: baseTheme.colors.error,
          warning: baseTheme.colors.warning,
          success: baseTheme.colors.success,
        },
        mode: isDark ? 'dark' : 'light',
      }),
    [isDark]
  );

  return <RNEThemeProvider theme={rneTheme}>{children}</RNEThemeProvider>;
}
