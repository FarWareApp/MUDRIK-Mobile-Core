import {
  parseSurfaceDescriptor,
} from '../presence/surfaceContract';

import {
  isEmergencyPacket,
} from './emergencyPacket';

export type EmergencyPresentationMode =
  | 'text'
  | 'audio_output';

export type EmergencyDisclosureLevel =
  | 'private_detail'
  | 'shared_status'
  | 'status_only'
  | 'none';

export type EmergencyDisclosureDecision =
  Readonly<{
    allowed: boolean;
    level: EmergencyDisclosureLevel;
    status:
      | 'possible_critical_emergency'
      | 'emergency_attention'
      | 'attention_required'
      | null;
    riskConfidence: number | null;
    responsiveness:
      | 'unresponsive_timeout'
      | null;    locationIncluded: boolean;
    medicalProfileIncluded: boolean;
    simulated: boolean | null;
    reason:
      | 'allowed_private'
      | 'downgraded_shared_surface'
      | 'status_only'
      | 'surface_capability_missing'
      | 'private_audio_required'
      | 'invalid_input';
    grantsAuthority: false;
  }>;

const INPUT_KEYS = new Set([
  'surface',
  'packet',
  'mode',
]);

function empty(
  allowed: boolean,
  reason: EmergencyDisclosureDecision['reason'],
): EmergencyDisclosureDecision {
  return Object.freeze({
    allowed,
    level: 'none',
    status: null,
    riskConfidence: null,
    responsiveness: null,
    locationIncluded: false,
    medicalProfileIncluded: false,
    simulated: null,
    reason,
    grantsAuthority: false,
  });
}

export function evaluateEmergencyDisclosure(
  input: unknown,
): EmergencyDisclosureDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return empty(
      false,
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
    || (
      record.mode !== 'text'
      && record.mode !== 'audio_output'
    )
  ) {
    return empty(
      false,
      'invalid_input',
    );
  }

  const surface =
    parseSurfaceDescriptor(
      record.surface,
    );
  const packet =
    record.packet;

  if (
    !surface
    || !isEmergencyPacket(packet)
  ) {
    return empty(
      false,
      'invalid_input',
    );
  }

  if (
    !surface.capabilities.includes(
      record.mode,
    )
  ) {
    return empty(
      false,
      'surface_capability_missing',
    );
  }

  if (
    surface.privacyClass
      === 'personal_private'
  ) {
    if (
      record.mode === 'audio_output'
      && !surface.capabilities.includes(
        'private_audio',
      )
    ) {      return empty(
        false,
        'private_audio_required',
      );
    }

    return Object.freeze({
      allowed: true,
      level: 'private_detail',
      status:
        'possible_critical_emergency',
      riskConfidence:
        packet.riskConfidence,
      responsiveness:
        packet.responsiveness,
      locationIncluded:
        packet.locationRef !== null,
      medicalProfileIncluded:
        packet.medicalProfileRef !== null,
      simulated: packet.simulated,
      reason: 'allowed_private',
      grantsAuthority: false,
    });
  }

  if (
    surface.privacyClass
      === 'personal_shared_space'
  ) {
    return Object.freeze({
      allowed: true,
      level: 'shared_status',
      status: 'emergency_attention',
      riskConfidence: null,
      responsiveness: null,
      locationIncluded: false,      medicalProfileIncluded: false,
      simulated: packet.simulated,
      reason:
        'downgraded_shared_surface',
      grantsAuthority: false,
    });
  }

  return Object.freeze({
    allowed: true,
    level: 'status_only',
    status: 'attention_required',
    riskConfidence: null,
    responsiveness: null,
    locationIncluded: false,
    medicalProfileIncluded: false,
    simulated: packet.simulated,
    reason: 'status_only',
    grantsAuthority: false,
  });
}
