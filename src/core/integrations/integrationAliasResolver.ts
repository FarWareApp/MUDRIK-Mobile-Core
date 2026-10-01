import {
  ACCOUNT_ID,
  WORKSPACE_ID,
  exactObject,
  safeLabel,
} from './integrationSecurity';

import {
  parseIntegrationDeviceBinding,
  type IntegrationDeviceBinding,
} from './integrationBinding';

export type IntegrationAliasResolution =
  Readonly<{
    status:
      | 'resolved'
      | 'not_found'
      | 'ambiguous'
      | 'invalid_input';
    target: Readonly<{
      bindingId: string;
      bindingRevision: number;
      deviceId: string;
    }> | null;
    grantsAuthority: false;
  }>;
export type IntegrationRoomProjection =
  Readonly<{
    status:
      | 'resolved'
      | 'not_found'
      | 'invalid_input';
    targets: readonly Readonly<{
      bindingId: string;
      bindingRevision: number;
      deviceId: string;
      alias: string | null;
    }>[];
    grantsAuthority: false;
  }>;

const ALIAS_KEYS =
  new Set([
    'accountId',
    'workspaceId',
    'alias',
    'room',
  ]);

const ROOM_KEYS =
  new Set([
    'accountId',
    'workspaceId',
    'room',
  ]);
function normalize(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase('en-US');
}

function activeBindings(
  inputs: readonly unknown[],
  accountId: string,
  workspaceId: string,
): IntegrationDeviceBinding[] | null {
  if (inputs.length > 256) {
    return null;
  }

  const output:
    IntegrationDeviceBinding[] = [];

  for (const input of inputs) {
    const binding =
      parseIntegrationDeviceBinding(
        input,
      );

    if (!binding) {
      return null;
    }

    if (
      binding.state === 'active'
      && binding.accountId === accountId
      && binding.workspaceId
        === workspaceId
    ) {
      output.push(binding);
    }
  }

  return output;
}
export function resolveIntegrationAlias(
  inputs: readonly unknown[],
  query: unknown,
): IntegrationAliasResolution {
  const record =
    exactObject(query, ALIAS_KEYS);

  if (
    !record
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || !safeLabel(record.alias)
    || (
      record.room !== null
      && !safeLabel(record.room)
    )
  ) {
    return Object.freeze({
      status: 'invalid_input',
      target: null,
      grantsAuthority: false,
    });
  }

  const bindings =
    activeBindings(
      inputs,
      record.accountId as string,
      record.workspaceId as string,
    );

  if (!bindings) {
    return Object.freeze({
      status: 'invalid_input',
      target: null,
      grantsAuthority: false,
    });
  }
  const alias =
    normalize(record.alias as string);
  const room =
    record.room === null
      ? null
      : normalize(record.room as string);

  const matches =
    bindings.filter(
      (binding) =>
        binding.alias !== null
        && normalize(binding.alias)
          === alias
        && (
          room === null
          || (
            binding.room !== null
            && normalize(binding.room)
              === room
          )
        ),
    );

  if (matches.length === 0) {
    return Object.freeze({
      status: 'not_found',
      target: null,
      grantsAuthority: false,
    });
  }

  if (matches.length !== 1) {
    return Object.freeze({
      status: 'ambiguous',
      target: null,
      grantsAuthority: false,
    });
  }

  const binding = matches[0];

  return Object.freeze({
    status: 'resolved',
    target: Object.freeze({
      bindingId: binding.bindingId,
      bindingRevision:
        binding.revision,
      deviceId: binding.deviceId,
    }),
    grantsAuthority: false,
  });
}
export function listIntegrationRoomMembers(
  inputs: readonly unknown[],
  query: unknown,
): IntegrationRoomProjection {
  const record =
    exactObject(query, ROOM_KEYS);

  if (
    !record
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || !safeLabel(record.room)
  ) {
    return Object.freeze({
      status: 'invalid_input',
      targets: Object.freeze([]),
      grantsAuthority: false,
    });
  }

  const bindings =
    activeBindings(
      inputs,
      record.accountId as string,
      record.workspaceId as string,
    );

  if (!bindings) {
    return Object.freeze({
      status: 'invalid_input',
      targets: Object.freeze([]),
      grantsAuthority: false,
    });
  }
  const room =
    normalize(record.room as string);

  const targets =
    bindings
      .filter(
        (binding) =>
          binding.room !== null
          && normalize(binding.room)
            === room,
      )
      .map(
        (binding) =>
          Object.freeze({
            bindingId:
              binding.bindingId,
            bindingRevision:
              binding.revision,
            deviceId:
              binding.deviceId,
            alias:
              binding.alias,
          }),
      )
      .sort(
        (left, right) =>
          left.bindingId.localeCompare(
            right.bindingId,
          ),
      );

  return Object.freeze({
    status:
      targets.length > 0
        ? 'resolved'
        : 'not_found',
    targets: Object.freeze(targets),
    grantsAuthority: false,
  });
}
