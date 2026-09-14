import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../../core/localization/LocaleProvider';
import { useTheme } from '../../../../design-system/theme/ThemeProvider';
import { radius } from '../../../../design-system/tokens/radius';

import { ComposerActionButton } from './ComposerActionButton';
import { ComposerPaperclipIcon } from './ComposerPaperclipIcon';

type Props = {
  attachmentCount: number;
  disabled: boolean;
  onPress?: () => void;
};

export function ComposerAttachmentButton({
  attachmentCount,
  disabled,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();

  const badgeText =
    attachmentCount > 99
      ? '99+'
      : String(attachmentCount);

  const accessibilityLabel =
    attachmentCount > 0
      ? `${t('attachments')} (${attachmentCount})`
      : t('attachments');

  return (
    <ComposerActionButton
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.content}>
        <ComposerPaperclipIcon
          color={colors.textSecondary}
        />

        {attachmentCount > 0 && (
          <View
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.badge,
              isRTL
                ? styles.badgeRTL
                : styles.badgeLTR,
              {
                backgroundColor:
                  colors.accent,
                borderColor:
                  colors.surfaceInput,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: colors.accentText },
              ]}
            >
              {badgeText}
            </Text>
          </View>
        )}
      </View>
    </ComposerActionButton>
  );
}

const styles = StyleSheet.create({
  content: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLTR: {
    right: 0,
  },
  badgeRTL: {
    left: 0,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
});
