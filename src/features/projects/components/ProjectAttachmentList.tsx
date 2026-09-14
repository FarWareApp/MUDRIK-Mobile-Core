import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { ProjectAttachmentKindIcon } from './ProjectAttachmentKindIcon';
import { ProjectRemoveIcon } from './ProjectRemoveIcon';

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
        accessibilityLiveRegion="polite"
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
          <View style={styles.iconSlot}>
            <ProjectAttachmentKindIcon
              kind={attachment.kind}
              color={colors.textSecondary}
            />
          </View>

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
                transform: [
                  {
                    scale: pressed && !disabled
                      ? motion.press.subtleScale
                      : 1,
                  },
                ],
              },
            ]}
          >
            <ProjectRemoveIcon
              color={colors.error}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typeScale.secondary,
    paddingVertical: spacing.md,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconSlot: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typeScale.secondary,
    flex: 1,
    writingDirection: 'auto',
  },
  remove: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
