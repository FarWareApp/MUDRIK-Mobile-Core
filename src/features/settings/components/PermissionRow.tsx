import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppPermissionRecord,
} from '../../../contracts/PermissionService';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  permission:
    AppPermissionRecord;

  onRequest: () => void;
};

export function PermissionRow({
  permission,
  onRequest,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <View style={styles.text}>
        <Text
          style={[
            styles.label,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          {labelFor(
            permission.id,
          )}
        </Text>

        <Text
          style={{
            color:
              colors.textSecondary,
            marginTop: 3,
            fontSize: 12,
          }}
        >
          {permission.status}
        </Text>
      </View>

      {permission.status !==
        'granted' &&
        permission.canAskAgain && (
          <Pressable
            onPress={onRequest}
            style={[
              styles.button,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={{
                color:
                  colors.textPrimary,
                fontWeight: '600',
              }}
            >
              Allow
            </Text>
          </Pressable>
        )}
    </View>
  );
}

function labelFor(
  id: AppPermissionRecord['id'],
): string {
  if (id === 'microphone') {
    return 'Microphone';
  }

  if (id === 'camera') {
    return 'Camera';
  }

  return 'Photos & videos';
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
  },

  text: {
    flex: 1,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
  },

  button: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 19,
    paddingHorizontal: 16,
  },
});
