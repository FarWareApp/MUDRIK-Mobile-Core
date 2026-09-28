import {
  isCodingJobId,
  isCodingSessionId,
} from './coding-job.mjs';

const EVIDENCE_ID =
  /^cevidence_[a-z0-9][a-z0-9_-]{15,127}$/;

const CODE =
  /^[a-z][a-z0-9_.-]{0,127}$/;

const KINDS =
  new Set([
    'inspection',
    'research',
    'implementation',
    'build',
    'test',
    'review',
  ]);

const OUTCOMES =
  new Set([
    'passed',
    'failed',
    'accepted',
    'rejected',
    'not_required',
  ]);

const SOURCES =
  new Set([
    'tool',
    'reviewer',
    'system',
  ]);

const KEYS = new Set([
  'evidenceId',
  'jobId',
  'sessionId',
  'revision',
  'kind',
  'outcome',
  'summaryCode',
  'acceptedAtMs',
  'source',
]);

const issued = new WeakSet();

function plainObject(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype
    || prototype === null
  );
}

function validShape(input) {
  return (
    plainObject(input)
    && Object.keys(input).length
      === KEYS.size
    && Object.keys(input).every(
      (key) => KEYS.has(key),
    )
    && typeof input.evidenceId
      === 'string'
    && EVIDENCE_ID.test(
      input.evidenceId,
    )
    && isCodingJobId(input.jobId)
    && isCodingSessionId(
      input.sessionId,
    )
    && Number.isInteger(
      input.revision,
    )
    && input.revision >= 0
    && input.revision <= 1_000_000
    && KINDS.has(input.kind)
    && OUTCOMES.has(input.outcome)
    && typeof input.summaryCode
      === 'string'
    && CODE.test(input.summaryCode)
    && Number.isSafeInteger(
      input.acceptedAtMs,
    )
    && input.acceptedAtMs >= 0
    && SOURCES.has(input.source)
  );
}

function semanticOutcome(
  kind,
  outcome,
  source,
) {
  if (kind === 'review') {
    return (
      source === 'reviewer'
      && (
        outcome === 'accepted'
        || outcome === 'rejected'
      )
    );
  }

  if (kind === 'research') {
    return (
      (
        outcome === 'passed'
        || outcome
          === 'not_required'
      )
      && source !== 'reviewer'
    );
  }

  return (
    (
      outcome === 'passed'
      || outcome === 'failed'
    )
    && source !== 'reviewer'
  );
}

export function issueCodingEvidence(
  input,
) {
  if (
    !validShape(input)
    || !semanticOutcome(
      input.kind,
      input.outcome,
      input.source,
    )
  ) {
    return null;
  }

  const evidence =
    Object.freeze({
      ...input,
    });

  issued.add(evidence);

  return evidence;
}

export function isIssuedCodingEvidence(
  value,
) {
  return (
    issued.has(value)
    && validShape(value)
  );
}

export class CodingEvidenceRegistry {
  constructor({
    jobId,
    sessionId,
  } = {}) {
    if (
      !isCodingJobId(jobId)
      || !isCodingSessionId(
        sessionId,
      )
    ) {
      throw new TypeError(
        'Invalid coding evidence registry.',
      );
    }

    this.jobId = jobId;
    this.sessionId = sessionId;
    this.byId = new Map();
  }

  add(evidence) {
    if (
      !isIssuedCodingEvidence(
        evidence,
      )
      || evidence.jobId
        !== this.jobId
      || evidence.sessionId
        !== this.sessionId
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'coding_evidence_invalid',
      });
    }

    const existing =
      this.byId.get(
        evidence.evidenceId,
      );

    if (existing) {
      return existing === evidence
        ? Object.freeze({
            accepted: true,
            duplicate: true,
          })
        : Object.freeze({
            accepted: false,
            reason:
              'coding_evidence_conflict',
          });
    }

    this.byId.set(
      evidence.evidenceId,
      evidence,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
    });
  }

  current(
    revision,
  ) {
    return Object.freeze(
      [...this.byId.values()]
        .filter(
          (evidence) =>
            evidence.revision
              === revision,
        ),
    );
  }
}
