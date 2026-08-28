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

  onToggle: (
    conversationId: string,
  ) => void;
};

export function ProjectConversationList({
  conversations,
  linkedIds,
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

          return (
            <Pressable
              key={
                conversation.id
              }
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
                {conversation
                  .title
                  .trim() ||
                  'New conversation'}
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
