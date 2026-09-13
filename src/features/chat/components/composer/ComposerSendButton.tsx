import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../../core/localization/LocaleProvider';
import { useTheme } from '../../../../design-system/theme/ThemeProvider';

import { ComposerActionButton } from './ComposerActionButton';

type Props = {
  sending: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
};

export function ComposerSendButton({
  sending,
  canSend,
  onSend,
  onStop,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (sending) {
    return (
      <ComposerActionButton
        accessibilityLabel={t('stop')}
        emphasized
        onPress={onStop}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.stop,
            { backgroundColor: colors.accentText },
          ]}
        />
      </ComposerActionButton>
    );
  }

  return (
    <ComposerActionButton
      accessibilityLabel={t('send')}
      disabled={!canSend}
      emphasized={canSend}
      onPress={onSend}
    >
      <Text
        importantForAccessibility="no"
        style={[
          styles.sendGlyph,
          {
            color: canSend
              ? colors.accentText
              : colors.textSecondary,
          },
        ]}
      >
        ↑
      </Text>
    </ComposerActionButton>
  );
}

const styles = StyleSheet.create({
  sendGlyph: {
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '800',
  },
  stop: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
