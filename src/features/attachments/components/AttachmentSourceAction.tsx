import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
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
  typography,
} from '../../../design-system/tokens/typography';

import {
  AttachmentSourceChevronIcon,
} from './AttachmentSourceChevronIcon';

type Props = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export function AttachmentSourceAction({
  label,
  disabled = false,
  onPress,
}: Props) {
  const { isRTL } = useLocale();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        isRTL && styles.actionRTL,
        {
          backgroundColor: pressed
            ? colors.surfacePressed
            : colors.surfaceElevated,
          borderColor: pressed
            ? colors.accentSoft
            : colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: colors.textPrimary,
            textAlign: isRTL
              ? 'right'
              : 'left',
          },
        ]}
      >
        {label}
      </Text>

      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.arrowContainer,
          {
            backgroundColor:
              colors.accentSoft,
          },
        ]}
      >
        <AttachmentSourceChevronIcon
          color={colors.accent}
          isRTL={isRTL}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  actionRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '600',
  },
  arrowContainer: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
