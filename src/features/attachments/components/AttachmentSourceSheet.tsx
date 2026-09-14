import React from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
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
  typography,
} from '../../../design-system/tokens/typography';

import {
  AttachmentSourceAction,
} from './AttachmentSourceAction';

type Props = {
  visible: boolean;
  disabled: boolean;
  onDismiss: () => void;
  onCamera: () => void;
  onMedia: () => void;
  onFiles: () => void;
};

export function AttachmentSourceSheet({
  visible,
  disabled,
  onDismiss,
  onCamera,
  onMedia,
  onFiles,
}: Props) {
  const { reducedMotion } =
    useAccessibility();
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType={
        reducedMotion ? 'none' : 'fade'
      }
      onRequestClose={onDismiss}
      onShow={Keyboard.dismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessible={false}
          onPress={onDismiss}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                colors.overlay,
            },
          ]}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
              paddingBottom:
                Math.max(
                  insets.bottom,
                  spacing.lg,
                ),
              shadowColor:
                colors.shadow,
            },
          ]}
        >
          <View
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.handle,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {t('addAttachment')}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {t('chooseAttachmentSource')}
          </Text>

          <View style={styles.actions}>
            <AttachmentSourceAction
              disabled={disabled}
              label={t('camera')}
              onPress={onCamera}
            />
            <AttachmentSourceAction
              disabled={disabled}
              label={t('photosAndVideos')}
              onPress={onMedia}
            />
            <AttachmentSourceAction
              disabled={disabled}
              label={t('files')}
              onPress={onFiles}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.cancel,
              {
                backgroundColor: pressed
                  ? colors.surfacePressed
                  : colors.surfaceInput,
              },
            ]}
          >
            <Text
              style={[
                styles.cancelText,
                {
                  color:
                    colors.textPrimary,
                },
              ]}
            >
              {t('cancel')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    elevation: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.heading,
    lineHeight: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.secondary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancel: {
    minHeight: 52,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  cancelText: {
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
  },
});
