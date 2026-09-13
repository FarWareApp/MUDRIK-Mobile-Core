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
  const { t } = useLocale();

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
        <Text
          importantForAccessibility="no"
          style={[
            styles.glyph,
            { color: colors.textSecondary },
          ]}
        >
          📎
        </Text>

        {attachmentCount > 0 && (
          <View
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.badge,
              { backgroundColor: colors.accent },
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
  glyph: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 1,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
});
