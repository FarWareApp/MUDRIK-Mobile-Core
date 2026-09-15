import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function CompanionEditIcon({
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
          styles.pencil,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.tip,
          { borderTopColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  pencil: {
    width: 4,
    height: 13,
    borderRadius: 1,
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
