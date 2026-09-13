import type {
  CompanionProfile,
} from '../../contracts/Companion';

import {
  validateCompanionProfile,
} from './companionProfilePolicy';

export type CompanionInteractionTrigger =
  | 'direct_request'
  | 'necessary_notification'
  | 'proactive_suggestion'
  | 'proactive_reminder'
  | 'status_change';

export type CompanionInteractionDecisionReason =
  | 'allowed_direct_request'
  | 'allowed_necessary_notification'
  | 'allowed_proactive_interaction'
  | 'invalid_input'
  | 'invalid_profile'
  | 'companion_disabled'
  | 'silent_presence'
  | 'normal_presence_no_proactive'
  | 'category_not_authorized'
  | 'quiet_hours'
  | 'initiative_disabled';

export type CompanionInteractionDecision = Readonly<{
  allowedToPresent: boolean;
  reason: CompanionInteractionDecisionReason;
  trigger: CompanionInteractionTrigger | null;

  grantsExecutionAuthority: false;
  grantsSensorAuthority: false;
  grantsMemoryAuthority: false;
  grantsDisclosureAuthority: false;
  changesPrivacyPolicy: false;
}>;

export type CompanionInteractionContext = Readonly<{
  trigger: CompanionInteractionTrigger;
  categoryAuthorized: boolean;
  quietHoursActive: boolean;
}>;

const TRIGGERS: readonly CompanionInteractionTrigger[] = [
  'direct_request',
  'necessary_notification',
  'proactive_suggestion',
  'proactive_reminder',
  'status_change',
];

function decision(
  allowedToPresent: boolean,
  reason: CompanionInteractionDecisionReason,
  trigger: CompanionInteractionTrigger | null,
): CompanionInteractionDecision {
  return Object.freeze({
    allowedToPresent,
    reason,
    trigger,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsMemoryAuthority: false,
    grantsDisclosureAuthority: false,
    changesPrivacyPolicy: false,
  });
}

function parseContext(
  input: unknown,
): CompanionInteractionContext | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  const keys = Object.keys(record);
  const allowedKeys = [
    'trigger',
    'categoryAuthorized',
    'quietHoursActive',
  ];

  if (
    keys.length !== allowedKeys.length
    || keys.some(
      (key) =>
        !allowedKeys.includes(key),
    )
    || typeof record.trigger !== 'string'
    || !TRIGGERS.includes(
      record.trigger as CompanionInteractionTrigger,
    )
    || typeof record.categoryAuthorized !== 'boolean'
    || typeof record.quietHoursActive !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    trigger:
      record.trigger as CompanionInteractionTrigger,
    categoryAuthorized:
      record.categoryAuthorized,
    quietHoursActive:
      record.quietHoursActive,
  });
}

export function evaluateCompanionInteraction(
  profileInput: unknown,
  contextInput: unknown,
): CompanionInteractionDecision {
  const validated =
    validateCompanionProfile(
      profileInput,
    );

  if (
    !validated.accepted
    || !validated.profile
  ) {
    return decision(
      false,
      'invalid_profile',
      null,
    );
  }

  const context =
    parseContext(contextInput);

  if (!context) {
    return decision(
      false,
      'invalid_input',
      null,
    );
  }

  const profile:
    Readonly<CompanionProfile> =
      validated.profile;

  if (!profile.enabled) {
    return decision(
      false,
      'companion_disabled',
      context.trigger,
    );
  }

  if (
    context.trigger ===
    'direct_request'
  ) {
    return decision(
      true,
      'allowed_direct_request',
      context.trigger,
    );
  }

  if (
    profile.presenceLevel ===
    'silent'
  ) {
    return decision(
      false,
      'silent_presence',
      context.trigger,
    );
  }

  if (
    !context.categoryAuthorized
  ) {
    return decision(
      false,
      'category_not_authorized',
      context.trigger,
    );
  }

  if (
    context.quietHoursActive
  ) {
    return decision(
      false,
      'quiet_hours',
      context.trigger,
    );
  }

  if (
    context.trigger ===
    'necessary_notification'
  ) {
    return decision(
      true,
      'allowed_necessary_notification',
      context.trigger,
    );
  }

  if (
    profile.presenceLevel ===
    'normal'
  ) {
    return decision(
      false,
      'normal_presence_no_proactive',
      context.trigger,
    );
  }

  if (profile.initiative === 0) {
    return decision(
      false,
      'initiative_disabled',
      context.trigger,
    );
  }

  return decision(
    true,
    'allowed_proactive_interaction',
    context.trigger,
  );
}
