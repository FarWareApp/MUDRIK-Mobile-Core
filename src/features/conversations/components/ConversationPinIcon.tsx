import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ConversationPinIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.icon}
    >
      <View
        style={[
          styles.head,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.shaft,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.point,
          { borderTopColor: color },
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
  head: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: 10,
    height: 7,
    borderWidth: 2,
    borderRadius: 3,
  },
  shaft: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 2,
    height: 5,
    borderRadius: 1,
  },
  point: {
    position: 'absolute',
    left: 6,
    bottom: 1,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
