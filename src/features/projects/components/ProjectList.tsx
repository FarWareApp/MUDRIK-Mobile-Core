import React, {
  useCallback,
} from 'react';
import {
  FlatList,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';

import type {
  ProjectRecord,
} from '../../../contracts/ProjectRepository';
import { spacing } from '../../../design-system/tokens/spacing';
import { ProjectListItem } from './ProjectListItem';

type ProjectAction = (
  project: ProjectRecord,
) => void;

type Props = {
  projects: ProjectRecord[];
  disabled: boolean;
  onOpen: ProjectAction;
  onArchive: ProjectAction;
  onDelete: ProjectAction;
};

function getProjectKey(
  project: ProjectRecord,
): string {
  return project.id;
}

export function ProjectList({
  projects,
  disabled,
  onOpen,
  onArchive,
  onDelete,
}: Props) {
  const renderItem =
    useCallback<ListRenderItem<ProjectRecord>>(
      ({ item }) => (
        <ProjectListItem
          project={item}
          disabled={disabled}
          onOpen={onOpen}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ),
      [
        disabled,
        onArchive,
        onDelete,
        onOpen,
      ],
    );

  return (
    <FlatList
      data={projects}
      keyExtractor={getProjectKey}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={40}
      windowSize={7}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});
