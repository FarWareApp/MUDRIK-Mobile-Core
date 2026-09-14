import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ProjectSearchIcon({
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
          styles.ring,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.handle,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
  },
  ring: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderRadius: 6,
  },
  handle: {
    position: 'absolute',
    width: 7,
    height: 2,
    borderRadius: 1,
    right: 0,
    bottom: 2,
    transform: [{ rotate: '45deg' }],
  },
});
