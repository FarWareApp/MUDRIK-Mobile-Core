import React, {
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Image,
} from 'expo-image';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  motion,
} from '../../../design-system/tokens/motion';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typography,
} from '../../../design-system/tokens/typography';
import {
  formatAttachmentBytes,
} from '../formatters/formatAttachmentBytes';
import type {
  ChatAttachment,
} from '../types';

type Props = {
  attachment: ChatAttachment;
};

export function MessageAttachmentItem({
  attachment,
}: Props) {
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();
  const [imageFailed, setImageFailed] =
    useState(false);

  const unavailable =
    attachment.availability === 'missing'
    || imageFailed;

  if (unavailable) {
    return (
      <View
        accessible
        accessibilityLabel={`${t('attachmentUnavailable')}: ${attachment.name}`}
        style={[
          styles.file,
          isRTL && styles.fileRTL,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Text
          importantForAccessibility="no"
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
                textAlign: isRTL
                  ? 'right'
                  : 'left',
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
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {t('unavailableOnThisDevice')}
          </Text>
        </View>
      </View>
    );
  }

  if (attachment.kind === 'image') {
    return (
      <Image
        accessibilityLabel={attachment.name}
        cachePolicy="memory-disk"
        contentFit="cover"
        recyclingKey={attachment.id}
        source={attachment.localUri}
        transition={motion.duration.fast}
        onError={() => {
          setImageFailed(true);
        }}
        style={styles.image}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={attachment.name}
      style={[
        styles.file,
        isRTL && styles.fileRTL,
        {
          backgroundColor:
            colors.surface,
          borderColor:
            colors.border,
        },
      ]}
    >
      <Text
        importantForAccessibility="no"
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
              textAlign: isRTL
                ? 'right'
                : 'left',
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
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {formatAttachmentBytes(
              attachment.sizeBytes,
            )}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 220,
    height: 180,
    borderRadius: radius.lg,
  },
  file: {
    minWidth: 210,
    maxWidth: 260,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fileRTL: {
    flexDirection: 'row-reverse',
  },
  icon: {
    width: 34,
    fontSize: 22,
    textAlign: 'center',
  },
  fileText: {
    flex: 1,
  },
  name: {
    fontSize: typography.caption,
    lineHeight: 17,
    fontWeight: '600',
    writingDirection: 'auto',
  },
  size: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    writingDirection: 'auto',
  },
});
