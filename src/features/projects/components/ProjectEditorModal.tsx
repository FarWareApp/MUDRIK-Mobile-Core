import React, {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
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
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  visible: boolean;
  title: string;
  initialName?: string;
  initialDescription?: string;
  busy?: boolean;
  errorMessage?: string | null;
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
  busy = false,
  errorMessage = null,
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

  const canSave =
    name.trim().length > 0 && !busy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={busy ? () => undefined : onCancel}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
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
            accessibilityState={{ disabled: busy }}
            editable={!busy}
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
                opacity: busy ? 0.72 : 1,
              },
            ]}
          />

          <TextInput
            accessibilityLabel={t('projectDescription')}
            accessibilityState={{ disabled: busy }}
            editable={!busy}
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
                opacity: busy ? 0.72 : 1,
              },
            ]}
          />

          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[
                styles.error,
                { color: colors.error },
              ]}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancelProjectEditing')}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: pressed
                    ? colors.surfacePressed
                    : 'transparent',
                  opacity: busy ? 0.44 : 1,
                  transform: [
                    {
                      scale: pressed && !busy
                        ? motion.press.subtleScale
                        : 1,
                    },
                  ],
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
                  backgroundColor: canSave || busy
                    ? colors.accent
                    : colors.surfaceElevated,
                  opacity: busy
                    ? 0.72
                    : canSave && pressed
                      ? 0.86
                      : 1,
                  transform: [
                    {
                      scale: pressed && canSave
                        ? motion.press.scale
                        : 1,
                    },
                  ],
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  accessibilityRole="progressbar"
                  color={colors.accentText}
                />
              ) : (
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
              )}
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
    ...typeScale.heading,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  input: {
    ...typeScale.secondary,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.secondary,
    minHeight: 112,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    writingDirection: 'auto',
  },
  error: {
    ...typeScale.caption,
    marginTop: spacing.md,
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
    minWidth: 76,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
