import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function HomeVoiceIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.icon}
    >
      <View
        style={[
          styles.capsule,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.arc,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.stem,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.base,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 26,
    alignItems: 'center',
  },
  capsule: {
    width: 11,
    height: 16,
    borderWidth: 2,
    borderRadius: 6,
  },
  arc: {
    position: 'absolute',
    top: 6,
    width: 19,
    height: 13,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  stem: {
    width: 2,
    height: 5,
  },
  base: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
});
