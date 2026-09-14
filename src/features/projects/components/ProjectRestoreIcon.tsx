import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  isRTL: boolean;
};

export function ProjectRestoreIcon({
  color,
  isRTL,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.icon,
        isRTL && styles.iconRTL,
      ]}
    >
      <View
        style={[
          styles.shaft,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.wing,
          styles.upperWing,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.wing,
          styles.lowerWing,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 18,
    height: 18,
  },
  iconRTL: {
    transform: [{ scaleX: -1 }],
  },
  shaft: {
    position: 'absolute',
    left: 4,
    top: 8,
    width: 11,
    height: 2,
    borderRadius: 1,
  },
  wing: {
    position: 'absolute',
    left: 3,
    width: 7,
    height: 2,
    borderRadius: 1,
  },
  upperWing: {
    top: 5,
    transform: [{ rotate: '-45deg' }],
  },
  lowerWing: {
    top: 10,
    transform: [{ rotate: '45deg' }],
  },
});
