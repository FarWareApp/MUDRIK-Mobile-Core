import {
  AudioModule,
} from 'expo-audio';

import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

import {
  AppPermissionId,
  AppPermissionRecord,
  PermissionService,
} from '../../../contracts/PermissionService';
import {
  normalizePermissionRecord,
} from '../normalizePermissionRecord';

export class NativePermissionService
  implements PermissionService
{
  async getAll():
    Promise<AppPermissionRecord[]> {
    const [
      microphone,
      camera,
      mediaLibrary,
      notifications,
    ] = await Promise.all([
      AudioModule
        .getRecordingPermissionsAsync(),

      ImagePicker
        .getCameraPermissionsAsync(),

      ImagePicker
        .getMediaLibraryPermissionsAsync(),

      Notifications
        .getPermissionsAsync(),
    ]);

    return [
      normalizePermissionRecord(
        'microphone',
        microphone,
      ),

      normalizePermissionRecord(
        'camera',
        camera,
      ),

      normalizePermissionRecord(
        'media-library',
        mediaLibrary,
      ),

      normalizePermissionRecord(
        'notifications',
        notifications,
      ),
    ];
  }

  async request(
    id: AppPermissionId,
  ): Promise<AppPermissionRecord> {
    if (id === 'microphone') {
      return normalizePermissionRecord(
        id,
        await AudioModule
          .requestRecordingPermissionsAsync(),
      );
    }

    if (id === 'camera') {
      return normalizePermissionRecord(
        id,
        await ImagePicker
          .requestCameraPermissionsAsync(),
      );
    }

    if (
      id === 'media-library'
    ) {
      return normalizePermissionRecord(
        id,
        await ImagePicker
          .requestMediaLibraryPermissionsAsync(),
      );
    }

    return normalizePermissionRecord(
      id,
      await Notifications
        .requestPermissionsAsync(),
    );
  }
}
