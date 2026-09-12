import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';

import {
  isManagedAttachmentId,
  isManagedAttachmentUri,
} from '../ManagedAttachmentUri';

const attachmentDirectory =
  new Directory(
    Paths.document,
    'mudrik',
    'attachments',
  );

function ensureDirectory(): void {
  attachmentDirectory.create({
    idempotent: true,
    intermediates: true,
  });
}

function safeExtension(
  originalName: string,
): string {
  const match = originalName
    .trim()
    .match(/(\.[a-zA-Z0-9]{1,12})$/);

  return match?.[1]?.toLowerCase() ?? '';
}

function managedUri(
  localUri: string,
): boolean {
  return isManagedAttachmentUri(
    localUri,
    attachmentDirectory.uri,
  );
}

export class AttachmentFileStore {
  async persist(
    sourceUri: string,
    attachmentId: string,
    originalName: string,
  ): Promise<string> {
    if (
      !isManagedAttachmentId(
        attachmentId,
      )
    ) {
      throw new Error(
        'Invalid attachment ID',
      );
    }

    ensureDirectory();

    const extension =
      safeExtension(originalName);

    const destination =
      new File(
        attachmentDirectory,
        `${attachmentId}${extension}`,
      );

    const source =
      new File(sourceUri);

    await source.copy(
      destination,
      {
        overwrite: false,
      },
    );

    return destination.uri;
  }

  getSize(
    localUri: string,
  ): number | null {
    if (!managedUri(localUri)) {
      return null;
    }

    const file =
      new File(localUri);

    if (!file.exists) {
      return null;
    }

    return file.size;
  }

  delete(
    localUri: string,
  ): void {
    if (!managedUri(localUri)) {
      throw new Error(
        'Refusing unmanaged attachment URI',
      );
    }

    const file =
      new File(localUri);

    if (file.exists) {
      file.delete();
    }
  }

  exists(
    localUri: string,
  ): boolean {
    if (!managedUri(localUri)) {
      return false;
    }

    return new File(localUri).exists;
  }
}
