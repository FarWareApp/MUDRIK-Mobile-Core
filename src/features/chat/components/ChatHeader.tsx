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

type Props = {
  onNewConversation: () => void;
};

export function ChatHeader({
  onNewConversation,
}: Props) {
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        isRTL && styles.headerRTL,
        {
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <View style={styles.titleGroup}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              textAlign: isRTL
                ? 'right'
                : 'left',
            },
          ]}
        >
          {t('chatTitle')}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              textAlign: isRTL
                ? 'right'
                : 'left',
            },
          ]}
        >
          {t('newConversation')}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          t('newConversation')
        }
        hitSlop={4}
        onPress={onNewConversation}
        style={({ pressed }) => [
          styles.newButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: pressed
              ? colors.accentSoft
              : colors.border,
            transform: [
              {
                scale: pressed
                  ? 0.96
                  : 1,
              },
            ],
          },
        ]}
      >
        <Text
          importantForAccessibility="no"
          style={[
            styles.newGlyph,
            { color: colors.accent },
          ]}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: typography.heading,
    lineHeight: 23,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 1,
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: '500',
  },
  newButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGlyph: {
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '500',
  },
});
