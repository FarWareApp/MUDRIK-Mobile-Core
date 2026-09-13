import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import type {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

import {
  AttachmentDraftItem,
} from './AttachmentDraftItem';

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
  const { t } = useLocale();
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
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {attachments.map(
          (attachment) => (
            <AttachmentDraftItem
              key={attachment.id}
              attachment={attachment}
              disabled={busy}
              onRemove={onRemove}
            />
          ),
        )}

        {busy && (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={
              t('addingAttachment')
            }
            style={[
              styles.loadingItem,
              {
                backgroundColor:
                  colors.surfaceElevated,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <ActivityIndicator
              color={colors.accent}
              size="small"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  loadingItem: {
    width: 72,
    height: 92,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
