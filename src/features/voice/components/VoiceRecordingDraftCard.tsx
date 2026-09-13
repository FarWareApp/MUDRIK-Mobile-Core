import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VoiceRecordingDraft } from '../types';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';
import { VoiceRecordingPlayer } from './VoiceRecordingPlayer';

type Props = {
  draft: VoiceRecordingDraft;
  onDiscard: () => void;
};

export function VoiceRecordingDraftCard({
  draft,
  onDiscard,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('voiceRecordingReady')}
      </Text>

      <VoiceRecordingPlayer uri={draft.uri} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('voiceDiscardRecording')}
        onPress={onDiscard}
        style={({ pressed }) => [
          styles.discard,
          {
            borderColor: colors.border,
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
          },
        ]}
      >
        <Text
          style={{
            color: colors.error,
            fontWeight: '700',
          }}
        >
          {t('voiceDiscard')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },
  title: {
    marginBottom: spacing.md,
    fontSize: typography.secondary,
    fontWeight: '700',
  },
  discard: {
    alignSelf: 'center',
    minHeight: 44,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
