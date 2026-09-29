import {
  parseMemoryPolicy,
} from '../memory/memoryPolicy';

import {
  ACCOUNT_ID,
} from '../memory/memorySecurity';

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

export type CompanionMemoryPolicyBinding =
  Readonly<{
    bound: boolean;
    memoryPolicyId: string | null;
    policyRevision: number | null;
    retrievalPermitted: boolean;
    reason:
      | 'bound'
      | 'not_configured'
      | 'companion_disabled'
      | 'invalid_profile'
      | 'invalid_account'
      | 'invalid_policy'
      | 'account_mismatch'
      | 'policy_mismatch'
      | 'memory_disabled';

    grantsMemoryAuthority: false;
    grantsMemoryCategoryAccess: false;
    grantsRetrievalAuthority: false;
    grantsExecutionAuthority: false;
    grantsToolAuthority: false;
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

function strictResult(
  input: {
    bound: boolean;
    memoryPolicyId:
      string | null;
    policyRevision:
      number | null;
    retrievalPermitted: boolean;
    reason:
      CompanionMemoryPolicyBinding[
        'reason'
      ];
  },
): CompanionMemoryPolicyBinding {
  return Object.freeze({
    ...input,
    grantsMemoryAuthority: false,
    grantsMemoryCategoryAccess: false,
    grantsRetrievalAuthority: false,
    grantsExecutionAuthority: false,
    grantsToolAuthority: false,
  });
}

export function resolveCompanionMemoryPolicyBinding(
  profileInput: unknown,
  policyInput: unknown,
  accountId: string,
): CompanionMemoryPolicyBinding {
  const validated =
    validateCompanionProfile(
      profileInput,
    );

  if (
    !validated.accepted
    || !validated.profile
  ) {
    return strictResult({
      bound: false,
      memoryPolicyId: null,
      policyRevision: null,
      retrievalPermitted: false,
      reason: 'invalid_profile',
    });
  }

  const profile = validated.profile;

  if (!profile.enabled) {
    return strictResult({
      bound: false,
      memoryPolicyId:
        profile.memoryPolicyId,
      policyRevision: null,
      retrievalPermitted: false,
      reason:
        'companion_disabled',
    });
  }

  if (!profile.memoryPolicyId) {
    return strictResult({
      bound: false,
      memoryPolicyId: null,
      policyRevision: null,
      retrievalPermitted: false,
      reason: 'not_configured',
    });
  }

  if (
    typeof accountId !== 'string'
    || !ACCOUNT_ID.test(accountId)
  ) {
    return strictResult({
      bound: false,
      memoryPolicyId:
        profile.memoryPolicyId,
      policyRevision: null,
      retrievalPermitted: false,
      reason: 'invalid_account',
    });
  }

  const policy =
    parseMemoryPolicy(
      policyInput,
    );

  if (!policy) {
    return strictResult({
      bound: false,
      memoryPolicyId:
        profile.memoryPolicyId,
      policyRevision: null,
      retrievalPermitted: false,
      reason: 'invalid_policy',
    });
  }

  if (
    policy.accountId !== accountId
  ) {
    return strictResult({
      bound: false,
      memoryPolicyId:
        profile.memoryPolicyId,
      policyRevision:
        policy.revision,
      retrievalPermitted: false,
      reason: 'account_mismatch',
    });
  }

  if (
    policy.policyId
      !== profile.memoryPolicyId
  ) {
    return strictResult({
      bound: false,
      memoryPolicyId:
        profile.memoryPolicyId,
      policyRevision:
        policy.revision,
      retrievalPermitted: false,
      reason: 'policy_mismatch',
    });
  }

  if (
    policy.mode === 'disabled'
    || !policy.retrievalEnabled
  ) {
    return strictResult({
      bound: true,
      memoryPolicyId:
        policy.policyId,
      policyRevision:
        policy.revision,
      retrievalPermitted: false,
      reason: 'memory_disabled',
    });
  }

  return strictResult({
    bound: true,
    memoryPolicyId:
      policy.policyId,
    policyRevision:
      policy.revision,
    retrievalPermitted: true,
    reason: 'bound',
  });
}
