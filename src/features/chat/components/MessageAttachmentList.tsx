import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  spacing,
} from '../../../design-system/tokens/spacing';
import type {
  ChatAttachment,
} from '../types';
import {
  MessageAttachmentItem,
} from './MessageAttachmentItem';

type Props = {
  attachments:
    readonly ChatAttachment[];
};

export function MessageAttachmentList({
  attachments,
}: Props) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {attachments.map((attachment) => (
        <MessageAttachmentItem
          key={attachment.id}
          attachment={attachment}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
