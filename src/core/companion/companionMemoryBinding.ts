import {
  validateCompanionProfile,
} from './companionProfilePolicy';

export type CompanionMemoryBinding = Readonly<{
  bound: boolean;
  memoryPolicyId: string | null;
  reason:
    | 'bound'
    | 'not_configured'
    | 'companion_disabled'
    | 'invalid_profile';

  grantsMemoryAuthority: false;
  grantsMemoryCategoryAccess: false;
}>;

export function resolveCompanionMemoryBinding(
  profileInput: unknown,
): CompanionMemoryBinding {
  const validated =
    validateCompanionProfile(
      profileInput,
    );

  if (
    !validated.accepted
    || !validated.profile
  ) {
    return Object.freeze({
      bound: false,
      memoryPolicyId: null,
      reason: 'invalid_profile',
      grantsMemoryAuthority: false,
      grantsMemoryCategoryAccess: false,
    });
  }

  const profile = validated.profile;

  if (!profile.enabled) {
    return Object.freeze({
      bound: false,
      memoryPolicyId:
        profile.memoryPolicyId,
      reason: 'companion_disabled',
      grantsMemoryAuthority: false,
      grantsMemoryCategoryAccess: false,
    });
  }

  if (!profile.memoryPolicyId) {
    return Object.freeze({
      bound: false,
      memoryPolicyId: null,
      reason: 'not_configured',
      grantsMemoryAuthority: false,
      grantsMemoryCategoryAccess: false,
    });
  }

  return Object.freeze({
    bound: true,
    memoryPolicyId:
      profile.memoryPolicyId,
    reason: 'bound',
    grantsMemoryAuthority: false,
    grantsMemoryCategoryAccess: false,
  });
}
