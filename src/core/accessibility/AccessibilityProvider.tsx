import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AccessibilityInfo,
  Platform,
  useWindowDimensions,
} from 'react-native';

import {
  useAppSettings,
} from '../settings/AppSettingsProvider';

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

  const { fontScale } =
    useWindowDimensions();

  const [
    systemReducedMotion,
    setSystemReducedMotion,
  ] = useState(false);

  const [
    systemReducedTransparency,
    setSystemReducedTransparency,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo
      .isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setSystemReducedMotion(
            enabled,
          );
        }
      });

    const subscription =
      AccessibilityInfo
        .addEventListener(
          'reduceMotionChanged',
          (
            enabled:
              boolean,
          ) => {
            setSystemReducedMotion(
              enabled,
            );
          },
        );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let mounted = true;

    void AccessibilityInfo
      .isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted) {
          setSystemReducedTransparency(
            enabled,
          );
        }
      });

    const subscription =
      AccessibilityInfo
        .addEventListener(
          'reduceTransparencyChanged',
          (
            enabled:
              boolean,
          ) => {
            setSystemReducedTransparency(
              enabled,
            );
          },
        );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

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
