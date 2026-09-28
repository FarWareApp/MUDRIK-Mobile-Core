import path from 'node:path';

import {
  isKnownCapability,
} from './capabilities.mjs';

const JOB_ID =
  /^cjob_[a-z0-9][a-z0-9_-]{15,127}$/;

const SESSION_ID =
  /^csession_[a-z0-9][a-z0-9_-]{15,127}$/;

const ACCOUNT_ID =
  /^acct_[a-z0-9][a-z0-9_-]{15,127}$/;

const DEVICE_ID =
  /^dev_[a-z0-9][a-z0-9_-]{15,127}$/;

const TASK_ID =
  /^ctask_[a-z0-9][a-z0-9_-]{15,127}$/;

const KEYS = new Set([
  'jobId',
  'sessionId',
  'accountId',
  'deviceId',
  'outerTaskId',
  'goal',
  'workspaceRoot',
  'requestedCapabilities',
  'research',
  'observationOnly',
  'buildRequired',
  'testRequired',
  'limits',
]);

const LIMIT_KEYS = new Set([
  'maxModelTurns',
  'maxRepairCycles',
  'maxToolRequestsPerTurn',
  'maxToolRequestsPerJob',
  'maxVerificationRetries',
  'maxDecisionBytes',
]);

const RESEARCH =
  new Set([
    'required',
    'optional',
    'not_required',
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

function integerBetween(
  value,
  min,
  max,
) {
  return (
    Number.isInteger(value)
    && value >= min
    && value <= max
  );
}

function parseLimits(value) {
  if (
    !plainObject(value)
    || Object.keys(value).length
      !== LIMIT_KEYS.size
    || Object.keys(value).some(
      (key) => !LIMIT_KEYS.has(key),
    )
    || !integerBetween(
      value.maxModelTurns,
      1,
      256,
    )
    || !integerBetween(
      value.maxRepairCycles,
      0,
      32,
    )
    || !integerBetween(
      value.maxToolRequestsPerTurn,
      1,
      32,
    )
    || !integerBetween(
      value.maxToolRequestsPerJob,
      1,
      1024,
    )
    || !integerBetween(
      value.maxVerificationRetries,
      0,
      32,
    )
    || !integerBetween(
      value.maxDecisionBytes,
      1024,
      1024 * 1024,
    )
  ) {
    return null;
  }

  return Object.freeze({
    maxModelTurns:
      value.maxModelTurns,
    maxRepairCycles:
      value.maxRepairCycles,
    maxToolRequestsPerTurn:
      value.maxToolRequestsPerTurn,
    maxToolRequestsPerJob:
      value.maxToolRequestsPerJob,
    maxVerificationRetries:
      value.maxVerificationRetries,
    maxDecisionBytes:
      value.maxDecisionBytes,
  });
}

export function isCodingJobId(
  value,
) {
  return (
    typeof value === 'string'
    && JOB_ID.test(value)
  );
}

export function isCodingSessionId(
  value,
) {
  return (
    typeof value === 'string'
    && SESSION_ID.test(value)
  );
}

export function parseCodingJob(
  input,
) {
  if (
    !plainObject(input)
    || Object.keys(input).length
      !== KEYS.size
    || Object.keys(input).some(
      (key) => !KEYS.has(key),
    )
    || !isCodingJobId(input.jobId)
    || !isCodingSessionId(
      input.sessionId,
    )
    || typeof input.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      input.accountId,
    )
    || typeof input.deviceId
      !== 'string'
    || !DEVICE_ID.test(
      input.deviceId,
    )
    || typeof input.outerTaskId
      !== 'string'
    || !TASK_ID.test(
      input.outerTaskId,
    )
    || typeof input.goal !== 'string'
    || input.goal.length < 1
    || input.goal.length > 16_384
    || input.goal.includes('\0')
    || typeof input.workspaceRoot
      !== 'string'
    || !path.isAbsolute(
      input.workspaceRoot,
    )
    || path.resolve(
      input.workspaceRoot,
    ) !== input.workspaceRoot
    || !Array.isArray(
      input.requestedCapabilities,
    )
    || input.requestedCapabilities.length
      > 64
    || input.requestedCapabilities.some(
      (capability) =>
        !isKnownCapability(capability),
    )
    || new Set(
      input.requestedCapabilities,
    ).size
      !== input.requestedCapabilities.length
    || !RESEARCH.has(input.research)
    || typeof input.observationOnly
      !== 'boolean'
    || typeof input.buildRequired
      !== 'boolean'
    || typeof input.testRequired
      !== 'boolean'
  ) {
    return null;
  }

  if (
    input.observationOnly
    && (
      input.buildRequired
      || input.testRequired
    )
  ) {
    return null;
  }

  const limits =
    parseLimits(input.limits);

  if (!limits) {
    return null;
  }

  return Object.freeze({
    jobId: input.jobId,
    sessionId: input.sessionId,
    accountId: input.accountId,
    deviceId: input.deviceId,
    outerTaskId:
      input.outerTaskId,
    goal: input.goal,
    workspaceRoot:
      input.workspaceRoot,
    requestedCapabilities:
      Object.freeze([
        ...input
          .requestedCapabilities,
      ]),
    research: input.research,
    observationOnly:
      input.observationOnly,
    buildRequired:
      input.buildRequired,
    testRequired:
      input.testRequired,
    limits,
  });
}
