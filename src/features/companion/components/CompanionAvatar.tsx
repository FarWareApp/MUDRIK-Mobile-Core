import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  CompanionPresentation,
  CompanionSessionPhase,
} from '../../../contracts/Companion';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  PremiumHeroSurface,
} from '../../../design-system/components/PremiumHeroSurface';
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
  typeScale,
  typography,
} from '../../../design-system/tokens/typography';
import {
  getCompanionPhaseTranslationKey,
} from '../getCompanionPhaseTranslationKey';
import {
  CompanionAvatarMark,
} from './CompanionAvatarMark';

type Props = {
  presentation: CompanionPresentation;
  phase: CompanionSessionPhase;
  name: string;
};

export function CompanionAvatar({
  presentation,
  phase,
  name,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const phaseLabel =
    t(
      getCompanionPhaseTranslationKey(
        phase,
      ),
    );

  const speaking =
    phase === 'speaking';
  const listening =
    phase === 'listening';
  const processing =
    phase === 'processing';
  const active =
    listening
    || processing
    || speaking;

  const stageColor =
    phase === 'error'
      ? colors.error
      : speaking
        ? colors.accent
        : listening
          ? colors.success
          : colors.accent;

  const foreground =
    speaking
      ? colors.accentText
      : colors.textPrimary;

  const markAccent =
    speaking
      ? colors.accentText
      : stageColor;

  return (
    <PremiumHeroSurface
      active={active}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.accent,
              },
            ]}
          >
            {t('companionStudioEyebrow')}
          </Text>

          <Text
            style={[
              styles.heading,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            {t('companionPresenceTitle')}
          </Text>
        </View>

        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            phaseLabel
          }
          style={[
            styles.phaseBadge,
            {
              backgroundColor:
                active
                  ? colors.accentSoft
                  : colors.surfaceInput,
              borderColor:
                active
                  ? colors.accentSoft
                  : colors.border,
            },
          ]}
        >
          <View
            importantForAccessibility="no"
            style={[
              styles.phaseDot,
              {
                backgroundColor:
                  stageColor,
              },
            ]}
          />
          <Text
            style={[
              styles.phaseBadgeText,
              {
                color: active
                  ? colors.accent
                  : colors.textSecondary,
              },
            ]}
          >
            {phaseLabel}
          </Text>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={
          `${name}. ${phaseLabel}`
        }
        style={styles.stage}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.outerHalo,
            {
              borderColor:
                active
                  ? stageColor
                  : colors.border,
              backgroundColor:
                active
                  ? colors.accentSoft
                  : colors.surfaceInput,
            },
          ]}
        >
          <View
            style={[
              styles.middleHalo,
              {
                borderColor:
                  active
                    ? stageColor
                    : colors.border,
                backgroundColor:
                  colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    speaking
                      ? colors.accent
                      : colors.surfaceElevated,
                  borderColor:
                    active
                      ? stageColor
                      : colors.border,
                  shadowColor:
                    colors.shadow,
                },
              ]}
            >
              <CompanionAvatarMark
                presentation={
                  presentation
                }
                color={foreground}
                accentColor={
                  markAccent
                }
                active={active}
              />
            </View>
          </View>

          <View
            style={[
              styles.signalDot,
              styles.signalDotTop,
              {
                backgroundColor:
                  stageColor,
                opacity:
                  active ? 0.9 : 0.3,
              },
            ]}
          />
          <View
            style={[
              styles.signalDot,
              styles.signalDotBottom,
              {
                backgroundColor:
                  stageColor,
                opacity:
                  active ? 0.55 : 0.18,
              },
            ]}
          />
        </View>

        <Text
          importantForAccessibility="no"
          style={[
            styles.name,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          {name}
        </Text>

        <Text
          importantForAccessibility="no"
          style={[
            styles.phase,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {t(
            active
              ? 'companionPresenceActiveCaption'
              : 'companionPresenceIdleCaption',
          )}
        </Text>
      </View>

      <View
        style={[
          styles.capabilityRail,
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
            styles.capabilityDot,
            {
              backgroundColor:
                colors.success,
            },
          ]}
        />
        <Text
          style={[
            styles.capabilityText,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {t(
            'companionPresenceCapability',
          )}
        </Text>
      </View>
    </PremiumHeroSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 460,
    padding: spacing.xl,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: typography.micro,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.7,
    writingDirection: 'auto',
  },
  heading: {
    ...typeScale.heading,
    marginTop: spacing.xs,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  phaseBadge: {
    minHeight: 36,
    maxWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  phaseDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  phaseBadgeText: {
    flexShrink: 1,
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  stage: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  outerHalo: {
    width: 228,
    height: 228,
    borderWidth: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleHalo: {
    width: 186,
    height: 186,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 142,
    height: 142,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },
  signalDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  signalDotTop: {
    top: 25,
    end: 45,
  },
  signalDotBottom: {
    bottom: 32,
    start: 36,
    width: 7,
    height: 7,
  },
  name: {
    ...typeScale.title,
    maxWidth: 330,
    marginTop: spacing.lg,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  phase: {
    ...typeScale.secondary,
    maxWidth: 340,
    marginTop: spacing.xs,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  capabilityRail: {
    width: '100%',
    minHeight: 42,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  capabilityDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  capabilityText: {
    flex: 1,
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
});
