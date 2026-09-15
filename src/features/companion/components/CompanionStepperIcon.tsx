import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

type Props = {
  kind: 'increase' | 'decrease';
  color: string;
};

export function CompanionStepperIcon({
  kind,
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
          styles.line,
          { backgroundColor: color },
        ]}
      />
      {kind === 'increase' ? (
        <View
          style={[
            styles.line,
            styles.vertical,
            { backgroundColor: color },
          ]}
        />
      ) : null}
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
  line: {
    position: 'absolute',
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  vertical: {
    transform: [{ rotate: '90deg' }],
  },
});
