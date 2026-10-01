import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  kind: 'video' | 'file';
  color: string;
};

export function AttachmentKindIcon({
  kind,
  color,
}: Props) {
  if (kind === 'video') {
    return (
      <View
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.videoFrame,
          { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.playTriangle,
            { borderLeftColor: color },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.fileFrame,
        { borderColor: color },
      ]}
    >
      <View
        style={[
          styles.fileFold,
          {
            borderLeftColor: color,
            borderBottomColor: color,
          },
        ]}
      />

      <View
        style={[
          styles.fileLine,
          styles.fileLineTop,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.fileLine,
          styles.fileLineBottom,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  videoFrame: {
    width: 26,
    height: 20,
    borderWidth: 1.8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginStart: 2,
    borderTopWidth: 4.5,
    borderBottomWidth: 4.5,
    borderLeftWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  fileFrame: {
    width: 20,
    height: 24,
    borderWidth: 1.7,
    borderRadius: 4,
  },
  fileFold: {
    position: 'absolute',
    top: -1.7,
    end: -1.7,
    width: 7,
    height: 7,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: 2,
  },
  fileLine: {
    position: 'absolute',
    start: 4,
    end: 4,
    height: 1.5,
    borderRadius: 2,
  },
  fileLineTop: {
    top: 11,
  },
  fileLineBottom: {
    top: 16,
  },
});
