import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';

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

export class AttachmentFileStore {
  async persist(
    sourceUri: string,
    attachmentId: string,
    originalName: string,
  ): Promise<string> {
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
    const file =
      new File(localUri);

    if (file.exists) {
      file.delete();
    }
  }

  exists(
    localUri: string,
  ): boolean {
    return new File(localUri).exists;
  }
}
