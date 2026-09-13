import {
  AudioModule,
} from 'expo-audio';

import * as ImagePicker from 'expo-image-picker';

import {
  AppPermissionId,
  AppPermissionRecord,
  PermissionService,
} from '../../../contracts/PermissionService';
import {
  supportsNativeNotificationModule,
} from '../../notifications/services/notificationRuntimeSupport';
import {
  normalizePermissionRecord,
  NativePermissionResult,
} from '../normalizePermissionRecord';

const unsupportedNotificationPermission:
  NativePermissionResult = {
    granted: false,
    status: 'unavailable',
    canAskAgain: false,
  };

async function getNotificationPermission():
  Promise<NativePermissionResult> {
  if (!supportsNativeNotificationModule()) {
    return unsupportedNotificationPermission;
  }

  const Notifications =
    await import('expo-notifications');

  return Notifications
    .getPermissionsAsync();
}

async function requestNotificationPermission():
  Promise<NativePermissionResult> {
  if (!supportsNativeNotificationModule()) {
    return unsupportedNotificationPermission;
  }

  const Notifications =
    await import('expo-notifications');

  return Notifications
    .requestPermissionsAsync();
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

      getNotificationPermission(),
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
      await requestNotificationPermission(),
    );
  }
}
