import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  playing: boolean;
};

export function VoicePlaybackIcon({
  color,
  playing,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.icon}
    >
      {playing ? (
        <>
          <View
            style={[
              styles.pauseBar,
              styles.pauseStart,
              { backgroundColor: color },
            ]}
          />
          <View
            style={[
              styles.pauseBar,
              styles.pauseEnd,
              { backgroundColor: color },
            ]}
          />
        </>
      ) : (
        <View
          style={[
            styles.play,
            { borderLeftColor: color },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ translateX: 1 }],
  },
  pauseBar: {
    position: 'absolute',
    top: 3,
    width: 4,
    height: 12,
    borderRadius: 1,
  },
  pauseStart: {
    left: 3,
  },
  pauseEnd: {
    right: 3,
  },
});
