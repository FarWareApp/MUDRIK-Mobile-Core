import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import {
  AttachmentKind,
  PickedAttachment,
} from '../../../contracts/Attachment';
import {
  AttachmentPicker,
} from '../../../contracts/AttachmentPicker';
import {
  AttachmentPermissionError,
} from './AttachmentPermissionError';

function mediaKind(
  type:
    | 'image'
    | 'video'
    | 'livePhoto'
    | 'pairedVideo'
    | null
    | undefined,
): AttachmentKind {
  return type === 'video'
    ? 'video'
    : 'image';
}

export class NativeAttachmentPicker
  implements AttachmentPicker
{
  async pickMedia():
    Promise<PickedAttachment[]> {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [
          'images',
          'videos',
        ],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 1,
      });

    if (result.canceled) {
      return [];
    }

    return result.assets.map(
      (asset): PickedAttachment => ({
        sourceUri: asset.uri,

        kind: mediaKind(asset.type),
        source: 'library',

        name:
          asset.fileName ??
          `media-${Date.now()}`,

        mimeType:
          asset.mimeType ?? null,

        sizeBytes:
          asset.fileSize ?? null,

        width:
          asset.width ?? null,

        height:
          asset.height ?? null,

        durationMs:
          asset.duration ?? null,
      }),
    );
  }

  async takePhoto():
    Promise<PickedAttachment[]> {
    const permission =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (!permission.granted) {
      throw new AttachmentPermissionError(
        'camera',
      );
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

    if (result.canceled) {
      return [];
    }

    return result.assets.map(
      (asset): PickedAttachment => ({
        sourceUri: asset.uri,

        kind: 'image',
        source: 'camera',

        name:
          asset.fileName ??
          `camera-${Date.now()}.jpg`,

        mimeType:
          asset.mimeType ??
          'image/jpeg',

        sizeBytes:
          asset.fileSize ?? null,

        width:
          asset.width ?? null,

        height:
          asset.height ?? null,

        durationMs: null,
      }),
    );
  }

  async pickDocuments():
    Promise<PickedAttachment[]> {
    const result =
      await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

    if (result.canceled) {
      return [];
    }

    return result.assets.map(
      (asset): PickedAttachment => ({
        sourceUri: asset.uri,

        kind: 'document',
        source: 'document',

        name: asset.name,

        mimeType:
          asset.mimeType ?? null,

        sizeBytes:
          asset.size ?? null,

        width: null,
        height: null,
        durationMs: null,
      }),
    );
  }
}
