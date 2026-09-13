import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  AdaptiveGlassSurface,
} from '../../../design-system/components/AdaptiveGlassSurface';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

import {
  SendingIndicatorDot,
} from './SendingIndicatorDot';

export function SendingIndicator() {
  const { t } = useLocale();
  const { colors } = useTheme();

  return (
    <AdaptiveGlassSurface
      style={[
        styles.container,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View
        accessible
        accessibilityLabel={
          t('responseInProgress')
        }
        accessibilityLiveRegion="polite"
        style={styles.dots}
      >
        {[0, 1, 2].map((index) => (
          <SendingIndicatorDot
            key={index}
            index={index}
          />
        ))}
      </View>
    </AdaptiveGlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  dots: {
    minWidth: 54,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
