import React from 'react';
import {
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
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  permission: AppPermissionRecord;
  onRequest: () => void;
};

export function PermissionRow({
  permission,
  onRequest,
}: Props) {
  const { colors } = useTheme();
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

        <Text
          style={[
            styles.status,
            { color: colors.textSecondary },
          ]}
        >
          {statusLabels[permission.status]}
        </Text>
      </View>

      {canRequest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('allowPermission')}: ${label}`}
          onPress={onRequest}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '600',
            }}
          >
            {t('allowPermission')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontSize: typography.secondary,
    fontWeight: '600',
  },
  status: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
  },
  button: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
