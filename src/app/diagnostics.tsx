import React from 'react';

import {
  appServices,
} from '../core/composition/AppServices';
import {
  DiagnosticsScreen,
} from '../features/diagnostics/DiagnosticsScreen';

export default function DiagnosticsRoute() {
  return (
    <DiagnosticsScreen
      repository={
        appServices.diagnosticRepository
      }
      runAttachmentMaintenance={() =>
        appServices
          .attachmentMaintenanceService
          .run()
      }
    />
  );
}
