import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {
  useTheme,
} from '../theme/ThemeProvider';
import {
  FlagshipBackdrop,
} from './FlagshipBackdrop';

type Props = PropsWithChildren<{
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function FlagshipScreen({
  children,
  quiet = false,
  style,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            colors.background,
        },
        style,
      ]}
    >
      <FlagshipBackdrop
        quiet={quiet}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
