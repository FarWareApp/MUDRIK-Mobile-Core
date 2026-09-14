import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function QuickActionConversationsIcon({
  color,
}: Props) {
  return (
    <View style={styles.icon}>
      <View
        style={[
          styles.line,
          styles.top,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.line,
          styles.middle,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.line,
          styles.bottom,
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
  line: {
    position: 'absolute',
    left: 2,
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  top: {
    top: 3,
  },
  middle: {
    top: 8,
  },
  bottom: {
    top: 13,
  },
});
