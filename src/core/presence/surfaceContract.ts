import {
  isIdentityId,
} from '../identity/identityIds';

export type SurfacePrivacyClass =
  | 'personal_private'
  | 'personal_shared_space'
  | 'household_shared'
  | 'public_or_untrusted';

export type SurfaceKind =
  | 'phone'
  | 'tablet'
  | 'web'
  | 'desktop'
  | 'smart_display'
  | 'television'
  | 'headset'
  | 'vehicle_display'
  | 'ar'
  | 'vr'
  | 'spatial_display';

export type SurfacePresentationCapability =
  | 'text'
  | 'audio_output'
  | 'microphone'
  | 'avatar'
  | 'private_audio';

export type SurfaceDescriptor = Readonly<{
  surfaceId: string;
  deviceId: string;
  kind: SurfaceKind;
  privacyClass: SurfacePrivacyClass;
  capabilities: readonly SurfacePresentationCapability[];
  sharedSpace: boolean;
}>;

const SURFACE_ID_PATTERN =
  /^surf_[a-z0-9][a-z0-9_-]{15,63}$/;

const SURFACE_KINDS: readonly SurfaceKind[] = [
  'phone',
  'tablet',
  'web',
  'desktop',
  'smart_display',
  'television',
  'headset',
  'vehicle_display',
  'ar',
  'vr',
  'spatial_display',
];

const PRIVACY_CLASSES: readonly SurfacePrivacyClass[] = [
  'personal_private',
  'personal_shared_space',
  'household_shared',
  'public_or_untrusted',
];

const CAPABILITIES: readonly SurfacePresentationCapability[] = [
  'text',
  'audio_output',
  'microphone',
  'avatar',
  'private_audio',
];

const ALLOWED_KEYS = new Set([
  'surfaceId',
  'deviceId',
  'kind',
  'privacyClass',
  'capabilities',
  'sharedSpace',
]);

export function isSurfaceId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && SURFACE_ID_PATTERN.test(value)
  );
}

function isKind(
  value: unknown,
): value is SurfaceKind {
  return (
    typeof value === 'string'
    && SURFACE_KINDS.includes(
      value as SurfaceKind,
    )
  );
}

function isPrivacyClass(
  value: unknown,
): value is SurfacePrivacyClass {
  return (
    typeof value === 'string'
    && PRIVACY_CLASSES.includes(
      value as SurfacePrivacyClass,
    )
  );
}

function parseCapabilities(
  value: unknown,
): readonly SurfacePresentationCapability[] | null {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.length > CAPABILITIES.length
  ) {
    return null;
  }

  const result: SurfacePresentationCapability[] = [];
  const seen = new Set<SurfacePresentationCapability>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !CAPABILITIES.includes(
        item as SurfacePresentationCapability,
      )
    ) {
      return null;
    }

    const capability =
      item as SurfacePresentationCapability;

    if (seen.has(capability)) {
      return null;
    }

    seen.add(capability);
    result.push(capability);
  }

  return Object.freeze(result);
}

export function parseSurfaceDescriptor(
  input: unknown,
): SurfaceDescriptor | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length !== ALLOWED_KEYS.size
    || Object.keys(record).some(
      (key) => !ALLOWED_KEYS.has(key),
    )
  ) {
    return null;
  }

  if (
    !isSurfaceId(record.surfaceId)
    || !isIdentityId(
      'device',
      record.deviceId,
    )
    || !isKind(record.kind)
    || !isPrivacyClass(
      record.privacyClass,
    )
    || typeof record.sharedSpace !== 'boolean'
  ) {
    return null;
  }

  const capabilities =
    parseCapabilities(
      record.capabilities,
    );

  if (!capabilities) {
    return null;
  }

  if (
    record.privacyClass === 'personal_private'
    && record.sharedSpace
  ) {
    return null;
  }

  if (
    record.privacyClass === 'public_or_untrusted'
    && !record.sharedSpace
  ) {
    return null;
  }

  if (
    capabilities.includes('private_audio')
    && !capabilities.includes('audio_output')
  ) {
    return null;
  }

  return Object.freeze({
    surfaceId: record.surfaceId,
    deviceId: record.deviceId,
    kind: record.kind,
    privacyClass: record.privacyClass,
    capabilities,
    sharedSpace: record.sharedSpace,
  });
}
