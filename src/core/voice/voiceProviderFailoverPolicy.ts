import type { VoiceServiceKind } from './voiceProviderRouting';

export type VoiceProviderAttemptPhase =
  | 'selected'
  | 'started'
  | 'output_observed'
  | 'closed';

export type VoiceProviderFailoverDecision = Readonly<{
  allowed: boolean;
  requiresGenerationRotation: boolean;
  reason:
    | 'allowed_before_output'
    | 'allowed_with_generation_rotation'
    | 'invalid_input'
    | 'same_provider'
    | 'attempt_closed'
    | 'input_replay_required'
    | 'output_mixing_forbidden'
    | 'explicit_restart_required';
}>;

const PROVIDER_REF = /^vp_[A-Za-z0-9_-]{8,80}$/;
const PHASES: readonly VoiceProviderAttemptPhase[] = [
  'selected',
  'started',
  'output_observed',
  'closed',
];

function result(
  allowed: boolean,
  requiresGenerationRotation: boolean,
  reason: VoiceProviderFailoverDecision['reason'],
): VoiceProviderFailoverDecision {
  return Object.freeze({
    allowed,
    requiresGenerationRotation,
    reason,
  });
}

export function evaluateVoiceProviderFailover(
  input: unknown,
): VoiceProviderFailoverDecision {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return result(false, false, 'invalid_input');
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'service',
    'currentProviderRef',
    'nextProviderRef',
    'attemptPhase',
    'bufferedInputReplayAvailable',
    'explicitRestart',
    'generationWillRotate',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    (record.service !== 'stt' && record.service !== 'tts') ||
    typeof record.currentProviderRef !== 'string' ||
    !PROVIDER_REF.test(record.currentProviderRef) ||
    typeof record.nextProviderRef !== 'string' ||
    !PROVIDER_REF.test(record.nextProviderRef) ||
    typeof record.attemptPhase !== 'string' ||
    !PHASES.includes(record.attemptPhase as VoiceProviderAttemptPhase) ||
    typeof record.bufferedInputReplayAvailable !== 'boolean' ||
    typeof record.explicitRestart !== 'boolean' ||
    typeof record.generationWillRotate !== 'boolean'
  ) {
    return result(false, false, 'invalid_input');
  }

  const service = record.service as VoiceServiceKind;
  const phase = record.attemptPhase as VoiceProviderAttemptPhase;

  if (record.currentProviderRef === record.nextProviderRef) {
    return result(false, false, 'same_provider');
  }

  if (phase === 'closed') {
    return result(false, false, 'attempt_closed');
  }

  if (phase === 'selected') {
    return result(true, false, 'allowed_before_output');
  }

  if (phase === 'started') {
    if (
      service === 'stt' &&
      !record.bufferedInputReplayAvailable
    ) {
      return result(false, false, 'input_replay_required');
    }

    return result(true, false, 'allowed_before_output');
  }

  if (!record.explicitRestart) {
    return result(false, true, 'explicit_restart_required');
  }

  if (!record.generationWillRotate) {
    return result(false, true, 'output_mixing_forbidden');
  }

  if (
    service === 'stt' &&
    !record.bufferedInputReplayAvailable
  ) {
    return result(false, true, 'input_replay_required');
  }

  return result(
    true,
    true,
    'allowed_with_generation_rotation',
  );
}
