import React, { memo } from 'react';
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
  motion,
} from '../../../design-system/tokens/motion';
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
  ChatNewConversationIcon,
} from './ChatNewConversationIcon';

type Props = {
  onNewConversation: () => void;
};

export const ChatHeader = memo(
  function ChatHeader({
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
          backgroundColor:
            colors.background,
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.brandMark,
          {
            backgroundColor:
              colors.accentSoft,
            borderColor: colors.border,
          },
        ]}
        importantForAccessibility="no"
      >
        <View
          style={[
            styles.brandDot,
            {
              backgroundColor:
                colors.accent,
            },
          ]}
        />
      </View>

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
              : colors.surface,
            borderColor: pressed
              ? colors.accentSoft
              : colors.border,
            shadowColor: colors.shadow,
            shadowOpacity:
              pressed ? 0.04 : 0.08,
            transform: [
              {
                scale: pressed
                  ? motion.press.scale
                  : 1,
              },
            ],
          },
        ]}
      >
        <ChatNewConversationIcon
          color={colors.accent}
        />
      </Pressable>
    </View>
  );
  },
);

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
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
  brandMark: {
    width: 12,
    height: 38,
    borderRadius: radius.pill,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDot: {
    width: 4,
    height: 18,
    borderRadius: radius.pill,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: typography.heading,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: '500',
  },
  newButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
});
