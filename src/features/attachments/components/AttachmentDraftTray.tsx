import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

import { AttachmentDraftItem } from './AttachmentDraftItem';

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
    attachments.length === 0
    && !busy
  ) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {attachments.map((attachment) => (
          <AttachmentDraftItem
            key={attachment.id}
            attachment={attachment}
            disabled={busy}
            onRemove={onRemove}
          />
        ))}

        {busy && (
          <View
            accessibilityRole="progressbar"
            style={[
              styles.busy,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{ color: colors.textSecondary }}
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
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  busy: {
    width: 56,
    height: 92,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
