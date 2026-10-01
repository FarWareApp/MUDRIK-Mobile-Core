import React, {
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  ProjectSectionHeader,
} from './ProjectSectionHeader';

type Props =
  PropsWithChildren<{
    title: string;
    actionLabel?: string;
    actionText?: string;
    actionIcon?: ReactNode;
    disabled?: boolean;
    onAction?: () => void;
  }>;

export function ProjectWorkspaceSection({
  title,
  actionLabel,
  actionText,
  actionIcon,
  disabled = false,
  onAction,
  children,
}: Props) {
  return (
    <View style={styles.section}>
      <ProjectSectionHeader
        title={title}
        actionLabel={actionLabel}
        actionText={actionText}
        actionIcon={actionIcon}
        disabled={disabled}
        onAction={onAction}
      />

      <InsetSurfaceCard
        elevated={false}
        style={styles.card}
      >
        {children}
      </InsetSurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
