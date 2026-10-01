import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  isRTL: boolean;
};

export function CapabilitiesBackIcon({
  color,
  isRTL,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.icon,
        {
          transform: [
            {
              rotate:
                isRTL
                  ? '180deg'
                  : '0deg',
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.stroke,
          styles.top,
          {
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.stroke,
          styles.bottom,
          {
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
  },
  stroke: {
    position: 'absolute',
    start: 6,
    width: 14,
    height: 2,
    borderRadius: 2,
  },
  top: {
    top: 7,
    transform: [
      { rotate: '-45deg' },
    ],
  },
  bottom: {
    bottom: 7,
    transform: [
      { rotate: '45deg' },
    ],
  },
});
