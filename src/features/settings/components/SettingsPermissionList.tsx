import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import type {
  AppPermissionId,
  AppPermissionRecord,
} from '../../../contracts/PermissionService';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';

import { PermissionRow } from './PermissionRow';

type Props = {
  loading: boolean;
  permissions: readonly AppPermissionRecord[];
  onRequest: (id: AppPermissionId) => void;
};

export function SettingsPermissionList({
  loading,
  permissions,
  onRequest,
}: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View>
      {permissions.map((permission) => (
        <PermissionRow
          key={permission.id}
          permission={permission}
          onRequest={() => onRequest(permission.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.lg,
  },
});
