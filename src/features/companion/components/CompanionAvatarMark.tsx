import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import type {
  CompanionPresentation,
} from '../../../contracts/Companion';

type Props = {
  presentation: CompanionPresentation;
  color: string;
  accentColor: string;
  active: boolean;
};

export function CompanionAvatarMark({
  presentation,
  color,
  accentColor,
  active,
}: Props) {
  const activeColor = active
    ? accentColor
    : color;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.container}
    >
      <View
        style={[
          styles.orbit,
          presentation === 'female'
            ? styles.orbitForward
            : styles.orbitBackward,
          { borderColor: activeColor },
        ]}
      />

      <View
        style={[
          styles.bridge,
          { backgroundColor: color },
        ]}
      />

      <View
        style={[
          styles.node,
          styles.startNode,
          { backgroundColor: activeColor },
        ]}
      />
      <View
        style={[
          styles.node,
          styles.endNode,
          { backgroundColor: activeColor },
        ]}
      />

      <View
        style={[
          styles.core,
          { borderColor: activeColor },
        ]}
      >
        <View
          style={[
            styles.coreDot,
            { backgroundColor: activeColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    position: 'absolute',
    width: 78,
    height: 34,
    borderWidth: 2,
    borderRadius: 999,
    opacity: 0.72,
  },
  orbitForward: {
    transform: [{ rotate: '18deg' }],
  },
  orbitBackward: {
    transform: [{ rotate: '-18deg' }],
  },
  bridge: {
    position: 'absolute',
    width: 58,
    height: 2,
    borderRadius: 1,
    opacity: 0.72,
  },
  node: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  startNode: {
    left: 8,
  },
  endNode: {
    right: 8,
  },
  core: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
