import {
  Platform,
} from 'react-native';
import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';

const RECORDING_FILE_NAME =
  /^recording-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.m4a$/i;

function nativeRecordingDirectory(): Directory {
  return new Directory(
    Paths.document,
    Platform.OS === 'ios'
      ? 'ExpoAudio'
      : 'Audio',
  );
}

function normalizeDirectoryPrefix(
  uri: string,
): string {
  return uri.endsWith('/')
    ? uri
    : `${uri}/`;
}

export function isManagedVoiceRecordingUri(
  uri: string,
): boolean {
  if (Platform.OS === 'web') {
    return uri.startsWith('blob:');
  }

  const prefix =
    normalizeDirectoryPrefix(
      nativeRecordingDirectory().uri,
    );

  if (!uri.startsWith(prefix)) {
    return false;
  }

  const encodedName =
    uri.slice(prefix.length);

  if (
    encodedName.length === 0
    || encodedName.includes('/')
  ) {
    return false;
  }

  let fileName: string;

  try {
    fileName =
      decodeURIComponent(encodedName);
  } catch {
    return false;
  }

  return RECORDING_FILE_NAME.test(
    fileName,
  );
}

export class VoiceRecordingFileStore {
  delete(uri: string): void {
    if (
      !isManagedVoiceRecordingUri(uri)
    ) {
      throw new Error(
        'Refusing unmanaged voice recording URI',
      );
    }

    if (Platform.OS === 'web') {
      URL.revokeObjectURL(uri);
      return;
    }

    const file = new File(uri);

    if (file.exists) {
      file.delete();
    }
  }
}
