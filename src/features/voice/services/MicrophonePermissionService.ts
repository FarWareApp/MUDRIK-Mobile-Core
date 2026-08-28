import {
  AudioModule,
} from 'expo-audio';

import {
  MicrophonePermissionState,
} from '../types';

export class MicrophonePermissionService {
  async getStatus():
    Promise<MicrophonePermissionState> {
    const result =
      await AudioModule
        .getRecordingPermissionsAsync();

    if (result.granted) {
      return 'granted';
    }

    return result.status === 'denied'
      ? 'denied'
      : 'unknown';
  }

  async request():
    Promise<MicrophonePermissionState> {
    const result =
      await AudioModule
        .requestRecordingPermissionsAsync();

    return result.granted
      ? 'granted'
      : 'denied';
  }
}
