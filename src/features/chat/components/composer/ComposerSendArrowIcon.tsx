import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ComposerSendArrowIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.icon}
    >
      <View
        style={[
          styles.shaft,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.leftWing,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.rightWing,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
  },
  shaft: {
    position: 'absolute',
    left: 9,
    top: 4,
    width: 2,
    height: 13,
    borderRadius: 1,
  },
  leftWing: {
    position: 'absolute',
    left: 4,
    top: 5,
    width: 8,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },
  rightWing: {
    position: 'absolute',
    right: 4,
    top: 5,
    width: 8,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});
