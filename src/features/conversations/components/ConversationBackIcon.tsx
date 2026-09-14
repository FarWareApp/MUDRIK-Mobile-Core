import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  color: string;
  isRTL: boolean;
};

export function ConversationBackIcon({
  color,
  isRTL,
}: Props) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.container,
        isRTL && styles.rtl,
      ]}
    >
      <View
        style={[
          styles.chevron,
          {
            borderColor: color,
          },
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
  rtl: {
    transform: [{ scaleX: -1 }],
  },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
