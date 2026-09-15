import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function CompanionEditorHeader({
  saving,
  onCancel,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cancelCompanionEditing')}
        accessibilityState={{ disabled: saving }}
        disabled={saving}
        onPress={onCancel}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
            opacity: saving ? 0.44 : 1,
            transform: [
              {
                scale:
                  pressed
                  && !saving
                  && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.actionText,
            { color: colors.textSecondary },
          ]}
        >
          {t('cancel')}
        </Text>
      </Pressable>

      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('companion')}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('saveCompanion')}
        accessibilityState={{
          disabled: saving,
          busy: saving,
        }}
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
            opacity: saving ? 0.72 : 1,
            transform: [
              {
                scale:
                  pressed
                  && !saving
                  && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator
            accessibilityRole="progressbar"
            color={colors.accent}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.actionText,
              styles.saveText,
              { color: colors.accent },
            ]}
          >
            {t('save')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
  },
  action: {
    minWidth: 76,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    ...typeScale.secondary,
    fontWeight: '600',
  },
  saveText: {
    fontWeight: '700',
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
});
