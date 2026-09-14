import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function QuickActionProjectsIcon({
  color,
}: Props) {
  return (
    <View style={styles.icon}>
      <View
        style={[
          styles.card,
          styles.backCard,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.card,
          styles.frontCard,
          { borderColor: color },
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
  card: {
    position: 'absolute',
    width: 12,
    height: 10,
    borderWidth: 2,
    borderRadius: 3,
  },
  backCard: {
    top: 2,
    right: 2,
  },
  frontCard: {
    left: 2,
    bottom: 2,
  },
});
