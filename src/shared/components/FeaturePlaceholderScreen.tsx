import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';

type Props = {
  title: string;
};

export function FeaturePlaceholderScreen({
  title,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 18,
            }}
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.body,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {t('foundationReady')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
  },

  body: {
    marginTop: 10,
    fontSize: 15,
    textAlign: 'center',
  },
});
