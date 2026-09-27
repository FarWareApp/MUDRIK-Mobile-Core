import {
  authorizeCapability,
} from '../security/capabilityPolicy';

import type {
  CapabilityDecision,
} from '../security/capabilityPolicy';

export type EmergencyResourceCapability =
  | 'emergency.location.read'
  | 'emergency.medical_profile.read'
  | 'emergency.contact.notify'
  | 'emergency.call.initiate';

function exactResourceGrants(
  grants: readonly unknown[],
  resourceId: string,
): readonly unknown[] {
  return grants.filter((grant) => {
    if (
      typeof grant !== 'object'
      || grant === null
      || Array.isArray(grant)
    ) {
      return false;
    }

    const record =
      grant as Record<string, unknown>;
    const scope = record.scope;

    return (
      typeof scope === 'object'
      && scope !== null
      && !Array.isArray(scope)
      && (
        scope as Record<string, unknown>
      ).resourceId === resourceId
    );
  });
}

export function authorizeEmergencyResourceCapability(
  subjectId: string,
  capability: EmergencyResourceCapability,
  resourceId: string,
  grants: readonly unknown[],
  trustedEvaluationTimeMs: number,
): CapabilityDecision {
  return authorizeCapability(
    {
      subjectId,
      capability,
      nowMs: trustedEvaluationTimeMs,
      resourceId,      background: false,
      elevation: 'none',
    },
    exactResourceGrants(
      grants,
      resourceId,
    ),
    trustedEvaluationTimeMs,
  );
}
