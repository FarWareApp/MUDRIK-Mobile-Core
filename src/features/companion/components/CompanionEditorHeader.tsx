import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

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
        onPress={onCancel}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
          },
        ]}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontWeight: '600',
          }}
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
        accessibilityState={{ disabled: saving, busy: saving }}
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
            opacity: saving ? 0.44 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: colors.accent,
            fontWeight: '700',
          }}
        >
          {t('save')}
        </Text>
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
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.heading,
    fontWeight: '700',
  },
});
