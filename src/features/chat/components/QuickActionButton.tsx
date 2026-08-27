import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export function QuickActionButton({
  expanded,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quick actions"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: colors.accent,
        },
      ]}
    >
      <Text style={styles.text}>
        {expanded ? '×' : '+'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 6,
  },

  text: {
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 31,
    fontWeight: '400',
  },
});
