import React from 'react';

import { useLocale } from '../../core/localization/LocaleProvider';
import { FeaturePlaceholderScreen } from '../../shared/components/FeaturePlaceholderScreen';

export function SettingsScreen() {
  const { t } = useLocale();

  return (
    <FeaturePlaceholderScreen
      title={t('settings')}
    />
  );
}
