import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ProjectClearIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.container}
    >
      <View
        style={[
          styles.line,
          styles.forward,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.line,
          styles.backward,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  forward: {
    transform: [{ rotate: '45deg' }],
  },
  backward: {
    transform: [{ rotate: '-45deg' }],
  },
});
