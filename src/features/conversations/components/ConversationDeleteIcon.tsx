import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ConversationDeleteIcon({
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
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.handle,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.bin,
          { borderColor: color },
        ]}
      >
        <View
          style={[
            styles.slot,
            { backgroundColor: color },
          ]}
        />
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
    top: 4,
    left: 3,
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  handle: {
    position: 'absolute',
    top: 1,
    left: 6,
    width: 6,
    height: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  bin: {
    position: 'absolute',
    top: 7,
    left: 4,
    width: 10,
    height: 9,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 2,
  },
  slot: {
    width: 1,
    height: 4,
    borderRadius: 1,
  },
});
