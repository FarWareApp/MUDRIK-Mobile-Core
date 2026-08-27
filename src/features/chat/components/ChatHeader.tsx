import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';

type Props = {
  onNewConversation: () => void;
};

export function ChatHeader({
  onNewConversation,
}: Props) {
  const { colors } = useTheme();
  const { isRTL, t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <View style={styles.titleContainer}>
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {t('chatTitle')}
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {t('newConversation')}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newConversation')}
        hitSlop={10}
        onPress={onNewConversation}
        style={[
          styles.newButton,
          {
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 23,
          }}
        >
          ＋
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },

  newButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
});
