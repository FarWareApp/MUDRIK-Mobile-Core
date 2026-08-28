import React, {
  PropsWithChildren,
} from 'react';

import {
  StyleSheet,
  View,
} from 'react-native';

import {
  useLocale,
} from './LocaleProvider';

export function AppDirectionBoundary({
  children,
}: PropsWithChildren) {
  const { isRTL } =
    useLocale();

  return (
    <View
      style={[
        styles.root,
        {
          direction:
            isRTL
              ? 'rtl'
              : 'ltr',
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
    },
  });
