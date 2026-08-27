import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
};

export function ConversationSearchBar({
  value,
  onChangeText,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceElevated,
        },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search conversations"
        placeholderTextColor={
          colors.textSecondary
        }
        style={[
          styles.input,
          {
            color: colors.textPrimary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 46,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },

  input: {
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
