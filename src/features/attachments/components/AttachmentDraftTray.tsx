import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  attachments: AttachmentRecord[];
  busy: boolean;
  onRemove: (
    attachment: AttachmentRecord,
  ) => void;
};

export function AttachmentDraftTray({
  attachments,
  busy,
  onRemove,
}: Props) {
  const { colors } = useTheme();

  if (
    attachments.length === 0 &&
    !busy
  ) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {attachments.map(
          (attachment) => (
            <View
              key={attachment.id}
              style={[
                styles.item,
                {
                  backgroundColor:
                    colors.surfaceElevated,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              {attachment.kind ===
              'image' ? (
                <Image
                  source={{
                    uri:
                      attachment.localUri,
                  }}
                  style={styles.image}
                />
              ) : (
                <View
                  style={styles.fileIcon}
                >
                  <Text
                    style={{
                      color:
                        colors.textSecondary,
                      fontSize: 22,
                    }}
                  >
                    {attachment.kind ===
                    'video'
                      ? '▶'
                      : '▤'}
                  </Text>
                </View>
              )}

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
                accessibilityLabel="Remove attachment"
                disabled={busy}
                onPress={() =>
                  onRemove(attachment)
                }
                style={[
                  styles.remove,
                  {
                    backgroundColor:
                      colors.background,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      colors.textPrimary,
                    fontWeight: '700',
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </View>
          ),
        )}

        {busy && (
          <View
            style={[
              styles.busy,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={{
                color:
                  colors.textSecondary,
              }}
            >
              …
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 6,
  },

  content: {
    paddingHorizontal: 12,
    gap: 8,
  },

  item: {
    width: 112,
    height: 88,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
  },

  image: {
    width: '100%',
    height: 52,
    borderRadius: 9,
  },

  fileIcon: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: {
    marginTop: 4,
    fontSize: 10,
  },

  remove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  busy: {
    width: 54,
    height: 88,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
