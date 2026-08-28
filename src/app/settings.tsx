import React from 'react';

import {
  appServices,
} from '../core/composition/AppServices';

import {
  SettingsScreen,
} from '../features/settings/SettingsScreen';

export default function SettingsRoute() {
  return (
    <SettingsScreen
      settingsRepository={
        appServices.settingsRepository
      }
      permissionService={
        appServices.permissionService
      }
    />
  );
}
