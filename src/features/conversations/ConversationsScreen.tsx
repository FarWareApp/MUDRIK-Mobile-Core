import React from 'react';

import { useLocale } from '../../core/localization/LocaleProvider';
import { FeaturePlaceholderScreen } from '../../shared/components/FeaturePlaceholderScreen';

export function ConversationsScreen() {
  const { t } = useLocale();

  return (
    <FeaturePlaceholderScreen
      title={t('conversations')}
    />
  );
}
