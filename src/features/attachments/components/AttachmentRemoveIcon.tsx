import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function AttachmentRemoveIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.icon}
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
  icon: {
    width: 16,
    height: 16,
  },
  line: {
    position: 'absolute',
    left: 2,
    top: 7,
    width: 12,
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
