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

import {
  ProjectViewMode,
} from '../hooks/useProjectsController';

type Props = {
  value: ProjectViewMode;

  onChange: (
    value: ProjectViewMode,
  ) => void;
};

export function ProjectViewTabs({
  value,
  onChange,
}: Props) {
  const { colors } =
    useTheme();

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
      {(
        [
          ['active', 'Active'],
          ['archived', 'Archived'],
        ] as const
      ).map(
        ([key, label]) => (
          <Pressable
            key={key}
            onPress={() =>
              onChange(key)
            }
            style={[
              styles.tab,
              value === key && {
                backgroundColor:
                  colors.surface,
              },
            ]}
          >
            <Text
              style={{
                color:
                  value === key
                    ? colors.textPrimary
                    : colors.textSecondary,
                fontWeight: '600',
              }}
            >
              {label}
            </Text>
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 14,
      padding: 3,
    },

    tab: {
      flex: 1,
      minHeight: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent:
        'center',
    },
  });
