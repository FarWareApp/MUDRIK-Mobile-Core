import {
  Linking,
} from 'react-native';

import type {
  PermissionSettingsService,
} from '../../../contracts/PermissionSettingsService';

export class NativePermissionSettingsService
  implements PermissionSettingsService
{
  async openAppSettings(): Promise<void> {
    await Linking.openSettings();
  }
}
