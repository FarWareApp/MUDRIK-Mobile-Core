import {
  useEffect,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  useWindowDimensions,
} from 'react-native';

type SystemAccessibilityState = {
  systemReducedMotion: boolean;
  systemReducedTransparency: boolean;
  fontScale: number;
};

export function useSystemAccessibilityState(): SystemAccessibilityState {
  const { fontScale } = useWindowDimensions();

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

    const commitReducedMotion = (
      enabled: boolean,
    ) => {
      if (mounted) {
        setSystemReducedMotion(enabled);
      }
    };

    const subscription =
      AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        commitReducedMotion,
      );

    void AccessibilityInfo
      .isReduceMotionEnabled()
      .then(commitReducedMotion)
      .catch(() => {
        // Prefer less motion if the native preference cannot be read safely.
        commitReducedMotion(true);
      });

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

    const commitReducedTransparency = (
      enabled: boolean,
    ) => {
      if (mounted) {
        setSystemReducedTransparency(enabled);
      }
    };

    const subscription =
      AccessibilityInfo.addEventListener(
        'reduceTransparencyChanged',
        commitReducedTransparency,
      );

    void AccessibilityInfo
      .isReduceTransparencyEnabled()
      .then(commitReducedTransparency)
      .catch(() => {
        // Prefer less transparency if the native preference cannot be read safely.
        commitReducedTransparency(true);
      });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return {
    systemReducedMotion,
    systemReducedTransparency,
    fontScale,
  };
}
