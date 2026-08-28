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
      permissionService={
        appServices.permissionService
      }
    />
  );
}
