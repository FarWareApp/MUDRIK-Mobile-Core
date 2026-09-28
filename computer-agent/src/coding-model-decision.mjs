import {
  isCodingJobId,
  isCodingSessionId,
} from './coding-job.mjs';

import {
  normalizeToolStep,
} from './tool-contracts.mjs';

const DECISION_ID =
  /^cdecision_[a-z0-9][a-z0-9_-]{15,127}$/;

const CODE =
  /^[a-z][a-z0-9_.-]{0,127}$/;

const ROLES =
  new Set([
    'worker',
    'reviewer',
  ]);

const REVIEWER_CAPABILITIES =
  new Set([
    'filesystem.read',
    'git.read',
    'process.read',
    'browser.read',
    'network.outbound',
    'screen.capture',
    'clipboard.read',
  ]);

const acceptedDecisions =
  new WeakSet();

const KINDS =
  new Set([
    'analysis',
    'request_tools',
    'plan',
    'implementation_proposal',
    'diagnosis',
    'repair_proposal',
    'review',
    'finish_claim',
  ]);

const TOOL_STEP_KEYS =
  new Set([
    'stepId',
    'tool',
    'summary',
    'requiredCapabilities',
    'input',
    'continueOnError',
  ]);

const STEP_ID =
  /^cstep_[a-z0-9][a-z0-9_-]{15,127}$/;

const BASE_KEYS = new Set([
  'decisionId',
  'jobId',
  'sessionId',
  'role',
  'turn',
  'revision',
  'kind',
  'payload',
]);

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

function exactKeys(
  value,
  keys,
) {
  return (
    plainObject(value)
    && Object.keys(value).length
      === keys.size
    && Object.keys(value).every(
      (key) => keys.has(key),
    )
  );
}

function safeCode(value) {
  return (
    typeof value === 'string'
    && CODE.test(value)
  );
}

function deepFreeze(value) {
  if (
    value
    && typeof value === 'object'
    && !Object.isFrozen(value)
  ) {
    Object.freeze(value);

    for (
      const entry of
        Object.values(value)
    ) {
      deepFreeze(entry);
    }
  }

  return value;
}

function parseCodePayload(
  value,
) {
  if (
    !exactKeys(
      value,
      new Set(['summaryCode']),
    )
    || !safeCode(value.summaryCode)
  ) {
    return null;
  }

  return Object.freeze({
    summaryCode: value.summaryCode,
  });
}

function parseToolPayload(
  value,
) {
  if (
    !exactKeys(
      value,
      new Set([
        'purposeCode',
        'steps',
      ]),
    )
    || !safeCode(value.purposeCode)
    || !Array.isArray(value.steps)
    || value.steps.length < 1
    || value.steps.length > 32
  ) {
    return null;
  }

  const steps = [];

  for (const step of value.steps) {
    if (
      !plainObject(step)
      || Object.keys(step).length
        !== TOOL_STEP_KEYS.size
      || Object.keys(step).some(
        (key) =>
          !TOOL_STEP_KEYS.has(key),
      )
      || typeof step.stepId
        !== 'string'
      || !STEP_ID.test(step.stepId)
      || typeof step.tool
        !== 'string'
      || step.tool.length < 1
      || step.tool.length > 64
      || typeof step.summary
        !== 'string'
      || step.summary.length < 1
      || step.summary.length > 1024
      || step.summary.includes('\0')
      || !Array.isArray(
        step.requiredCapabilities,
      )
      || typeof step.continueOnError
        !== 'boolean'
    ) {
      return null;
    }

    const normalized =
      normalizeToolStep(step);

    if (!normalized) {
      return null;
    }

    steps.push(normalized);
  }

  return deepFreeze({
    purposeCode: value.purposeCode,
    steps,
  });
}

function parseReviewPayload(
  value,
) {
  if (
    !exactKeys(
      value,
      new Set([
        'verdict',
        'summaryCode',
        'defectCodes',
      ]),
    )
    || ![
      'accept',
      'reject',
    ].includes(value.verdict)
    || !safeCode(value.summaryCode)
    || !Array.isArray(
      value.defectCodes,
    )
    || value.defectCodes.length > 64
    || value.defectCodes.some(
      (code) => !safeCode(code),
    )
    || new Set(
      value.defectCodes,
    ).size
      !== value.defectCodes.length
    || (
      value.verdict === 'accept'
      && value.defectCodes.length
        !== 0
    )
    || (
      value.verdict === 'reject'
      && value.defectCodes.length
        === 0
    )
  ) {
    return null;
  }

  return Object.freeze({
    verdict: value.verdict,
    summaryCode:
      value.summaryCode,
    defectCodes:
      Object.freeze([
        ...value.defectCodes,
      ]),
  });
}

function parsePayload(
  kind,
  value,
) {
  if (
    kind === 'request_tools'
    || kind ===
      'implementation_proposal'
    || kind === 'repair_proposal'
  ) {
    return parseToolPayload(value);
  }

  if (kind === 'review') {
    return parseReviewPayload(value);
  }

  return parseCodePayload(value);
}

export function parseCodingModelDecision(
  input,
  {
    maxBytes = 1024 * 1024,
  } = {},
) {
  if (
    !exactKeys(input, BASE_KEYS)
    || typeof input.decisionId
      !== 'string'
    || !DECISION_ID.test(
      input.decisionId,
    )
    || !isCodingJobId(input.jobId)
    || !isCodingSessionId(
      input.sessionId,
    )
    || !ROLES.has(input.role)
    || !Number.isInteger(input.turn)
    || input.turn < 1
    || input.turn > 1_000_000
    || !Number.isInteger(
      input.revision,
    )
    || input.revision < 0
    || input.revision > 1_000_000
    || !KINDS.has(input.kind)
    || !Number.isInteger(maxBytes)
    || maxBytes < 1024
    || maxBytes > 1024 * 1024
  ) {
    return null;
  }

  if (
    input.role === 'reviewer'
    && ![
      'analysis',
      'request_tools',
      'review',
    ].includes(input.kind)
  ) {
    return null;
  }

  let encoded;

  try {
    encoded = JSON.stringify(input);
  } catch {
    return null;
  }

  if (
    Buffer.byteLength(
      encoded,
      'utf8',
    ) > maxBytes
  ) {
    return null;
  }

  const payload =
    parsePayload(
      input.kind,
      input.payload,
    );

  if (!payload) {
    return null;
  }

  if (
    input.role === 'reviewer'
    && input.kind
      === 'request_tools'
    && payload.steps.some(
      (step) =>
        step.requiredCapabilities
          .some(
            (capability) =>
              !REVIEWER_CAPABILITIES
                .has(capability),
          ),
    )
  ) {
    return null;
  }

  return deepFreeze({
    decisionId:
      input.decisionId,
    jobId: input.jobId,
    sessionId: input.sessionId,
    role: input.role,
    turn: input.turn,
    revision: input.revision,
    kind: input.kind,
    payload,
  });
}

export class CodingDecisionRegistry {
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
        'Invalid coding decision registry.',
      );
    }

    this.jobId = jobId;
    this.sessionId = sessionId;
    this.byId = new Map();
    this.byTurn = new Map();
  }

  accept(
    input,
    {
      role,
      turn,
      revision,
      maxBytes,
    },
  ) {
    const decision =
      parseCodingModelDecision(
        input,
        { maxBytes },
      );

    if (!decision) {
      return Object.freeze({
        accepted: false,
        reason:
          'model_decision_invalid',
      });
    }

    if (
      decision.jobId !== this.jobId
      || decision.sessionId
        !== this.sessionId
      || decision.role !== role
      || decision.turn !== turn
      || decision.revision !== revision
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'model_decision_stale',
      });
    }

    const canonical =
      JSON.stringify(decision);
    const existingById =
      this.byId.get(
        decision.decisionId,
      );

    if (existingById) {
      return existingById.canonical
        === canonical
        ? Object.freeze({
            accepted: true,
            duplicate: true,
            decision:
              existingById.decision,
          })
        : Object.freeze({
            accepted: false,
            reason:
              'model_decision_conflict',
          });
    }

    const turnKey =
      role + ':' + String(turn);
    const existingTurn =
      this.byTurn.get(turnKey);

    if (existingTurn) {
      return existingTurn.canonical
        === canonical
        ? Object.freeze({
            accepted: true,
            duplicate: true,
            decision:
              existingTurn.decision,
          })
        : Object.freeze({
            accepted: false,
            reason:
              'model_turn_conflict',
          });
    }

    const record =
      Object.freeze({
        canonical,
        decision,
      });

    this.byId.set(
      decision.decisionId,
      record,
    );
    this.byTurn.set(
      turnKey,
      record,
    );
    acceptedDecisions.add(
      decision,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      decision,
    });
  }
}

export function isAcceptedCodingDecision(
  value,
) {
  return acceptedDecisions.has(value);
}
