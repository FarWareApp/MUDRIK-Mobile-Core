import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ComposerPaperclipIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      <View
        style={[
          styles.outerLoop,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.innerLoop,
          { borderColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 22,
    height: 22,
    transform: [
      { rotate: '-38deg' },
    ],
  },
  outerLoop: {
    position: 'absolute',
    top: 0,
    left: 5,
    width: 12,
    height: 22,
    borderWidth: 2,
    borderRadius: 7,
  },
  innerLoop: {
    position: 'absolute',
    top: 5,
    left: 8,
    width: 7,
    height: 14,
    borderWidth: 2,
    borderRadius: 5,
    borderTopColor: 'transparent',
  },
});
