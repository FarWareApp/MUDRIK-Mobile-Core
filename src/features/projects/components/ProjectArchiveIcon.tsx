import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ProjectArchiveIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.icon}
    >
      <View
        style={[
          styles.lid,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.box,
          { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.slot,
            { backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 18,
    height: 18,
  },
  lid: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 14,
    height: 5,
    borderWidth: 2,
    borderRadius: 2,
  },
  box: {
    position: 'absolute',
    top: 7,
    left: 3,
    width: 12,
    height: 9,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    alignItems: 'center',
  },
  slot: {
    marginTop: 3,
    width: 5,
    height: 2,
    borderRadius: 1,
  },
});
