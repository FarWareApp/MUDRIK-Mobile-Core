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
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
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
  typeScale,
} from '../../../design-system/tokens/typography';
import type {
  MicrophonePermissionState,
} from '../types';

type Props = {
  permission: MicrophonePermissionState;
  hasDraft: boolean;
};

type StatusItem = {
  label: string;
  value: string;
  tone: 'ready' | 'neutral' | 'warning';
};

export function VoiceSessionOverview({
  permission,
  hasDraft,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const { t } = useLocale();
  const palette =
    flagshipPalette[mode];

  const permissionValue =
    permission === 'granted'
      ? t('voicePermissionReady')
      : permission === 'denied'
        ? t('voicePermissionNeedsAccess')
        : t('voicePermissionCheckOnStart');

  const items: readonly StatusItem[] = [
    {
      label: t('voiceMicrophoneStatus'),
      value: permissionValue,
      tone:
        permission === 'granted'
          ? 'ready'
          : permission === 'denied'
            ? 'warning'
            : 'neutral',
    },
    {
      label: t('voicePrivacyStatus'),
      value: t('voicePrivacyLocalValue'),
      tone: 'ready',
    },
    {
      label: t('voiceDraftStatus'),
      value: hasDraft
        ? t('voiceDraftLocalValue')
        : t('voiceDraftEmptyValue'),
      tone: hasDraft
        ? 'ready'
        : 'neutral',
    },
  ];

  return (
    <InsetSurfaceCard
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surface,
        },
      ]}
    >
      <View style={styles.headingRow}>
        <View
          importantForAccessibility="no"
          style={[
            styles.headingMark,
            {
              backgroundColor:
                colors.accent,
            },
          ]}
        />

        <View style={styles.headingCopy}>
          <Text
            style={[
              styles.title,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            {t('voiceReadinessTitle')}
          </Text>

          <Text
            style={[
              styles.description,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t(
              'voiceReadinessDescription',
            )}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {items.map(
          ({
            label,
            value,
            tone,
          }) => {
            const dotColor =
              tone === 'ready'
                ? colors.success
                : tone === 'warning'
                  ? colors.warning
                  : colors.accent;

            return (
              <View
                key={label}
                style={[
                  styles.item,
                  {
                    backgroundColor:
                      colors.surfaceInput,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={styles.itemHeader}
                >
                  <View
                    importantForAccessibility="no"
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          dotColor,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.label,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.value,
                    {
                      color:
                        colors.textPrimary,
                    },
                  ]}
                >
                  {value}
                </Text>
              </View>
            );
          },
        )}
      </View>

      <View
        importantForAccessibility="no"
        style={[
          styles.lowerRail,
          {
            backgroundColor:
              palette.metal,
          },
        ]}
      />
    </InsetSurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 460,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headingMark: {
    width: 4,
    height: 42,
    borderRadius: radius.pill,
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    ...typeScale.heading,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  grid: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 104,
    minHeight: 96,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  label: {
    ...typeScale.caption,
    flex: 1,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  value: {
    ...typeScale.secondary,
    marginTop: spacing.md,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  lowerRail: {
    alignSelf: 'flex-end',
    width: 68,
    height: 1,
    marginTop: spacing.lg,
    opacity: 0.32,
    borderRadius: radius.pill,
  },
});
