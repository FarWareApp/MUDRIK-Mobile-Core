import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ProjectSelectionCheckIcon({
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
          styles.short,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.long,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 14,
    height: 12,
  },
  short: {
    position: 'absolute',
    left: 1,
    bottom: 3,
    width: 6,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  long: {
    position: 'absolute',
    right: 0,
    bottom: 5,
    width: 10,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },
});
