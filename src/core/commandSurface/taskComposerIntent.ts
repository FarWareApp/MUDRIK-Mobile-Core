import {
  isComputerControlCapability,
  type ComputerControlCapability,
} from './computerCapabilities';

import {
  isCommandSurfaceId,
} from './surfaceIds';

export type CommandTaskComposerIntent =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    destinationDeviceId: string;
    instruction: string;
    capabilityHints:
      readonly ComputerControlCapability[];
    projectRef: string | null;
    issuedAtMs: number;
    grantsAuthority: false;
  }>;

const KEYS = new Set([
  'protocolVersion',
  'accountId',
  'destinationDeviceId',
  'instruction',
  'capabilityHints',
  'projectRef',
  'issuedAtMs',
  'grantsAuthority',
]);

const PROJECT_REF =
  /^proj_[a-z0-9][a-z0-9_-]{15,127}$/;

function safeInstruction(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && value.trim().length >= 1
    && value.length <= 12_000
    && !value.includes('\0')
  );
}

function safeTime(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function parseHints(
  value: unknown,
): readonly ComputerControlCapability[] | null {
  if (
    !Array.isArray(value)
    || value.length > 16
    || value.some(
      (entry) =>
        !isComputerControlCapability(
          entry,
        ),
    )
    || new Set(value).size
      !== value.length
  ) {
    return null;
  }

  return Object.freeze([
    ...value,
  ]) as readonly ComputerControlCapability[];
}

export function parseCommandTaskComposerIntent(
  input: unknown,
): CommandTaskComposerIntent | null {
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
    Object.keys(record).length
      !== KEYS.size
    || Object.keys(record).some(
      (key) => !KEYS.has(key),
    )
    || record.protocolVersion
      !== '1.0'
    || !isCommandSurfaceId(
      'account',
      record.accountId,
    )
    || !isCommandSurfaceId(
      'device',
      record.destinationDeviceId,
    )
    || !safeInstruction(
      record.instruction,
    )
    || (
      record.projectRef !== null
      && (
        typeof record.projectRef
          !== 'string'
        || !PROJECT_REF.test(
          record.projectRef,
        )
      )
    )
    || !safeTime(record.issuedAtMs)
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  const hints =
    parseHints(
      record.capabilityHints,
    );

  if (!hints) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      record.accountId,
    destinationDeviceId:
      record.destinationDeviceId,
    instruction:
      record.instruction.trim(),
    capabilityHints: hints,
    projectRef:
      (record.projectRef as string | null),
    issuedAtMs:
      record.issuedAtMs,
    grantsAuthority: false,
  });
}
