import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ConversationSearchIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.container}
    >
      <View
        style={[
          styles.lens,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.handle,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
  },
  lens: {
    position: 'absolute',
    width: 12,
    height: 12,
    top: 2,
    left: 2,
    borderWidth: 2,
    borderRadius: 6,
  },
  handle: {
    position: 'absolute',
    width: 8,
    height: 2,
    right: 0,
    bottom: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});
