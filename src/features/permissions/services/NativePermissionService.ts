import {
  AudioModule,
} from 'expo-audio';

import * as ImagePicker from 'expo-image-picker';

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
    ] = await Promise.all([
      AudioModule
        .getRecordingPermissionsAsync(),

      ImagePicker
        .getCameraPermissionsAsync(),

      ImagePicker
        .getMediaLibraryPermissionsAsync(),
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

    return mapPermission(
      id,
      await ImagePicker
        .requestMediaLibraryPermissionsAsync(),
    );
  }
}
