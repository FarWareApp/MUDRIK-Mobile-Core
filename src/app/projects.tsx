import React from 'react';

import {
  appServices,
} from '../core/composition/AppServices';

import {
  ProjectsScreen,
} from '../features/projects/ProjectsScreen';

export default function ProjectsRoute() {
  return (
    <ProjectsScreen
      repository={
        appServices.projectRepository
      }
      onProjectDeleted={async () => {
        await appServices
          .attachmentCleanupService
          .cleanupOrphans();
      }}
    />
  );
}
