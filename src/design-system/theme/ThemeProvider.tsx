import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import {
  useColorScheme,
} from 'react-native';

import {
  useAppSettings,
} from '../../core/settings/AppSettingsProvider';

import {
  AppColors,
  darkColors,
  lightColors,
} from '../tokens/colors';

export type ThemeMode =
  | 'light'
  | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppColors;
};

const ThemeContext =
  createContext<
    ThemeContextValue | null
  >(null);

export function ThemeProvider({
  children,
}: PropsWithChildren) {
  const systemScheme =
    useColorScheme();

  const { settings } =
    useAppSettings();

  const value =
    useMemo<
      ThemeContextValue
    >(() => {
      let mode:
        ThemeMode;

      if (
        settings.theme ===
        'light'
      ) {
        mode = 'light';
      } else if (
        settings.theme ===
        'dark'
      ) {
        mode = 'dark';
      } else {
        mode =
          systemScheme ===
          'light'
            ? 'light'
            : 'dark';
      }

      return {
        mode,

        colors:
          mode === 'dark'
            ? darkColors
            : lightColors,
      };
    }, [
      settings.theme,
      systemScheme,
    ]);

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme():
  ThemeContextValue {
  const value =
    useContext(
      ThemeContext,
    );

  if (!value) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return value;
}
