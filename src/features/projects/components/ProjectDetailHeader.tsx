import React from 'react';
import {
  StyleSheet,
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
  FlagshipHeaderIdentity,
} from '../../../design-system/components/FlagshipHeaderIdentity';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
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
      <FlagshipHeaderIdentity
        title={title}
      />

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
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
});
