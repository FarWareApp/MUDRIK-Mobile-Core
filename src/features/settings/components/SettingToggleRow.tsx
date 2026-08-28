import React from 'react';

import {
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  label: string;
  description?: string;

  value: boolean;
  onChange: (
    value: boolean,
  ) => void;
};

export function SettingToggleRow({
  label,
  description,
  value,
  onChange,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <View style={styles.text}>
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

        {description && (
          <Text
            style={[
              styles.description,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {description}
          </Text>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  text: {
    flex: 1,
    paddingRight: 14,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
  },

  description: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
});
