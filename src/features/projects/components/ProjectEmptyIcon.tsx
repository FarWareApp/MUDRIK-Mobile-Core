import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  accentColor: string;
};

export function ProjectEmptyIcon({
  color,
  accentColor,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.container}
    >
      <View
        style={[
          styles.folder,
          { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.tab,
            {
              borderColor: color,
              backgroundColor: 'transparent',
            },
          ]}
        />

        <View
          style={[
            styles.plusHorizontal,
            {
              backgroundColor: accentColor,
            },
          ]}
        />
        <View
          style={[
            styles.plusVertical,
            {
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  folder: {
    width: 64,
    height: 46,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    position: 'absolute',
    top: -10,
    start: 7,
    width: 28,
    height: 12,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopStartRadius: 7,
    borderTopEndRadius: 7,
  },
  plusHorizontal: {
    width: 22,
    height: 3,
    borderRadius: 2,
  },
  plusVertical: {
    position: 'absolute',
    width: 3,
    height: 22,
    borderRadius: 2,
  },
});
