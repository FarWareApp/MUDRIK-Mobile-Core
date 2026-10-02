import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  FlagshipIconButton,
} from '../../../design-system/components/FlagshipIconButton';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';
import {
  ProjectBackIcon,
} from './ProjectBackIcon';
import {
  ProjectEditIcon,
} from './ProjectEditIcon';

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
  const {
    isRTL,
    t,
  } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor:
            colors.border,
          backgroundColor:
            'transparent',
        },
      ]}
    >
      <FlagshipIconButton
        accessibilityLabel={t('back')}
        renderIcon={(color) => (
          <ProjectBackIcon
            color={color}
            isRTL={isRTL}
          />
        )}
        onPress={() => router.back()}
      />

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          styles.title,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <FlagshipIconButton
        accessibilityLabel={
          t('editProject')
        }
        disabled={busy}
        renderIcon={(color) => (
          <ProjectEditIcon
            color={color}
          />
        )}
        onPress={onEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontWeight: '800',
  },
});
