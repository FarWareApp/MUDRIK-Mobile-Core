import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CompanionPresentation,
  CompanionSessionPhase,
} from '../../../contracts/Companion';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  presentation:
    CompanionPresentation;

  phase:
    CompanionSessionPhase;

  name: string;
};

export function CompanionAvatar({
  presentation,
  phase,
  name,
}: Props) {
  const { colors } =
    useTheme();

  const symbol =
    presentation === 'female'
      ? '♀'
      : '♂';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor:
              phase === 'speaking'
                ? colors.accent
                : colors.surfaceElevated,

            borderColor:
              phase === 'listening'
                ? colors.accent
                : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.symbol,
            {
              color:
                phase === 'speaking'
                  ? colors.accentText
                  : colors.textPrimary,
            },
          ]}
        >
          {symbol}
        </Text>
      </View>

      <Text
        style={[
          styles.name,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {name}
      </Text>

      <Text
        style={{
          color:
            colors.textSecondary,
          marginTop: 5,
          textTransform:
            'capitalize',
        }}
      >
        {phase}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
    },

    avatar: {
      width: 170,
      height: 170,
      borderRadius: 85,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    symbol: {
      fontSize: 72,
      fontWeight: '300',
    },

    name: {
      marginTop: 18,
      fontSize: 24,
      fontWeight: '700',
    },
  });
