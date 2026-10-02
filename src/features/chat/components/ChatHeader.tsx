import React, {
  memo,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  flagshipPalette,
} from '../../../design-system/tokens/flagship';
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
    const {
      t,
      isRTL,
    } = useLocale();
    const {
      colors,
      mode,
    } = useTheme();
    const { reducedMotion } =
      useAccessibility();
    const palette =
      flagshipPalette[mode];

    return (
      <View
        style={[
          styles.header,
          isRTL
            && styles.headerRTL,
          {
            borderBottomColor:
              palette.hairline,
          },
        ]}
      >
        <LinearGradient
          colors={palette.card}
          start={{
            x: 0.1,
            y: 0,
          }}
          end={{
            x: 0.9,
            y: 1,
          }}
          style={[
            styles.brandMark,
            {
              borderColor:
                palette.hairline,
              shadowColor:
                colors.shadow,
            },
          ]}
          importantForAccessibility="no"
        >
          <Text
            style={[
              styles.brandLetter,
              {
                color:
                  colors.accent,
              },
            ]}
          >
            M
          </Text>

          <View
            style={[
              styles.brandMetal,
              {
                backgroundColor:
                  palette.metal,
              },
            ]}
          />
        </LinearGradient>

        <View style={styles.titleGroup}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color:
                  colors.textPrimary,
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {t('chatTitle')}
          </Text>

          <View
            style={[
              styles.subtitleRow,
              isRTL
                && styles.subtitleRowRTL,
            ]}
          >
            <View
              importantForAccessibility="no"
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    colors.success,
                },
              ]}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                {
                  color:
                    colors.textSecondary,
                  textAlign: isRTL
                    ? 'right'
                    : 'left',
                },
              ]}
            >
              {t('newConversation')}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            t('newConversation')
          }
          hitSlop={4}
          onPress={onNewConversation}
          style={({ pressed }) => [
            styles.newButtonFrame,
            {
              shadowColor:
                colors.shadow,
              opacity:
                pressed ? 0.96 : 1,
              transform: [
                {
                  scale:
                    pressed
                    && !reducedMotion
                      ? motion.press
                          .scale
                      : 1,
                },
              ],
            },
          ]}
        >
          {({ pressed }) => (
            <LinearGradient
              colors={
                pressed
                  ? palette
                      .secondaryAction
                  : palette.card
              }
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={[
                styles.newButton,
                {
                  borderColor:
                    palette.hairline,
                },
              ]}
            >
              <View
                importantForAccessibility="no"
                style={[
                  styles.buttonHighlight,
                  {
                    backgroundColor:
                      palette.shine,
                  },
                ]}
              />

              <ChatNewConversationIcon
                color={colors.accent}
              />
            </LinearGradient>
          )}
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    backgroundColor:
      'transparent',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  brandMark: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  brandLetter: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  brandMetal: {
    position: 'absolute',
    top: 0,
    start: 10,
    end: 10,
    height: 1,
    opacity: 0.72,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize:
      typography.heading,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  subtitleRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subtitleRowRTL: {
    flexDirection: 'row-reverse',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  subtitle: {
    flexShrink: 1,
    fontSize:
      typography.caption,
    lineHeight: 16,
    fontWeight: '600',
  },
  newButtonFrame: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  newButton: {
    flex: 1,
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    start: 10,
    end: 10,
    height: 1,
    opacity: 0.66,
    borderRadius: radius.pill,
  },
});
