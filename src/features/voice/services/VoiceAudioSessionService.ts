import {
  setAudioModeAsync,
} from 'expo-audio';

export class VoiceAudioSessionService {
  async prepareRecording():
    Promise<void> {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      allowsBackgroundRecording: false,
    });
  }

  async preparePlayback():
    Promise<void> {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      allowsBackgroundRecording: false,
    });
  }
}
