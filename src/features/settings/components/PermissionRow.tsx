import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  AppPermissionId,
  AppPermissionRecord,
  AppPermissionStatus,
} from '../../../contracts/PermissionService';
import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  permission: AppPermissionRecord;
  disabled?: boolean;
  requesting?: boolean;
  onRequest: () => void;
};

export function PermissionRow({
  permission,
  disabled = false,
  requesting = false,
  onRequest,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();

  const permissionLabels: Record<AppPermissionId, string> = {
    microphone: t('permissionMicrophone'),
    camera: t('permissionCamera'),
    'media-library': t('permissionMediaLibrary'),
    notifications: t('permissionNotifications'),
  };

  const statusLabels: Record<AppPermissionStatus, string> = {
    unknown: t('permissionStatusUnknown'),
    granted: t('permissionStatusGranted'),
    denied: t('permissionStatusDenied'),
  };

  const label = permissionLabels[permission.id];
  const canRequest =
    permission.status !== 'granted' &&
    permission.canAskAgain;
  const actionDisabled = disabled || requesting;
  const statusColor =
    permission.status === 'granted'
      ? colors.success
      : permission.status === 'denied'
        ? colors.warning
        : colors.textSecondary;

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.text}>
        <Text
          style={[
            styles.label,
            { color: colors.textPrimary },
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <View
            importantForAccessibility="no"
            style={[
              styles.statusDot,
              { backgroundColor: statusColor },
            ]}
          />
          <Text
            style={[
              styles.status,
              { color: statusColor },
            ]}
          >
            {statusLabels[permission.status]}
          </Text>
        </View>
      </View>

      {canRequest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('allowPermission')}: ${label}`}
          accessibilityState={{
            disabled: actionDisabled,
            busy: requesting,
          }}
          disabled={actionDisabled}
          onPress={onRequest}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : colors.surfaceElevated,
              borderColor: colors.border,
              opacity: actionDisabled ? 0.5 : 1,
              transform: [
                {
                  scale:
                    pressed && !actionDisabled && !reducedMotion
                      ? motion.press.subtleScale
                      : 1,
                },
              ],
            },
          ]}
        >
          {requesting ? (
            <ActivityIndicator
              color={colors.accent}
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: colors.textPrimary },
              ]}
            >
              {t('allowPermission')}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    paddingEnd: spacing.md,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '600',
    writingDirection: 'auto',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    minHeight: 28,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  status: {
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  button: {
    minWidth: 76,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    ...typeScale.secondary,
    fontWeight: '600',
  },
});
