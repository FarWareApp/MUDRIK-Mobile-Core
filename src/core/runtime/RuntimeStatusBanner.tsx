import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

import {
  useRuntime,
} from './RuntimeProvider';

export function RuntimeStatusBanner() {
  const { colors } =
    useTheme();

  const runtime =
    useRuntime();

  if (
    runtime.networkLoading
    ||
    !runtime.isOffline
  ) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceElevated,
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        Offline
      </Text>

      <Text
        style={[
          styles.detail,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        Local app features remain available.
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      minHeight: 42,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 14,
      paddingVertical: 5,
    },

    text: {
      fontSize: 12,
      fontWeight: '700',
    },

    detail: {
      marginTop: 1,
      fontSize: 10,
    },
  });
