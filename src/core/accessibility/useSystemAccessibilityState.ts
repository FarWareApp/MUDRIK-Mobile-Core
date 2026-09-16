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
    let nativeEventRevision = 0;

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
        (enabled) => {
          nativeEventRevision += 1;
          commitReducedMotion(enabled);
        },
      );

    const queryRevision = nativeEventRevision;

    void AccessibilityInfo
      .isReduceMotionEnabled()
      .then((enabled) => {
        if (nativeEventRevision === queryRevision) {
          commitReducedMotion(enabled);
        }
      })
      .catch(() => {
        if (nativeEventRevision === queryRevision) {
          // Prefer less motion if the native preference cannot be read safely.
          commitReducedMotion(true);
        }
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
    let nativeEventRevision = 0;

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
        (enabled) => {
          nativeEventRevision += 1;
          commitReducedTransparency(enabled);
        },
      );

    const queryRevision = nativeEventRevision;

    void AccessibilityInfo
      .isReduceTransparencyEnabled()
      .then((enabled) => {
        if (nativeEventRevision === queryRevision) {
          commitReducedTransparency(enabled);
        }
      })
      .catch(() => {
        if (nativeEventRevision === queryRevision) {
          // Prefer less transparency if the native preference cannot be read safely.
          commitReducedTransparency(true);
        }
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
