import {
  isCodingJobId,
  isCodingSessionId,
} from './coding-job.mjs';

const PHASES = Object.freeze([
  'understand',
  'inspect',
  'research',
  'plan',
  'implement',
  'build',
  'test',
  'diagnose',
  'repair',
  'retest',
  'review',
  'finished',
  'blocked',
]);

const PHASE_SET =
  new Set(PHASES);

const EVENTS = new Set([
  'understood',
  'inspected',
  'research_completed',
  'research_not_required',
  'planned',
  'implementation_mutated',
  'implementation_no_change',
  'build_passed',
  'build_failed',
  'test_passed',
  'test_failed',
  'diagnosed',
  'repair_mutated',
  'retest_passed',
  'retest_failed',
  'review_accepted',
  'review_rejected',
  'tool_started',
  'tool_finished',
  'finish_accepted',
  'block',
]);

function validTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function freezeState(value) {
  return Object.freeze({
    ...value,
  });
}

export function createCodingWorkflowState(
  job,
  trustedNowMs,
) {
  if (
    !job
    || !isCodingJobId(job.jobId)
    || !isCodingSessionId(
      job.sessionId,
    )
    || !validTime(trustedNowMs)
  ) {
    throw new TypeError(
      'Invalid coding workflow seed.',
    );
  }

  return freezeState({
    jobId: job.jobId,
    sessionId: job.sessionId,
    phase: 'understand',
    revision: 0,
    repairCycles: 0,
    verificationRetries: 0,
    reviewerVerdict: null,
    researchResolution: null,
    inFlightTool: false,
    blockedReason: null,
    updatedAtMs:
      trustedNowMs,
    grantsAuthority: false,
    performsExternalAction:
      false,
  });
}

export function isCodingWorkflowState(
  value,
) {
  return (
    value
    && typeof value === 'object'
    && isCodingJobId(value.jobId)
    && isCodingSessionId(
      value.sessionId,
    )
    && PHASE_SET.has(value.phase)
    && Number.isInteger(
      value.revision,
    )
    && value.revision >= 0
    && Number.isInteger(
      value.repairCycles,
    )
    && value.repairCycles >= 0
    && Number.isInteger(
      value.verificationRetries,
    )
    && value.verificationRetries
      >= 0
    && typeof value.inFlightTool
      === 'boolean'
    && value.grantsAuthority
      === false
    && value.performsExternalAction
      === false
  );
}

function move(
  state,
  updates,
  trustedNowMs,
) {
  return freezeState({
    ...state,
    ...updates,
    updatedAtMs:
      trustedNowMs,
  });
}

export function transitionCodingWorkflow(
  state,
  event,
  {
    job,
    trustedNowMs,
    reason = null,
  } = {},
) {
  if (
    !isCodingWorkflowState(state)
    || !job
    || state.jobId !== job.jobId
    || state.sessionId
      !== job.sessionId
    || !EVENTS.has(event)
    || !validTime(trustedNowMs)
    || trustedNowMs
      < state.updatedAtMs
  ) {
    return null;
  }

  if (
    state.phase === 'finished'
    || state.phase === 'blocked'
  ) {
    return null;
  }

  if (event === 'tool_started') {
    return state.inFlightTool
      ? null
      : move(
          state,
          {
            inFlightTool: true,
          },
          trustedNowMs,
        );
  }

  if (event === 'tool_finished') {
    return state.inFlightTool
      ? move(
          state,
          {
            inFlightTool: false,
          },
          trustedNowMs,
        )
      : null;
  }

  if (state.inFlightTool) {
    return null;
  }

  if (event === 'block') {
    if (
      typeof reason !== 'string'
      || !/^[a-z][a-z0-9_-]{0,127}$/
        .test(reason)
    ) {
      return null;
    }

    return move(
      state,
      {
        phase: 'blocked',
        blockedReason: reason,
      },
      trustedNowMs,
    );
  }

  const phase = state.phase;

  if (
    phase === 'understand'
    && event === 'understood'
  ) {
    return move(
      state,
      { phase: 'inspect' },
      trustedNowMs,
    );
  }

  if (
    phase === 'inspect'
    && event === 'inspected'
  ) {
    return move(
      state,
      { phase: 'research' },
      trustedNowMs,
    );
  }

  if (
    phase === 'research'
    && (
      event === 'research_completed'
      || event
        === 'research_not_required'
    )
  ) {
    if (
      event ===
        'research_not_required'
      && job.research === 'required'
    ) {
      return null;
    }

    return move(
      state,
      {
        phase: 'plan',
        researchResolution:
          event ===
            'research_completed'
            ? 'completed'
            : 'not_required',
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'plan'
    && event === 'planned'
  ) {
    return move(
      state,
      {
        phase:
          job.observationOnly
            ? 'review'
            : 'implement',
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'implement'
    && event
      === 'implementation_mutated'
  ) {
    return move(
      state,
      {
        revision:
          state.revision + 1,
        phase:
          job.buildRequired
            ? 'build'
            : job.testRequired
              ? 'test'
              : 'review',
        reviewerVerdict: null,
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'implement'
    && event
      === 'implementation_no_change'
  ) {
    return move(
      state,
      {
        phase: 'review',
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'build'
    && event === 'build_passed'
  ) {
    return move(
      state,
      {
        phase:
          job.testRequired
            ? 'test'
            : 'review',
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'build'
    && event === 'build_failed'
  ) {
    return move(
      state,
      {
        phase: 'diagnose',
        verificationRetries:
          state.verificationRetries
          + 1,
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'test'
    && event === 'test_passed'
  ) {
    return move(
      state,
      { phase: 'review' },
      trustedNowMs,
    );
  }

  if (
    phase === 'test'
    && event === 'test_failed'
  ) {
    return move(
      state,
      {
        phase: 'diagnose',
        verificationRetries:
          state.verificationRetries
          + 1,
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'diagnose'
    && event === 'diagnosed'
  ) {
    return move(
      state,
      { phase: 'repair' },
      trustedNowMs,
    );
  }

  if (
    phase === 'repair'
    && event === 'repair_mutated'
  ) {
    return move(
      state,
      {
        phase: 'retest',
        revision:
          state.revision + 1,
        repairCycles:
          state.repairCycles + 1,
        reviewerVerdict: null,
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'retest'
    && event === 'retest_failed'
  ) {
    return move(
      state,
      {
        phase: 'diagnose',
        verificationRetries:
          state.verificationRetries
          + 1,
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'retest'
    && event === 'retest_passed'
  ) {
    return move(
      state,
      { phase: 'review' },
      trustedNowMs,
    );
  }

  if (
    phase === 'review'
    && event === 'review_accepted'
  ) {
    return move(
      state,
      {
        reviewerVerdict:
          'accepted',
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'review'
    && event === 'review_rejected'
  ) {
    return move(
      state,
      {
        phase: 'diagnose',
        reviewerVerdict:
          'rejected',
      },
      trustedNowMs,
    );
  }

  if (
    phase === 'review'
    && event === 'finish_accepted'
    && state.reviewerVerdict
      === 'accepted'
  ) {
    return move(
      state,
      { phase: 'finished' },
      trustedNowMs,
    );
  }

  return null;
}
