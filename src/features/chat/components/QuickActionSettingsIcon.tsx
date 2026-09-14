import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function QuickActionSettingsIcon({
  color,
}: Props) {
  return (
    <View style={styles.icon}>
      <View
        style={[
          styles.track,
          styles.topTrack,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.track,
          styles.middleTrack,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.track,
          styles.bottomTrack,
          { backgroundColor: color },
        ]}
      />

      <View
        style={[
          styles.knob,
          styles.topKnob,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.knob,
          styles.middleKnob,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.knob,
          styles.bottomKnob,
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
  track: {
    position: 'absolute',
    left: 2,
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  topTrack: {
    top: 4,
  },
  middleTrack: {
    top: 8,
  },
  bottomTrack: {
    top: 12,
  },
  knob: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  topKnob: {
    top: 3,
    left: 4,
  },
  middleKnob: {
    top: 7,
    right: 4,
  },
  bottomKnob: {
    top: 11,
    left: 7,
  },
});
