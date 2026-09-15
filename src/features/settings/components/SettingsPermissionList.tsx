import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  AppPermissionId,
  AppPermissionRecord,
} from '../../../contracts/PermissionService';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

import { PermissionRow } from './PermissionRow';

type Props = {
  loading: boolean;
  disabled?: boolean;
  requestingId: AppPermissionId | null;
  permissions: readonly AppPermissionRecord[];
  onRequest: (id: AppPermissionId) => void;
};

export function SettingsPermissionList({
  loading,
  disabled = false,
  requestingId,
  permissions,
  onRequest,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (loading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        style={styles.loader}
      >
        <ActivityIndicator color={colors.accent} />
        <Text
          style={[
            styles.loaderText,
            { color: colors.textSecondary },
          ]}
        >
          {t('loadingPermissions')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {permissions.map((permission) => (
        <PermissionRow
          key={permission.id}
          permission={permission}
          disabled={disabled || requestingId !== null}
          requesting={requestingId === permission.id}
          onRequest={() => onRequest(permission.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  loaderText: {
    ...typeScale.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
