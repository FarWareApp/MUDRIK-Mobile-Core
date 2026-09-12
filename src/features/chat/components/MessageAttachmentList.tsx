import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { ChatAttachment } from '../types';

type Props = {
  attachments:
    readonly ChatAttachment[];
};

type ItemProps = {
  attachment: ChatAttachment;
};

function AttachmentItem({
  attachment,
}: ItemProps) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] =
    useState(false);

  const unavailable =
    attachment.availability === 'missing'
    || imageFailed;

  if (unavailable) {
    return (
      <View
        accessibilityLabel={`Attachment unavailable: ${attachment.name}`}
        style={[
          styles.file,
          {
            backgroundColor:
              colors.surface,
            borderColor:
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
          !
        </Text>

        <View style={styles.fileText}>
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

          <Text
            style={[
              styles.size,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            Unavailable on this device
          </Text>
        </View>
      </View>
    );
  }

  if (attachment.kind === 'image') {
    return (
      <Image
        accessibilityLabel={
          attachment.name
        }
        source={{
          uri: attachment.localUri,
        }}
        onError={() => {
          setImageFailed(true);
        }}
        resizeMode="cover"
        style={styles.image}
      />
    );
  }

  return (
    <View
      style={[
        styles.file,
        {
          backgroundColor:
            colors.surface,
          borderColor:
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
        {attachment.kind === 'video'
          ? '▶'
          : '▤'}
      </Text>

      <View style={styles.fileText}>
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

        {attachment.sizeBytes !== null && (
          <Text
            style={[
              styles.size,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {formatBytes(
              attachment.sizeBytes,
            )}
          </Text>
        )}
      </View>
    </View>
  );
}

export function MessageAttachmentList({
  attachments,
}: Props) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
        />
      ))}
    </View>
  );
}

function formatBytes(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
    marginBottom: 6,
  },

  image: {
    width: 220,
    height: 180,
    borderRadius: 14,
  },

  file: {
    minWidth: 210,
    maxWidth: 260,
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  icon: {
    width: 34,
    fontSize: 22,
    textAlign: 'center',
  },

  fileText: {
    flex: 1,
    marginLeft: 8,
  },

  name: {
    fontSize: 13,
    fontWeight: '600',
  },

  size: {
    marginTop: 3,
    fontSize: 10,
  },
});
