import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleSheet,
} from 'react-native';

import {
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

export function SettingsSectionCard({
  children,
}: PropsWithChildren) {
  return (
    <InsetSurfaceCard
      style={styles.card}
    >
      {children}
    </InsetSurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
  },
});
