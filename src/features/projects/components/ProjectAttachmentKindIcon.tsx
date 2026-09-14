import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import type {
  AttachmentRecord,
} from '../../../contracts/Attachment';

type Props = {
  kind: AttachmentRecord['kind'];
  color: string;
};

export function ProjectAttachmentKindIcon({
  kind,
  color,
}: Props) {
  if (kind === 'video') {
    return (
      <View
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.frame,
          { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.play,
            { borderLeftColor: color },
          ]}
        />
      </View>
    );
  }

  if (kind === 'image') {
    return (
      <View
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.frame,
          { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.imageDot,
            { backgroundColor: color },
          ]}
        />
        <View
          style={[
            styles.imageLine,
            { borderBottomColor: color },
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
        styles.document,
        { borderColor: color },
      ]}
    >
      <View
        style={[
          styles.documentLine,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.documentLine,
          styles.documentLineShort,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 20,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginStart: 2,
  },
  imageDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    top: 3,
    end: 4,
  },
  imageLine: {
    width: 11,
    height: 7,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '-18deg' }],
  },
  document: {
    width: 17,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 2,
    justifyContent: 'center',
    paddingHorizontal: 3,
    gap: 3,
  },
  documentLine: {
    height: 1.5,
    borderRadius: 1,
    width: '100%',
  },
  documentLineShort: {
    width: '70%',
  },
});
