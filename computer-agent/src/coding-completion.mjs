import {
  isIssuedCodingEvidence,
} from './coding-evidence.mjs';

import {
  isAcceptedCodingDecision,
} from './coding-model-decision.mjs';

import {
  isCodingWorkflowState,
} from './coding-workflow.mjs';

function evidenceMatch(
  evidence,
  {
    job,
    revision,
    kind,
    outcome,
  },
) {
  return evidence.some(
    (entry) =>
      isIssuedCodingEvidence(entry)
      && entry.jobId === job.jobId
      && entry.sessionId
        === job.sessionId
      && entry.revision === revision
      && entry.kind === kind
      && (
        Array.isArray(outcome)
          ? outcome.includes(
              entry.outcome,
            )
          : entry.outcome === outcome
      ),
  );
}

export function evaluateCodingCompletion({
  job,
  state,
  evidence,
  finishDecision,
  outerLifecycleState,
}) {
  if (
    !job
    || !isCodingWorkflowState(state)
    || state.jobId !== job.jobId
    || state.sessionId
      !== job.sessionId
    || !Array.isArray(evidence)
    || !finishDecision
    || !isAcceptedCodingDecision(
      finishDecision,
    )
    || finishDecision.kind
      !== 'finish_claim'
    || finishDecision.role
      !== 'worker'
    || finishDecision.jobId
      !== job.jobId
    || finishDecision.sessionId
      !== job.sessionId
    || finishDecision.revision
      !== state.revision
    || state.phase !== 'review'
    || state.inFlightTool
    || state.reviewerVerdict
      !== 'accepted'
    || outerLifecycleState
      !== 'running'
  ) {
    return Object.freeze({
      allowed: false,
      reason:
        'completion_prerequisite_missing',
    });
  }

  const revision =
    state.revision;

  if (job.observationOnly) {
    if (
      !evidenceMatch(
        evidence,
        {
          job,
          revision,
          kind: 'inspection',
          outcome: 'passed',
        },
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'inspection_evidence_missing',
      });
    }
  } else {
    if (
      !evidenceMatch(
        evidence,
        {
          job,
          revision,
          kind:
            'implementation',
          outcome: 'passed',
        },
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'implementation_evidence_missing',
      });
    }

    if (
      job.buildRequired
      && !evidenceMatch(
        evidence,
        {
          job,
          revision,
          kind: 'build',
          outcome: 'passed',
        },
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'build_evidence_missing',
      });
    }

    if (
      job.testRequired
      && !evidenceMatch(
        evidence,
        {
          job,
          revision,
          kind: 'test',
          outcome: 'passed',
        },
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'test_evidence_missing',
      });
    }
  }

  if (
    !evidenceMatch(
      evidence,
      {
        job,
        revision,
        kind: 'review',
        outcome: 'accepted',
      },
    )
  ) {
    return Object.freeze({
      allowed: false,
      reason:
        'review_evidence_missing',
    });
  }

  return Object.freeze({
    allowed: true,
    reason:
      'completion_authorized',
    revision,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}
