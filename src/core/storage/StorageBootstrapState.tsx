import React from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  darkColors,
  lightColors,
} from '../../design-system/tokens/colors';

type Props = {
  failed: boolean;
  onRetry: () => void;
};

export function StorageBootstrapState({
  failed,
  onRetry,
}: Props) {
  const scheme =
    useColorScheme();

  const colors =
    scheme === 'light'
      ? lightColors
      : darkColors;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      {failed ? (
        <>
          <Text
            style={[
              styles.title,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            Storage initialization failed
          </Text>

          <Text
            style={[
              styles.body,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            MUDRIK could not prepare local application data.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry storage initialization"
            onPress={onRetry}
            style={[
              styles.button,
              {
                backgroundColor:
                  colors.accent,
              },
            ]}
          >
            <Text
              style={{
                color:
                  colors.accentText,
                fontWeight:
                  '700',
              }}
            >
              Retry
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator
            size="small"
            color={
              colors.accent
            }
          />

          <Text
            style={[
              styles.body,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            Preparing MUDRIK…
          </Text>
        </>
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      padding: 24,
    },

    title: {
      fontSize: 19,
      fontWeight: '700',
      textAlign: 'center',
    },

    body: {
      marginTop: 10,
      fontSize: 14,
      textAlign: 'center',
    },

    button: {
      marginTop: 20,
      minHeight: 44,
      paddingHorizontal: 22,
      justifyContent:
        'center',
      borderRadius: 22,
    },
  });
