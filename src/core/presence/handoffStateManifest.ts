import type {
  ObservationPrivacyPolicyState,
} from '../privacy/observationPrivacyState';

import {
  isSurfaceId,
} from './surfaceContract';

export type HandoffStateManifest = Readonly<{
  presenceSessionId: string;
  sourceSurfaceId: string;
  targetSurfaceId: string;
  generation: number;
  companionId: 'companion_primary';
  companionProfileRevision: number;
  conversationRef: string | null;
  shortTermContextRef: string | null;
  activeTaskRef: string | null;
  mediaContextRef: string | null;
  pendingApprovalRefs: readonly string[];
  privacyState: ObservationPrivacyPolicyState;
  createdAt: number;
  grantsInheritedAuthority: false;
}>;

const SESSION_PATTERN =
  /^psess_[a-z0-9][a-z0-9_-]{15,63}$/;

const REFERENCE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const PRIVACY_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const ALLOWED_KEYS = new Set([
  'presenceSessionId',
  'sourceSurfaceId',
  'targetSurfaceId',
  'generation',
  'companionId',
  'companionProfileRevision',
  'conversationRef',
  'shortTermContextRef',
  'activeTaskRef',
  'mediaContextRef',
  'pendingApprovalRefs',
  'privacyState',
  'createdAt',
]);

function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function parseReference(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'string'
    && REFERENCE_PATTERN.test(value)
  ) {
    return value;
  }

  return undefined;
}

function parseReferenceList(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 16
  ) {
    return null;
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const parsed = parseReference(item);

    if (
      parsed === null
      || parsed === undefined
      || seen.has(parsed)
    ) {
      return null;
    }

    seen.add(parsed);
    result.push(parsed);
  }

  return Object.freeze(result);
}

export function parseHandoffStateManifest(
  input: unknown,
): HandoffStateManifest | null {
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

  const conversationRef =
    parseReference(record.conversationRef);
  const shortTermContextRef =
    parseReference(record.shortTermContextRef);
  const activeTaskRef =
    parseReference(record.activeTaskRef);
  const mediaContextRef =
    parseReference(record.mediaContextRef);
  const pendingApprovalRefs =
    parseReferenceList(record.pendingApprovalRefs);

  if (
    typeof record.presenceSessionId !== 'string'
    || !SESSION_PATTERN.test(
      record.presenceSessionId,
    )
    || !isSurfaceId(record.sourceSurfaceId)
    || !isSurfaceId(record.targetSurfaceId)
    || record.sourceSurfaceId === record.targetSurfaceId
    || !isSafeNonNegativeInteger(record.generation)
    || record.generation < 1
    || record.companionId !== 'companion_primary'
    || !isSafeNonNegativeInteger(
      record.companionProfileRevision,
    )
    || record.companionProfileRevision < 1
    || conversationRef === undefined
    || shortTermContextRef === undefined
    || activeTaskRef === undefined
    || mediaContextRef === undefined
    || !pendingApprovalRefs
    || typeof record.privacyState !== 'string'
    || !PRIVACY_STATES.includes(
      record.privacyState as ObservationPrivacyPolicyState,
    )
    || !isSafeNonNegativeInteger(record.createdAt)
  ) {
    return null;
  }

  return Object.freeze({
    presenceSessionId:
      record.presenceSessionId,
    sourceSurfaceId:
      record.sourceSurfaceId,
    targetSurfaceId:
      record.targetSurfaceId,
    generation: record.generation,
    companionId: 'companion_primary',
    companionProfileRevision:
      record.companionProfileRevision,
    conversationRef,
    shortTermContextRef,
    activeTaskRef,
    mediaContextRef,
    pendingApprovalRefs,
    privacyState:
      record.privacyState as ObservationPrivacyPolicyState,
    createdAt: record.createdAt,
    grantsInheritedAuthority: false,
  });
}
