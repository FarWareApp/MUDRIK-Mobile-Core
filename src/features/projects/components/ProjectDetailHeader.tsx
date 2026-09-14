import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { ProjectBackIcon } from './ProjectBackIcon';
import { ProjectEditIcon } from './ProjectEditIcon';

type Props = {
  title: string;
  busy?: boolean;
  onEdit: () => void;
};

export function ProjectDetailHeader({
  title,
  busy = false,
  onEdit,
}: Props) {
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.circleButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: colors.border,
            transform: [
              {
                scale: pressed
                  ? motion.press.subtleScale
                  : 1,
              },
            ],
          },
        ]}
      >
        <ProjectBackIcon
          color={colors.textPrimary}
          isRTL={isRTL}
        />
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('editProject')}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onEdit}
        style={({ pressed }) => [
          styles.circleButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: colors.border,
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
        <ProjectEditIcon
          color={colors.textPrimary}
        />
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
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontWeight: '700',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
