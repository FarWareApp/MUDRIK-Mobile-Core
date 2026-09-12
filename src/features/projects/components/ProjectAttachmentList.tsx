import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AttachmentRecord,
} from '../../../contracts/Attachment';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  attachments:
    AttachmentRecord[];

  disabled?: boolean;

  onRemove: (
    attachment:
      AttachmentRecord,
  ) => void;
};

export function ProjectAttachmentList({
  attachments,
  disabled = false,
  onRemove,
}: Props) {
  const { colors } =
    useTheme();

  if (
    attachments.length === 0
  ) {
    return (
      <Text
        style={{
          color:
            colors.textSecondary,
        }}
      >
        No project files.
      </Text>
    );
  }

  return (
    <View>
      {attachments.map(
        (attachment) => (
          <View
            key={attachment.id}
            style={[
              styles.row,
              {
                borderBottomColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.icon,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
            >
              {attachment.kind ===
              'image'
                ? '▧'
                : attachment.kind ===
                    'video'
                  ? '▶'
                  : '▤'}
            </Text>

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
              {attachment.name}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${attachment.name}`}
              disabled={disabled}
              onPress={() =>
                onRemove(
                  attachment,
                )
              }
              style={[
                styles.remove,
                {
                  opacity:
                    disabled ? 0.45 : 1,
                },
              ]}
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
        ),
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    row: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    icon: {
      width: 34,
      fontSize: 20,
      textAlign: 'center',
    },

    name: {
      flex: 1,
      fontSize: 13,
    },

    remove: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent:
        'center',
    },
  });
