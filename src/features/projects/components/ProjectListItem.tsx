import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ProjectRecord,
} from '../../../contracts/ProjectRepository';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  project: ProjectRecord;

  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ProjectListItem({
  project,
  onOpen,
  onArchive,
  onDelete,
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
      <Pressable
        onPress={onOpen}
        style={styles.main}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          {project.name}
        </Text>

        {!!project.description && (
          <Text
            numberOfLines={2}
            style={[
              styles.description,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {project.description}
          </Text>
        )}

        <Text
          style={[
            styles.date,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {new Date(
            project.updatedAt,
          ).toLocaleString()}
        </Text>
      </Pressable>

      <View
        style={styles.actions}
      >
        <Pressable
          onPress={onArchive}
          style={styles.action}
        >
          <Text
            style={{
              color:
                colors.textSecondary,
            }}
          >
            {project.isArchived
              ? '↩'
              : '▣'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={styles.action}
        >
          <Text
            style={{
              color:
                colors.error,
              fontSize: 20,
            }}
          >
            ×
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      minHeight: 82,
      marginHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    main: {
      flex: 1,
      paddingVertical: 12,
    },

    name: {
      fontSize: 16,
      fontWeight: '700',
    },

    description: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
    },

    date: {
      marginTop: 5,
      fontSize: 10,
    },

    actions: {
      flexDirection: 'row',
    },

    action: {
      width: 38,
      height: 46,
      alignItems: 'center',
      justifyContent:
        'center',
    },
  });
