import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  isRTL: boolean;
};

export function ConversationBackIcon({
  color,
  isRTL,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.container,
        isRTL && styles.rtl,
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
  container: {
    width: 18,
    height: 18,
  },
  rtl: {
    transform: [{ scaleX: -1 }],
  },
  wing: {
    position: 'absolute',
    left: 4,
    width: 10,
    height: 2.2,
    borderRadius: 2,
  },
  upperWing: {
    top: 5,
    transform: [{ rotate: '-45deg' }],
  },
  lowerWing: {
    top: 11,
    transform: [{ rotate: '45deg' }],
  },
});
