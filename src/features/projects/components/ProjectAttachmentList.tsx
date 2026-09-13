import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AttachmentRecord } from '../../../contracts/Attachment';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  attachments: AttachmentRecord[];
  disabled?: boolean;
  onRemove: (attachment: AttachmentRecord) => void;
};

export function ProjectAttachmentList({
  attachments,
  disabled = false,
  onRemove,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (attachments.length === 0) {
    return (
      <Text
        style={[
          styles.empty,
          { color: colors.textSecondary },
        ]}
      >
        {t('noProjectFiles')}
      </Text>
    );
  }

  return (
    <View>
      {attachments.map((attachment) => (
        <View
          key={attachment.id}
          style={[
            styles.row,
            { borderBottomColor: colors.border },
          ]}
        >
          <Text
            importantForAccessibility="no"
            style={[
              styles.icon,
              { color: colors.textSecondary },
            ]}
          >
            {attachment.kind === 'image'
              ? '▧'
              : attachment.kind === 'video'
                ? '▶'
                : '▤'}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.name,
              { color: colors.textPrimary },
            ]}
          >
            {attachment.name}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('removeProjectFile')}: ${attachment.name}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onRemove(attachment)}
            style={({ pressed }) => [
              styles.remove,
              {
                backgroundColor: pressed
                  ? colors.surfacePressed
                  : 'transparent',
                opacity: disabled ? 0.44 : 1,
              },
            ]}
          >
            <Text
              importantForAccessibility="no"
              style={{
                color: colors.error,
                fontSize: 20,
                fontWeight: '700',
              }}
            >
              ×
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: spacing.md,
    fontSize: typography.secondary,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    fontSize: 20,
    textAlign: 'center',
  },
  name: {
    flex: 1,
    fontSize: typography.secondary,
  },
  remove: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
