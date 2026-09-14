import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
};

export function ChatNewConversationIcon({
  color,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={styles.icon}
    >
      <View
        style={[
          styles.line,
          styles.horizontal,
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.line,
          styles.vertical,
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
  line: {
    position: 'absolute',
    borderRadius: 1,
  },
  horizontal: {
    left: 2,
    top: 8,
    width: 14,
    height: 2,
  },
  vertical: {
    left: 8,
    top: 2,
    width: 2,
    height: 14,
  },
});
