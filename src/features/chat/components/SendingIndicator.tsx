import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';

export function SendingIndicator() {
  const { colors } = useTheme();

  return (
    <View
      accessibilityLabel="Response in progress"
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        ●  ●  ●
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },

  text: {
    fontSize: 11,
    letterSpacing: 2,
  },
});
