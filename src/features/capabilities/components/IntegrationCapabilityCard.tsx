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
} from '../../../design-system/tokens/typography';
import type {
  IntegrationCapabilitySummary,
} from '../capabilityOverview';

type Props = {
  item:
    IntegrationCapabilitySummary;
};

export function IntegrationCapabilityCard({
  item,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const riskLabel =
    item.risk === 'read_only'
      ? t('capabilityRiskReadOnly')
      : item.risk === 'low'
        ? t('capabilityRiskLow')
        : item.risk === 'medium'
          ? t('capabilityRiskMedium')
          : item.risk === 'high'
            ? t('capabilityRiskHigh')
            : t(
                'capabilityRiskCritical',
              );

  const approvalLabel =
    item.approvalMode === 'none'
      ? t(
          'capabilityApprovalNone',
        )
      : item.approvalMode
          === 'explicit'
        ? t(
            'capabilityApprovalExplicit',
          )
        : t(
            'capabilityApprovalSpecialized',
          );

  const riskColor =
    item.risk === 'critical'
    || item.risk === 'high'
      ? colors.error
      : item.risk === 'medium'
        ? colors.warning
        : item.risk === 'low'
          ? colors.accent
          : colors.success;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor:
                colors.accentSoft,
            },
          ]}
        >
          <View
            importantForAccessibility="no"
            style={[
              styles.iconCore,
              {
                borderColor:
                  colors.accent,
              },
            ]}
          />
          <View
            importantForAccessibility="no"
            style={[
              styles.iconDot,
              {
                backgroundColor:
                  colors.accent,
              },
            ]}
          />
        </View>

        <View style={styles.copy}>
          <Text
            selectable
            style={[
              styles.capability,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            {item.capability}
          </Text>

          <Text
            style={[
              styles.approval,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {approvalLabel}
          </Text>
        </View>

        <View
          style={[
            styles.riskBadge,
            {
              backgroundColor:
                colors.surfaceInput,
              borderColor:
                riskColor,
            },
          ]}
        >
          <View
            importantForAccessibility="no"
            style={[
              styles.riskDot,
              {
                backgroundColor:
                  riskColor,
              },
            ]}
          />
          <Text
            style={[
              styles.riskText,
              {
                color: riskColor,
              },
            ]}
          >
            {riskLabel}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            borderTopColor:
              colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.footerLabel,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {t('capabilitiesInstant')}
        </Text>

        <Text
          style={[
            styles.footerValue,
            {
              color:
                item.instantEligible
                  ? colors.success
                  : colors.textSecondary,
            },
          ]}
        >
          {item.instantEligible
            ? t(
                'capabilitiesInstantYes',
              )
            : t(
                'capabilitiesInstantNo',
              )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: 19,
    height: 19,
    borderWidth: 2,
    borderRadius: radius.sm,
  },
  iconDot: {
    position: 'absolute',
    end: 9,
    bottom: 9,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  copy: {
    flex: 1,
  },
  capability: {
    ...typeScale.secondary,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  approval: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  riskBadge: {
    minHeight: 34,
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  riskText: {
    flexShrink: 1,
    ...typeScale.micro,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: spacing.md,
  },
  footerLabel: {
    ...typeScale.caption,
    writingDirection: 'auto',
  },
  footerValue: {
    ...typeScale.caption,
    fontWeight: '800',
    writingDirection: 'auto',
  },
});
