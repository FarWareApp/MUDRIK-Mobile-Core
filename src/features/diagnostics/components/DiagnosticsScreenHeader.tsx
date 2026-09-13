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
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

export function DiagnosticsScreenHeader() {
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
        accessibilityLabel={t('back')}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          importantForAccessibility="no"
          style={[
            styles.backGlyph,
            { color: colors.textPrimary },
          ]}
        >
          ‹
        </Text>
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('coreHealthDiagnostics')}
      </Text>

      <View style={styles.spacer} />
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
  backButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 24,
  },
  title: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontSize: typography.body,
    fontWeight: '700',
  },
  spacer: {
    width: 44,
  },
});
