import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function VoiceRecorderIndicator({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.dot,
        { backgroundColor: color },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
