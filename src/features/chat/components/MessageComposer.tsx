import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

type Props = {
  sending: boolean;
  onSend: (text: string) => Promise<void>;
  onStop: () => void;
};

export function MessageComposer({
  sending,
  onSend,
  onStop,
}: Props) {
  const [text, setText] = useState('');

  const { colors } = useTheme();
  const { isRTL, t } = useLocale();

  const canSend =
    text.trim().length > 0 && !sending;

  const submit = async () => {
    if (!canSend) {
      return;
    }

    const value = text;

    setText('');

    await onSend(value);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.composer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attachments"
          style={styles.sideButton}
        >
          <Text
            style={[
              styles.sideButtonText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            ＋
          </Text>
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          editable={!sending}
          multiline
          maxLength={12000}
          placeholder={t('composerPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voice"
          disabled={sending}
          style={styles.sideButton}
        >
          <Text
            style={[
              styles.voiceText,
              {
                color: colors.textSecondary,
                opacity: sending ? 0.4 : 1,
              },
            ]}
          >
            ◉
          </Text>
        </Pressable>

        {sending ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop"
            onPress={onStop}
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.accent,
              },
            ]}
          >
            <View style={styles.stopIcon} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={() => {
              void submit();
            }}
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend
                  ? colors.accent
                  : colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={{
                color: canSend
                  ? colors.accentText
                  : colors.textSecondary,
                fontSize: 18,
                fontWeight: '800',
              }}
            >
              ↑
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  composer: {
    minHeight: 54,
    maxHeight: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: 5,
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 140,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 9,
    fontSize: 16,
    writingDirection: 'auto',
  },

  sideButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sideButtonText: {
    fontSize: 26,
  },

  voiceText: {
    fontSize: 20,
  },

  sendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },

  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
