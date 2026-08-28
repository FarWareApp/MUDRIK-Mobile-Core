import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Option = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string;

  options:
    readonly Option[];

  onChange:
    (value: string) => void;
};

export function SettingOptionGroup({
  label,
  value,
  options,
  onChange,
}: Props) {
  const { colors } =
    useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>

      <View style={styles.options}>
        {options.map(
          (option) => {
            const selected =
              option.value ===
              value;

            return (
              <Pressable
                key={
                  option.value
                }
                onPress={() =>
                  onChange(
                    option.value,
                  )
                }
                style={[
                  styles.option,
                  {
                    backgroundColor:
                      selected
                        ? colors.accent
                        : colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selected
                        ? colors.accentText
                        : colors.textPrimary,

                    fontWeight:
                      selected
                        ? '700'
                        : '500',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingVertical: 13,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    label: {
      fontSize: 15,
      fontWeight: '600',
    },

    options: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    option: {
      minHeight: 38,
      borderRadius: 19,
      justifyContent:
        'center',
      paddingHorizontal: 15,
    },
  });
