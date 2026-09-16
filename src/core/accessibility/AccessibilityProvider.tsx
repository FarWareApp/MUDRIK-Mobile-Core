import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';

import {
  useAppSettings,
} from '../settings/AppSettingsProvider';
import {
  useSystemAccessibilityState,
} from './useSystemAccessibilityState';

type AccessibilityContextValue = {
  reducedMotion: boolean;

  systemReducedMotion:
    boolean;

  reducedTransparency:
    boolean;

  systemReducedTransparency:
    boolean;

  hapticsEnabled:
    boolean;

  fontScale: number;
};

const AccessibilityContext =
  createContext<
    AccessibilityContextValue
    | null
  >(null);

export function AccessibilityProvider({
  children,
}: PropsWithChildren) {
  const { settings } =
    useAppSettings();

  const {
    systemReducedMotion,
    systemReducedTransparency,
    fontScale,
  } = useSystemAccessibilityState();

  const value =
    useMemo<
      AccessibilityContextValue
    >(
      () => ({
        reducedMotion:
          settings
            .reducedMotion
          ||
          systemReducedMotion,

        systemReducedMotion,

        reducedTransparency:
          systemReducedTransparency,

        systemReducedTransparency,

        hapticsEnabled:
          settings
            .hapticsEnabled,

        fontScale,
      }),
      [
        fontScale,
        settings
          .hapticsEnabled,
        settings
          .reducedMotion,
        systemReducedMotion,
        systemReducedTransparency,
      ],
    );

  return (
    <AccessibilityContext.Provider
      value={value}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility():
  AccessibilityContextValue {
  const value =
    useContext(
      AccessibilityContext,
    );

  if (!value) {
    throw new Error(
      'useAccessibility must be used inside AccessibilityProvider',
    );
  }

  return value;
}
