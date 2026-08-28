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

function mapPermission(
  id: AppPermissionId,
  result: {
    granted: boolean;
    status: string;
    canAskAgain?: boolean;
  },
): AppPermissionRecord {
  return {
    id,

    status:
      result.granted
        ? 'granted'
        : result.status === 'denied'
          ? 'denied'
          : 'unknown',

    canAskAgain:
      result.canAskAgain ?? true,
  };
}

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
      mapPermission(
        'microphone',
        microphone,
      ),

      mapPermission(
        'camera',
        camera,
      ),

      mapPermission(
        'media-library',
        mediaLibrary,
      ),

      mapPermission(
        'notifications',
        notifications,
      ),
    ];
  }

  async request(
    id: AppPermissionId,
  ): Promise<AppPermissionRecord> {
    if (id === 'microphone') {
      return mapPermission(
        id,
        await AudioModule
          .requestRecordingPermissionsAsync(),
      );
    }

    if (id === 'camera') {
      return mapPermission(
        id,
        await ImagePicker
          .requestCameraPermissionsAsync(),
      );
    }

    if (
      id === 'media-library'
    ) {
      return mapPermission(
        id,
        await ImagePicker
          .requestMediaLibraryPermissionsAsync(),
      );
    }

    return mapPermission(
      id,
      await Notifications
        .requestPermissionsAsync(),
    );
  }
}
