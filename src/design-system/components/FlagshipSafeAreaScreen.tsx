import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  FlagshipScreen,
} from './FlagshipScreen';

type Props = PropsWithChildren<{
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function FlagshipSafeAreaScreen({
  children,
  quiet = false,
  style,
}: Props) {
  return (
    <FlagshipScreen
      quiet={quiet}
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          style,
        ]}
      >
        {children}
      </SafeAreaView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      'transparent',
  },
});
