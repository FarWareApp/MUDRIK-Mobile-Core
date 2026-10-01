import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
} from 'react-native-reanimated';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  BrandAura,
} from '../../../design-system/components/BrandAura';
import {
  PremiumHeroSurface,
} from '../../../design-system/components/PremiumHeroSurface';
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
  HomeCommandTile,
} from './HomeCommandTile';
import {
  HomeVoiceIcon,
} from './HomeVoiceIcon';
import {
  QuickActionCompanionIcon,
} from './QuickActionCompanionIcon';
import {
  QuickActionConversationsIcon,
} from './QuickActionConversationsIcon';
import {
  QuickActionProjectsIcon,
} from './QuickActionProjectsIcon';
import {
  QuickActionSettingsIcon,
} from './QuickActionSettingsIcon';

type Props = {
  onVoice: () => void;
  onConversations: () => void;
  onProjects: () => void;
  onCompanion: () => void;
  onSettings: () => void;
};

export function EmptyChatState({
  onVoice,
  onConversations,
  onProjects,
  onCompanion,
  onSettings,
}: Props) {
  const { reducedMotion } =
    useAccessibility();
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInUp.duration(
              motion.duration.standard,
            )
      }
      style={styles.container}
    >
      <PremiumHeroSurface
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View
            importantForAccessibility="no-hide-descendants"
            style={styles.logoHalo}
          >
            <View style={styles.logoAura}>
              <BrandAura
                size={84}
                compact
              />
            </View>
            <View
              style={[
                styles.logo,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Text
                importantForAccessibility="no"
                style={[
                  styles.logoText,
                  {
                    color: colors.accent,
                  },
                ]}
              >
                M
              </Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color: colors.accent,
                },
              ]}
            >
              {t('homeCommandEyebrow')}
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color:
                    colors.textPrimary,
                },
              ]}
            >
              {t('emptyChatTitle')}
            </Text>

            <Text
              style={[
                styles.body,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
            >
              {t('homeCommandBody')}
            </Text>
          </View>
        </View>

        <View
          importantForAccessibility="no"
          style={[
            styles.statusRail,
            {
              backgroundColor:
                colors.surfaceInput,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  colors.success,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t('homeCommandReady')}
          </Text>
        </View>
      </PremiumHeroSurface>

      <View style={styles.commandGrid}>
        <HomeCommandTile
          primary
          label={t('voice')}
          description={
            t('homeVoiceDescription')
          }
          icon={(
            <HomeVoiceIcon
              color={colors.accent}
            />
          )}
          onPress={onVoice}
        />

        <HomeCommandTile
          label={t('conversations')}
          description={
            t('homeConversationsDescription')
          }
          icon={(
            <QuickActionConversationsIcon
              color={colors.accent}
            />
          )}
          onPress={onConversations}
        />

        <HomeCommandTile
          label={t('projects')}
          description={
            t('homeProjectsDescription')
          }
          icon={(
            <QuickActionProjectsIcon
              color={colors.accent}
            />
          )}
          onPress={onProjects}
        />

        <HomeCommandTile
          label={t('companion')}
          description={
            t('homeCompanionDescription')
          }
          icon={(
            <QuickActionCompanionIcon
              color={colors.accent}
            />
          )}
          onPress={onCompanion}
        />

        <HomeCommandTile
          label={t('settings')}
          description={
            t('homeSettingsDescription')
          }
          icon={(
            <QuickActionSettingsIcon
              color={colors.accent}
            />
          )}
          onPress={onSettings}
        />
      </View>

      <Text
        style={[
          styles.footer,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {t('homeComposerHint')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  hero: {
    width: '100%',
    borderRadius: radius.xxl,
    padding: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  logoHalo: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoAura: {
    position: 'absolute',
  },
  logo: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth:
      StyleSheet.hairlineWidth,
  },
  logoText: {
    fontSize: typography.title,
    lineHeight: 28,
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: typography.micro,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    writingDirection: 'auto',
  },
  title: {
    marginTop: spacing.xs,
    fontSize: typography.hero,
    lineHeight: 34,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  body: {
    marginTop: spacing.xs,
    fontSize: typography.secondary,
    lineHeight: 21,
    writingDirection: 'auto',
  },
  statusRail: {
    minHeight: 40,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  statusText: {
    flex: 1,
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  commandGrid: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.caption,
    lineHeight: 17,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
