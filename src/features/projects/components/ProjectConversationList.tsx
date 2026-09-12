import React from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ConversationRecord,
} from '../../../contracts/ConversationRepository';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  conversations:
    ConversationRecord[];

  linkedIds:
    readonly string[];

  disabled?: boolean;

  onToggle: (
    conversationId: string,
  ) => void;
};

export function ProjectConversationList({
  conversations,
  linkedIds,
  disabled = false,
  onToggle,
}: Props) {
  const { colors } =
    useTheme();

  if (
    conversations.length === 0
  ) {
    return (
      <Text
        style={{
          color:
            colors.textSecondary,
        }}
      >
        No conversations.
      </Text>
    );
  }

  return (
    <View>
      {conversations.map(
        (conversation) => {
          const linked =
            linkedIds.includes(
              conversation.id,
            );

          const title =
            conversation
              .title
              .trim() ||
            'New conversation';

          return (
            <Pressable
              key={
                conversation.id
              }
              accessibilityRole="checkbox"
              accessibilityLabel={
                title
              }
              accessibilityState={{
                checked: linked,
                disabled,
              }}
              disabled={disabled}
              onPress={() =>
                onToggle(
                  conversation.id,
                )
              }
              style={[
                styles.row,
                {
                  borderBottomColor:
                    colors.border,
                  opacity:
                    disabled
                      ? 0.6
                      : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor:
                      linked
                        ? colors.accent
                        : colors.border,
                    backgroundColor:
                      linked
                        ? colors.accent
                        : 'transparent',
                  },
                ]}
              >
                {linked && (
                  <Text
                    style={{
                      color:
                        colors.accentText,
                      fontWeight:
                        '700',
                    }}
                  >
                    ✓
                  </Text>
                )}
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color:
                      colors.textPrimary,
                  },
                ]}
              >
                {title}
              </Text>
            </Pressable>
          );
        },
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

    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    title: {
      flex: 1,
      fontSize: 14,
    },
  });
