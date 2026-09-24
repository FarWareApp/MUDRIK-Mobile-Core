import {
  isIdentityId,
} from '../identity/identityIds';

export type DeviceFindingRequestKind =
  | 'device.locate'
  | 'device.ring'
  | 'device.guidance';

export type DeviceFindingComponent =
  | 'whole'
  | 'left'
  | 'right'
  | 'case';

export type DeviceFindingRequest = Readonly<{
  finderSessionId: string;
  requestId: string;
  sequence: number;
  kind: DeviceFindingRequestKind;
  targetDeviceId: string | null;
  targetAlias: string | null;
  component: DeviceFindingComponent;
}>;

const FINDER_SESSION_ID =
  /^find_[a-z0-9][a-z0-9_-]{15,63}$/;

const REQUEST_ID =
  /^fdr_[a-z0-9][a-z0-9_-]{15,63}$/;

const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

const KEYS = new Set([
  'finderSessionId',
  'requestId',
  'sequence',
  'kind',
  'targetDeviceId',
  'targetAlias',
  'component',
]);

const KINDS: readonly DeviceFindingRequestKind[] = [
  'device.locate',
  'device.ring',
  'device.guidance',
];

const COMPONENTS: readonly DeviceFindingComponent[] = [
  'whole',
  'left',
  'right',
  'case',
];
export function isFinderSessionId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && FINDER_SESSION_ID.test(value)
  );
}

export function isDeviceFindingRequestId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && REQUEST_ID.test(value)
  );
}

export function normalizeDeviceAlias(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized =
    value.trim().replace(/\s+/g, ' ');

  if (
    normalized.length === 0
    || normalized.length > 80
    || CONTROL_CHAR.test(normalized)
  ) {
    return null;
  }

  return normalized.toLocaleLowerCase('und');
}

function parseNullableDeviceId(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return isIdentityId('device', value)
    ? value
    : undefined;
}
export function parseDeviceFindingRequest(
  input: unknown,
): DeviceFindingRequest | null {
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
    Object.keys(record).length !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
    )
    || !isFinderSessionId(
      record.finderSessionId,
    )
    || !isDeviceFindingRequestId(
      record.requestId,
    )
    || typeof record.sequence !== 'number'
    || !Number.isSafeInteger(record.sequence)
    || record.sequence < 0
    || typeof record.kind !== 'string'
    || !KINDS.includes(
      record.kind as DeviceFindingRequestKind,
    )
    || typeof record.component !== 'string'
    || !COMPONENTS.includes(
      record.component as DeviceFindingComponent,
    )
  ) {
    return null;
  }

  const targetDeviceId =
    parseNullableDeviceId(
      record.targetDeviceId,
    );

  let targetAlias:
    string | null | undefined;

  if (record.targetAlias === null) {
    targetAlias = null;
  } else {
    targetAlias =
      normalizeDeviceAlias(
        record.targetAlias,
      ) ?? undefined;
  }

  if (
    targetDeviceId === undefined
    || targetAlias === undefined
    || (
      (targetDeviceId === null)
      === (targetAlias === null)
    )
  ) {
    return null;
  }

  return Object.freeze({
    finderSessionId:
      record.finderSessionId,
    requestId:
      record.requestId,
    sequence: record.sequence,
    kind:
      record.kind as DeviceFindingRequestKind,
    targetDeviceId,
    targetAlias,
    component:
      record.component as DeviceFindingComponent,
  });
}
