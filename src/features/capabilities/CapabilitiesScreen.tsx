import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../core/localization/LocaleProvider';
import {
  FlagshipSafeAreaScreen,
} from '../../design-system/components/FlagshipSafeAreaScreen';
import {
  InsetSurfaceCard,
} from '../../design-system/components/InsetSurfaceCard';
import {
  PremiumHeroSurface,
} from '../../design-system/components/PremiumHeroSurface';
import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';
import {
  radius,
} from '../../design-system/tokens/radius';
import {
  spacing,
} from '../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../design-system/tokens/typography';
import {
  capabilityOverview,
} from './capabilityOverview';
import {
  CapabilitiesScreenHeader,
} from './components/CapabilitiesScreenHeader';
import {
  CapabilityChip,
} from './components/CapabilityChip';
import {
  CapabilityStatCard,
} from './components/CapabilityStatCard';
import {
  IntegrationCapabilityCard,
} from './components/IntegrationCapabilityCard';

function humanizeIdentifier(
  value: string,
): string {
  return value
    .replaceAll('_', ' ')
    .replaceAll('.', ' · ');
}

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function CapabilitySection({
  title,
  description,
  children,
}: SectionProps) {
  const { colors } = useTheme();

  return (
    <InsetSurfaceCard
      style={styles.sectionCard}
    >
      <Text
        style={[
          styles.sectionTitle,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.sectionDescription,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {description}
      </Text>

      <View style={styles.sectionBody}>
        {children}
      </View>
    </InsetSurfaceCard>
  );
}

export function CapabilitiesScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <FlagshipSafeAreaScreen
      quiet
      style={styles.safeArea}
    >
      <CapabilitiesScreenHeader />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <PremiumHeroSurface
          strong
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
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
                  'capabilitiesEyebrow',
                )}
              </Text>

              <Text
                style={[
                  styles.heroTitle,
                  {
                    color:
                      colors.textPrimary,
                  },
                ]}
              >
                {t(
                  'capabilitiesHeroTitle',
                )}
              </Text>

              <Text
                style={[
                  styles.heroDescription,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}
              >
                {t(
                  'capabilitiesDescription',
                )}
              </Text>
            </View>

            <View
              style={[
                styles.coreBadge,
                {
                  backgroundColor:
                    colors.accentSoft,
                },
              ]}
            >
              <View
                importantForAccessibility="no"
                style={[
                  styles.coreDot,
                  {
                    backgroundColor:
                      colors.success,
                  },
                ]}
              />
              <Text
                style={[
                  styles.coreBadgeText,
                  {
                    color:
                      colors.accent,
                  },
                ]}
              >
                {t(
                  'capabilitiesDefinedInCore',
                )}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <CapabilityStatCard
              accent
              label={t(
                'capabilitiesSecurity',
              )}
              value={
                capabilityOverview
                  .securityCapabilities
                  .length
              }
              description={t(
                'capabilitiesSecurityDescription',
              )}
            />
            <CapabilityStatCard
              label={t(
                'capabilitiesMemory',
              )}
              value={
                capabilityOverview
                  .memoryCategories
                  .length
              }
              description={t(
                'capabilitiesMemoryDescription',
              )}
            />
            <CapabilityStatCard
              label={t(
                'capabilitiesIntelligence',
              )}
              value={
                capabilityOverview
                  .intelligenceServices
                  .length
              }
              description={t(
                'capabilitiesIntelligenceDescription',
              )}
            />
            <CapabilityStatCard
              label={t(
                'capabilitiesIntegrations',
              )}
              value={
                capabilityOverview
                  .integrationCapabilities
                  .length
              }
              description={t(
                'capabilitiesIntegrationsDescription',
              )}
            />
          </View>
        </PremiumHeroSurface>

        <CapabilitySection
          title={t(
            'capabilitiesSecurity',
          )}
          description={t(
            'capabilitiesSecurityDescription',
          )}
        >
          <Text
            style={[
              styles.subheading,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t('capabilitiesDomains')}
          </Text>

          <View style={styles.chipWrap}>
            {capabilityOverview
              .securityDomains
              .map((domain) => (
                <CapabilityChip
                  key={domain.domain}
                  label={domain.domain}
                  count={domain.count}
                />
              ))}
          </View>
        </CapabilitySection>

        <CapabilitySection
          title={t(
            'capabilitiesIntelligence',
          )}
          description={t(
            'capabilitiesIntelligenceDescription',
          )}
        >
          <Text
            style={[
              styles.subheading,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t('capabilitiesServices')}
          </Text>

          <View style={styles.chipWrap}>
            {capabilityOverview
              .intelligenceServices
              .map((service) => (
                <CapabilityChip
                  key={service}
                  label={service.toUpperCase()}
                />
              ))}
          </View>
        </CapabilitySection>

        <CapabilitySection
          title={t(
            'capabilitiesMemory',
          )}
          description={t(
            'capabilitiesMemoryDescription',
          )}
        >
          <Text
            style={[
              styles.subheading,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t(
              'capabilitiesMemoryCategories',
            )}
          </Text>

          <View style={styles.chipWrap}>
            {capabilityOverview
              .memoryCategories
              .map((category) => (
                <CapabilityChip
                  key={category}
                  label={humanizeIdentifier(
                    category,
                  )}
                />
              ))}
          </View>
        </CapabilitySection>

        <CapabilitySection
          title={t(
            'capabilitiesIntegrations',
          )}
          description={t(
            'capabilitiesIntegrationsDescription',
          )}
        >
          <Text
            style={[
              styles.subheading,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t(
              'capabilitiesIntegrationControls',
            )}
          </Text>

          <View
            style={
              styles.integrationList
            }
          >
            {capabilityOverview
              .integrationCapabilities
              .map((item) => (
                <IntegrationCapabilityCard
                  key={item.capability}
                  item={item}
                />
              ))}
          </View>
        </CapabilitySection>
      </ScrollView>
    </FlagshipSafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
  hero: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xxl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    ...typeScale.micro,
    fontWeight: '900',
    letterSpacing: 0.8,
    writingDirection: 'auto',
  },
  heroTitle: {
    ...typeScale.hero,
    marginTop: spacing.xs,
    fontWeight: '900',
    writingDirection: 'auto',
  },
  heroDescription: {
    ...typeScale.secondary,
    maxWidth: 620,
    marginTop: spacing.sm,
    writingDirection: 'auto',
  },
  coreBadge: {
    maxWidth: 160,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  coreDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  coreBadgeText: {
    flexShrink: 1,
    ...typeScale.caption,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  statsGrid: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.heading,
    fontWeight: '900',
    writingDirection: 'auto',
  },
  sectionDescription: {
    ...typeScale.secondary,
    marginTop: spacing.xs,
    maxWidth: 720,
    writingDirection: 'auto',
  },
  sectionBody: {
    marginTop: spacing.lg,
  },
  subheading: {
    ...typeScale.micro,
    fontWeight: '800',
    letterSpacing: 0.5,
    writingDirection: 'auto',
  },
  chipWrap: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  integrationList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
