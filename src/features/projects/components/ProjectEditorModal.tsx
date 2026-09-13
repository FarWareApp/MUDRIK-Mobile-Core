import React, {
  useEffect,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  visible: boolean;
  title: string;
  initialName?: string;
  initialDescription?: string;
  onCancel: () => void;
  onSave: (
    name: string,
    description: string,
  ) => void;
};

export function ProjectEditorModal({
  visible,
  title,
  initialName = '',
  initialDescription = '',
  onCancel,
  onSave,
}: Props) {
  const { colors, mode } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { isRTL, t } = useLocale();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(
    initialDescription,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(initialName);
    setDescription(initialDescription);
  }, [
    initialDescription,
    initialName,
    visible,
  ]);

  const canSave = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.overlay}
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              { color: colors.textPrimary },
            ]}
          >
            {title}
          </Text>

          <TextInput
            accessibilityLabel={t('projectName')}
            value={name}
            onChangeText={setName}
            keyboardAppearance={mode}
            placeholder={t('projectName')}
            placeholderTextColor={colors.textSecondary}
            maxLength={120}
            returnKeyType="next"
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceInput,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          />

          <TextInput
            accessibilityLabel={t('projectDescription')}
            value={description}
            onChangeText={setDescription}
            keyboardAppearance={mode}
            placeholder={t('projectDescription')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            style={[
              styles.description,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceInput,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          />

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancelProjectEditing')}
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('saveProject')}
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => onSave(name, description)}
              style={({ pressed }) => [
                styles.save,
                {
                  backgroundColor: canSave
                    ? colors.accent
                    : colors.surfaceElevated,
                  opacity: canSave && pressed ? 0.86 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: canSave
                    ? colors.accentText
                    : colors.textSecondary,
                  fontWeight: '700',
                }}
              >
                {t('save')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.xl,
    elevation: 8,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.secondary,
    writingDirection: 'auto',
  },
  description: {
    minHeight: 112,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.secondary,
    textAlignVertical: 'top',
    writingDirection: 'auto',
  },
  actions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  save: {
    minHeight: 44,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
