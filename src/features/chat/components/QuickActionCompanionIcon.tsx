import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function QuickActionCompanionIcon({
  color,
}: Props) {
  return (
    <View style={styles.icon}>
      <View
        style={[
          styles.head,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.shoulders,
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
  head: {
    position: 'absolute',
    top: 2,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shoulders: {
    position: 'absolute',
    left: 2,
    bottom: 1,
    width: 14,
    height: 7,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
});
