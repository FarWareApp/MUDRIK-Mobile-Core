import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ConversationAddIcon({
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
          styles.horizontal,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.vertical,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontal: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  vertical: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 1,
  },
});
