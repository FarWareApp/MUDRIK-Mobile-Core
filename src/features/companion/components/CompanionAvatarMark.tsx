import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import type {
  CompanionPresentation,
} from '../../../contracts/Companion';

type Props = {
  presentation: CompanionPresentation;
  color: string;
  accentColor: string;
  active: boolean;
};

export function CompanionAvatarMark({
  presentation,
  color,
  accentColor,
  active,
}: Props) {
  const activeColor = active
    ? accentColor
    : color;

  const side =
    presentation === 'female'
      ? styles.accentStart
      : styles.accentEnd;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.container}
    >
      <View
        style={[
          styles.presenceHalo,
          {
            borderColor: activeColor,
            opacity: active ? 0.24 : 0.12,
          },
        ]}
      />

      <View
        style={[
          styles.shoulders,
          {
            borderColor: activeColor,
          },
        ]}
      />

      <View
        style={[
          styles.head,
          {
            backgroundColor: activeColor,
            borderColor: activeColor,
          },
        ]}
      >
        <View
          style={[
            styles.faceCutout,
            {
              backgroundColor: 'transparent',
              borderColor: color,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.presentationAccent,
          side,
          {
            backgroundColor: accentColor,
          },
        ]}
      />

      {active ? (
        <View
          style={[
            styles.activeDot,
            {
              backgroundColor: accentColor,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceHalo: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderWidth: 2,
    borderRadius: 41,
  },
  head: {
    position: 'absolute',
    top: 15,
    width: 31,
    height: 31,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  faceCutout: {
    width: 11,
    height: 6,
    marginTop: 6,
    borderBottomWidth: 1.5,
    borderRadius: 8,
    opacity: 0.72,
  },
  shoulders: {
    position: 'absolute',
    bottom: 14,
    width: 58,
    height: 31,
    borderWidth: 2,
    borderRadius: 18,
  },
  presentationAccent: {
    position: 'absolute',
    bottom: 25,
    width: 13,
    height: 4,
    borderRadius: 2,
    zIndex: 3,
  },
  accentStart: {
    start: 13,
    transform: [{ rotate: '-24deg' }],
  },
  accentEnd: {
    end: 13,
    transform: [{ rotate: '24deg' }],
  },
  activeDot: {
    position: 'absolute',
    top: 10,
    end: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
