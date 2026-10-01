import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  applicationId,
  nativeApplicationVersion,
  nativeBuildVersion,
} from 'expo-application';

import type {
  AppPermissionRecord,
} from '../../../contracts/PermissionService';
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

type Props = {
  permissions:
    readonly AppPermissionRecord[];
  permissionsLoading: boolean;
  diagnosticsEnabled: boolean;
};

type StatusItemProps = {
  label: string;
  value: string;
  accent?: boolean;
};

function StatusItem({
  label,
  value,
  accent = false,
}: StatusItemProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.statusItem,
        {
          backgroundColor:
            colors.surfaceInput,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statusLabel,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.statusValue,
          {
            color: accent
              ? colors.accent
              : colors.textPrimary,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function SettingsSystemOverview({
  permissions,
  permissionsLoading,
  diagnosticsEnabled,
}: Props) {
  const { colors, mode } =
    useTheme();
  const { locale, t } =
    useLocale();

  const grantedCount =
    permissions.filter(
      (permission) =>
        permission.status === 'granted',
    ).length;

  const permissionSummary =
    permissionsLoading
      ? t('settingsStatusLoading')
      : permissions.length === 0
        ? t('settingsStatusUnavailable')
        : `${grantedCount}/${permissions.length}`;

  const languageLabel =
    locale === 'ar'
      ? 'العربية'
      : locale === 'de'
        ? 'Deutsch'
        : 'English';

  const themeLabel =
    mode === 'dark'
      ? t('themeDark')
      : t('themeLight');

  const version =
    nativeApplicationVersion
    ?? '1.0.0';

  const build =
    nativeBuildVersion;

  return (
    <PremiumHeroSurface
      style={styles.card}
    >
      <View style={styles.hero}>
        <View
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.mark,
            {
              backgroundColor:
                colors.accentSoft,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            importantForAccessibility="no"
            style={[
              styles.markText,
              {
                color: colors.accent,
              },
            ]}
          >
            M
          </Text>
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
            {t(
              'settingsOverviewEyebrow',
            )}
          </Text>

          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            MUDRIK
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t(
              'settingsOverviewDescription',
            )}
          </Text>
        </View>

        <View
          style={[
            styles.readyBadge,
            {
              backgroundColor:
                colors.accentSoft,
            },
          ]}
        >
          <View
            style={[
              styles.readyDot,
              {
                backgroundColor:
                  colors.success,
              },
            ]}
          />
          <Text
            style={[
              styles.readyText,
              {
                color: colors.accent,
              },
            ]}
          >
            {t('settingsStatusReady')}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <StatusItem
          label={t('settingsVersion')}
          value={
            build
              ? `${version} · ${build}`
              : version
          }
          accent
        />
        <StatusItem
          label={t(
            'settingsResolvedLanguage',
          )}
          value={languageLabel}
        />
        <StatusItem
          label={t(
            'settingsResolvedTheme',
          )}
          value={themeLabel}
        />
        <StatusItem
          label={t(
            'settingsPermissionSummary',
          )}
          value={permissionSummary}
        />
        <StatusItem
          label={t(
            'settingsDiagnosticsStatus',
          )}
          value={
            diagnosticsEnabled
              ? t('settingsStatusEnabled')
              : t('settingsStatusDisabled')
          }
        />
      </View>

      {applicationId ? (
        <Text
          numberOfLines={1}
          style={[
            styles.packageId,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {applicationId}
        </Text>
      ) : null}
    </PremiumHeroSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  mark: {
    width: 58,
    height: 58,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
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
    letterSpacing: 0.7,
    writingDirection: 'auto',
  },
  title: {
    ...typeScale.title,
    marginTop: spacing.xxs,
    fontWeight: '900',
    writingDirection: 'auto',
  },
  subtitle: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  readyBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  readyDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  readyText: {
    ...typeScale.caption,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  grid: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusItem: {
    minHeight: 72,
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statusLabel: {
    ...typeScale.micro,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  statusValue: {
    ...typeScale.secondary,
    marginTop: spacing.xs,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  packageId: {
    ...typeScale.micro,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
