import {
  parseSurfaceDescriptor,
} from '../presence/surfaceContract';

import type {
  SurfacePresentationCapability,
} from '../presence/surfaceContract';

export type DisplayContentSensitivity =
  | 'public'
  | 'private'
  | 'sensitive';

export type DisplayPresentationMode =
  | 'text'
  | 'audio_output'
  | 'avatar';

export type DisplayPrivacyDecision = Readonly<{
  allowedModes: readonly DisplayPresentationMode[];
  reason:
    | 'allowed'
    | 'partially_allowed'
    | 'presence_not_authorized'
    | 'privacy_suppressed'
    | 'capability_unsupported'
    | 'invalid_input';
  grantsAdditionalDisclosureAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'surface',
  'presencePresentationAuthorized',
  'contentSensitivity',
  'requestedModes',
]);

const MODES: readonly DisplayPresentationMode[] = [
  'text',
  'audio_output',
  'avatar',
];

const SENSITIVITIES:
  readonly DisplayContentSensitivity[] = [
    'public',
    'private',
    'sensitive',
  ];

function decision(
  allowedModes: readonly DisplayPresentationMode[],
  reason: DisplayPrivacyDecision['reason'],
): DisplayPrivacyDecision {
  return Object.freeze({
    allowedModes:
      Object.freeze(
        [...allowedModes],
      ),
    reason,
    grantsAdditionalDisclosureAuthority:
      false,
  });
}

function modeSupported(
  mode: DisplayPresentationMode,
  capabilities:
    readonly SurfacePresentationCapability[],
): boolean {
  return capabilities.includes(mode);
}

export function evaluateDisplayPrivacy(
  input: unknown,
): DisplayPrivacyDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return decision(
      [],
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || typeof record.presencePresentationAuthorized
      !== 'boolean'
    || typeof record.contentSensitivity
      !== 'string'
    || !SENSITIVITIES.includes(
      record.contentSensitivity
        as DisplayContentSensitivity,
    )
    || !Array.isArray(
      record.requestedModes,
    )
    || record.requestedModes.length === 0
    || record.requestedModes.length
      > MODES.length
  ) {
    return decision(
      [],
      'invalid_input',
    );
  }

  const requestedModes:
    DisplayPresentationMode[] = [];
  const seen =
    new Set<DisplayPresentationMode>();

  for (
    const raw
    of record.requestedModes
  ) {
    if (
      typeof raw !== 'string'
      || !MODES.includes(
        raw as DisplayPresentationMode,
      )
      || seen.has(
        raw as DisplayPresentationMode,
      )
    ) {
      return decision(
        [],
        'invalid_input',
      );
    }

    const mode =
      raw as DisplayPresentationMode;

    seen.add(mode);
    requestedModes.push(mode);
  }

  const surface =
    parseSurfaceDescriptor(
      record.surface,
    );

  if (!surface) {
    return decision(
      [],
      'invalid_input',
    );
  }

  if (
    !record.presencePresentationAuthorized
  ) {
    return decision(
      [],
      'presence_not_authorized',
    );
  }

  const sensitivity =
    record.contentSensitivity
      as DisplayContentSensitivity;

  if (
    sensitivity === 'sensitive'
    && surface.privacyClass
      !== 'personal_private'
  ) {
    return decision(
      [],
      'privacy_suppressed',
    );
  }

  if (
    sensitivity === 'private'
    && (
      surface.privacyClass
        === 'household_shared'
      || surface.privacyClass
        === 'public_or_untrusted'
    )
  ) {
    return decision(
      [],
      'privacy_suppressed',
    );
  }

  if (
    sensitivity !== 'public'
    && surface.privacyClass
      === 'public_or_untrusted'
  ) {
    return decision(
      [],
      'privacy_suppressed',
    );
  }

  const allowed:
    DisplayPresentationMode[] = [];

  for (const mode of requestedModes) {
    if (
      !modeSupported(
        mode,
        surface.capabilities,
      )
    ) {
      continue;
    }

    if (
      mode === 'audio_output'
      && sensitivity
        !== 'public'
      && surface.sharedSpace
      && !surface.capabilities.includes(
        'private_audio',
      )
    ) {
      continue;
    }

    allowed.push(mode);
  }

  if (allowed.length === 0) {
    return decision(
      [],
      'capability_unsupported',
    );
  }

  return decision(
    allowed,
    allowed.length
      === requestedModes.length
      ? 'allowed'
      : 'partially_allowed',
  );
}
