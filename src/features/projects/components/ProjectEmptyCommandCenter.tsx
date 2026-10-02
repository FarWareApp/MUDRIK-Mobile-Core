import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  FlagshipActionButton,
} from '../../../design-system/components/FlagshipActionButton';
import {
  PremiumHeroSurface,
} from '../../../design-system/components/PremiumHeroSurface';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  flagshipPalette,
} from '../../../design-system/tokens/flagship';
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
  ProjectAddIcon,
} from './ProjectAddIcon';
import {
  ProjectEmptyIcon,
} from './ProjectEmptyIcon';

type Props = {
  onCreateProject: () => void;
};

export function ProjectEmptyCommandCenter({
  onCreateProject,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const { t } = useLocale();
  const palette =
    flagshipPalette[mode];

  const features = [
    t('projectsEmptyLocal'),
    t('projectsEmptyFiles'),
    t(
      'projectsEmptyConversations',
    ),
    t('projectsEmptyArchive'),
  ] as const;

  return (
    <View style={styles.container}>
      <PremiumHeroSurface
        strong
        style={styles.hero}
      >
        <View style={styles.topRow}>
          <View
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.iconStage,
              {
                backgroundColor:
                  colors.accentSoft,
                borderColor:
                  palette.hairline,
              },
            ]}
          >
            <View
              style={[
                styles.iconRing,
                {
                  borderColor:
                    colors.accent,
                },
              ]}
            />

            <ProjectEmptyIcon
              color={
                colors.textSecondary
              }
              accentColor={
                colors.accent
              }
            />
          </View>

          <View style={styles.copy}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    colors.accent,
                },
              ]}
            >
              {t(
                'projectsEmptyEyebrow',
              )}
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
              {t(
                'projectsEmptyTitle',
              )}
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
              {t(
                'projectsEmptyBody',
              )}
            </Text>
          </View>
        </View>

        <View
          style={styles.featureGrid}
        >
          {features.map(
            (feature, index) => (
              <View
                key={feature}
                style={[
                  styles.feature,
                  {
                    backgroundColor:
                      colors.surfaceInput,
                    borderColor:
                      palette.hairline,
                  },
                ]}
              >
                <View
                  importantForAccessibility="no"
                  style={[
                    styles.featureIndex,
                    {
                      borderColor:
                        palette.hairline,
                      backgroundColor:
                        colors.accentSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.featureIndexText,
                      {
                        color:
                          colors.accent,
                      },
                    ]}
                  >
                    {String(
                      index + 1,
                    ).padStart(2, '0')}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.featureText,
                    {
                      color:
                        colors.textPrimary,
                    },
                  ]}
                >
                  {feature}
                </Text>
              </View>
            ),
          )}
        </View>

        <FlagshipActionButton
          primary
          label={t('createProject')}
          icon={(
            <ProjectAddIcon
              color={
                palette
                  .primaryActionText
              }
            />
          )}
          style={styles.action}
          onPress={onCreateProject}
        />
      </PremiumHeroSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  hero: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconStage: {
    width: 96,
    height: 96,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    opacity: 0.42,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: typography.micro,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.7,
    writingDirection: 'auto',
  },
  title: {
    marginTop: spacing.xs,
    fontSize: typography.heading,
    lineHeight: 25,
    fontWeight: '900',
    writingDirection: 'auto',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: typography.secondary,
    lineHeight: 21,
    writingDirection: 'auto',
  },
  featureGrid: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  feature: {
    minHeight: 66,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureIndex: {
    width: 32,
    height: 32,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIndexText: {
    fontSize: typography.micro,
    lineHeight: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  featureText: {
    flex: 1,
    fontSize: typography.caption,
    lineHeight: 17,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  action: {
    width: '100%',
    marginTop: spacing.xl,
  },
});
