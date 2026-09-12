const ATTACHMENT_ID_PATTERN =
  /^attachment-[0-9]{10,16}-[a-z0-9]{6,16}$/;

const ATTACHMENT_FILE_PATTERN =
  /^attachment-[0-9]{10,16}-[a-z0-9]{6,16}(?:\.[a-z0-9]{1,12})?$/;

export function isManagedAttachmentId(
  value: string,
): boolean {
  return ATTACHMENT_ID_PATTERN.test(
    value,
  );
}

export function isManagedAttachmentUri(
  localUri: string,
  managedDirectoryUri: string,
): boolean {
  if (
    !localUri ||
    !managedDirectoryUri
  ) {
    return false;
  }

  const base =
    managedDirectoryUri.endsWith('/')
      ? managedDirectoryUri
      : `${managedDirectoryUri}/`;

  if (!localUri.startsWith(base)) {
    return false;
  }

  const relative =
    localUri.slice(base.length);

  if (
    !relative ||
    relative.includes('/') ||
    relative.includes('\\') ||
    relative.includes('%')
  ) {
    return false;
  }

  return ATTACHMENT_FILE_PATTERN.test(
    relative,
  );
}
