import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';

import { AttachmentRemoveButton } from './AttachmentRemoveButton';

type Props = {
  attachment: AttachmentRecord;
  disabled: boolean;
  onRemove: (
    attachment: AttachmentRecord,
  ) => void;
};

export function AttachmentDraftItem({
  attachment,
  disabled,
  onRemove,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      {attachment.kind === 'image' ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: attachment.localUri }}
          style={styles.image}
        />
      ) : (
        <View
          importantForAccessibility="no-hide-descendants"
          style={styles.fileIcon}
        >
          <Text
            style={[
              styles.fileGlyph,
              { color: colors.textSecondary },
            ]}
          >
            {attachment.kind === 'video'
              ? '▶'
              : '▤'}
          </Text>
        </View>
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.name,
          { color: colors.textPrimary },
        ]}
      >
        {attachment.name}
      </Text>

      <AttachmentRemoveButton
        disabled={disabled}
        onPress={() => onRemove(attachment)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: 116,
    height: 92,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 6,
  },
  image: {
    width: '100%',
    height: 54,
    borderRadius: 9,
  },
  fileIcon: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileGlyph: {
    fontSize: 22,
  },
  name: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 14,
  },
});
