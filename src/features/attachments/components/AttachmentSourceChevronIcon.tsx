import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  isRTL: boolean;
};

export function AttachmentSourceChevronIcon({
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
    width: 16,
    height: 16,
  },
  iconRTL: {
    transform: [{ scaleX: -1 }],
  },
  wing: {
    position: 'absolute',
    left: 4,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  upperWing: {
    top: 4,
    transform: [{ rotate: '45deg' }],
  },
  lowerWing: {
    top: 9,
    transform: [{ rotate: '-45deg' }],
  },
});
