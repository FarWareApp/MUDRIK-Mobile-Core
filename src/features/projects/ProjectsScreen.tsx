import React from 'react';

import { useLocale } from '../../core/localization/LocaleProvider';
import { FeaturePlaceholderScreen } from '../../shared/components/FeaturePlaceholderScreen';

export function ProjectsScreen() {
  const { t } = useLocale();

  return (
    <FeaturePlaceholderScreen
      title={t('projects')}
    />
  );
}
