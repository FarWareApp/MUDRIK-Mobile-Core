import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

export function EmptyChatState() {
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.logo,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.logoText,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          M
        </Text>
      </View>

      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
      >
        {t('emptyChatTitle')}
      </Text>

      <Text
        style={[
          styles.body,
          {
            color: colors.textSecondary,
            textAlign: isRTL ? 'right' : 'left',
          },
        ]}
      >
        {t('emptyChatBody')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  logo: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
  },

  logoText: {
    fontSize: 25,
    fontWeight: '900',
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
  },

  body: {
    marginTop: 8,
    fontSize: 15,
  },
});
