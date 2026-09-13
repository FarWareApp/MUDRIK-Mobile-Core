import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import {
  isSurfaceId,
  parseSurfaceDescriptor,
} from './surfaceContract';

import type {
  SurfaceDescriptor,
} from './surfaceContract';

import {
  parseTrustedSurfaceRecord,
} from './trustedSurfaceRecord';

import type {
  TrustedSurfaceRecord,
} from './trustedSurfaceRecord';

export type TrustedSurfaceUpdateResult = Readonly<{
  accepted: boolean;
  reason:
    | 'accepted'
    | 'invalid_registration'
    | 'explicit_approval_required'
    | 'device_not_trusted'
    | 'device_binding_mismatch'
    | 'stale_revision'
    | 'revision_gap';
}>;

const REGISTRATION_KEYS = new Set([
  'accountId',
  'surface',
  'revision',
  'approvedAt',
  'explicitUserApproval',
  'deviceTrustInput',
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

function trustBindingMatches(
  deviceTrustInput: unknown,
  accountId: string,
  deviceId: string,
): boolean {
  if (
    typeof deviceTrustInput !== 'object'
    || deviceTrustInput === null
    || Array.isArray(deviceTrustInput)
  ) {
    return false;
  }

  const record =
    deviceTrustInput as Record<string, unknown>;

  return (
    record.expectedAccountId === accountId
    && record.expectedDeviceId === deviceId
  );
}

function buildRecord(
  input: Readonly<{
    accountId: string;
    surface: SurfaceDescriptor;
    revision: number;
    approvedAt: number;
    state: 'active' | 'revoked';
  }>,
): TrustedSurfaceRecord | null {
  return parseTrustedSurfaceRecord(input);
}

export class TrustedSurfaceRegistry {
  private readonly records =
    new Map<string, TrustedSurfaceRecord>();

  register(
    input: unknown,
  ): TrustedSurfaceUpdateResult {
    if (
      typeof input !== 'object'
      || input === null
      || Array.isArray(input)
    ) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    const record =
      input as Record<string, unknown>;

    if (
      Object.keys(record).length !== REGISTRATION_KEYS.size
      || Object.keys(record).some(
        (key) => !REGISTRATION_KEYS.has(key),
      )
      || !isIdentityId(
        'account',
        record.accountId,
      )
      || !isSafeNonNegativeInteger(record.revision)
      || !isSafeNonNegativeInteger(record.approvedAt)
      || typeof record.explicitUserApproval !== 'boolean'
    ) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    const surface =
      parseSurfaceDescriptor(
        record.surface,
      );

    if (!surface) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    if (!record.explicitUserApproval) {
      return {
        accepted: false,
        reason: 'explicit_approval_required',
      };
    }

    if (
      !trustBindingMatches(
        record.deviceTrustInput,
        record.accountId,
        surface.deviceId,
      )
    ) {
      return {
        accepted: false,
        reason: 'device_binding_mismatch',
      };
    }

    const trustDecision =
      evaluateDeviceTrust(
        record.deviceTrustInput,
      );

    if (!trustDecision.trusted) {
      return {
        accepted: false,
        reason: 'device_not_trusted',
      };
    }

    const current =
      this.records.get(
        surface.surfaceId,
      );

    if (!current) {
      if (record.revision !== 1) {
        return {
          accepted: false,
          reason: 'revision_gap',
        };
      }
    } else {
      if (record.revision <= current.revision) {
        return {
          accepted: false,
          reason: 'stale_revision',
        };
      }

      if (record.revision !== current.revision + 1) {
        return {
          accepted: false,
          reason: 'revision_gap',
        };
      }

      if (
        current.accountId !== record.accountId
        || current.surface.deviceId !== surface.deviceId
      ) {
        return {
          accepted: false,
          reason: 'device_binding_mismatch',
        };
      }
    }

    const next = buildRecord({
      accountId: record.accountId,
      surface,
      revision: record.revision,
      approvedAt: record.approvedAt,
      state: 'active',
    });

    if (!next) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    this.records.set(
      surface.surfaceId,
      next,
    );

    return {
      accepted: true,
      reason: 'accepted',
    };
  }

  revoke(
    surfaceId: string,
    revision: number,
  ): TrustedSurfaceUpdateResult {
    if (
      !isSurfaceId(surfaceId)
      || !isSafeNonNegativeInteger(revision)
    ) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    const current =
      this.records.get(surfaceId);

    if (!current) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    if (revision <= current.revision) {
      return {
        accepted: false,
        reason: 'stale_revision',
      };
    }

    if (revision !== current.revision + 1) {
      return {
        accepted: false,
        reason: 'revision_gap',
      };
    }

    const next = buildRecord({
      accountId: current.accountId,
      surface: current.surface,
      revision,
      approvedAt: current.approvedAt,
      state: 'revoked',
    });

    if (!next) {
      return {
        accepted: false,
        reason: 'invalid_registration',
      };
    }

    this.records.set(
      surfaceId,
      next,
    );

    return {
      accepted: true,
      reason: 'accepted',
    };
  }

  getActiveSurface(
    surfaceId: string,
    accountId: string,
  ): SurfaceDescriptor | null {
    const record =
      this.records.get(surfaceId);

    if (
      !record
      || record.state !== 'active'
      || record.accountId !== accountId
    ) {
      return null;
    }

    return record.surface;
  }

  getRecord(
    surfaceId: string,
  ): TrustedSurfaceRecord | null {
    return this.records.get(surfaceId) ?? null;
  }
}
