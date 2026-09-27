import crypto from 'node:crypto';

import {
  assertKnownCapabilities,
} from './capabilities.mjs';

const ACCOUNT_ID =
  /^acct_[a-z0-9][a-z0-9_-]{15,127}$/;
const DEVICE_ID =
  /^dev_[a-z0-9][a-z0-9_-]{15,127}$/;
const TASK_ID =
  /^ctask_[a-z0-9][a-z0-9_-]{15,127}$/;
const NONCE =
  /^nonce_[A-Za-z0-9_-]{16,240}$/;
const SIGNER_KEY_ID =
  /^skey_[a-z0-9][a-z0-9_-]{15,127}$/;
const STEP_ID =
  /^cstep_[a-z0-9][a-z0-9_-]{7,127}$/;

const SOURCE = new Set([
  'web',
  'mobile',
  'automation',
  'api',
  'local',
]);

const RISK = new Set([
  'low',
  'medium',
  'high',
  'critical',
]);

const TOOLS = new Set([
  'terminal',
  'filesystem',
  'git',
  'process',
  'browser',
  'screen',
  'clipboard',
  'system',
]);

const ENVELOPE_KEYS = new Set([
  'protocolVersion',
  'taskId',
  'accountId',
  'deviceId',
  'source',
  'intent',
  'workspace',
  'risk',
  'requestedCapabilities',
  'approval',
  'createdAt',
  'expiresAt',
  'nonce',
  'steps',
  'metadata',
  'signerKeyId',
  'signature',
]);

const STEP_KEYS = new Set([
  'stepId',
  'tool',
  'summary',
  'requiredCapabilities',
  'input',
  'continueOnError',
]);

const APPROVAL_KEYS = new Set([
  'mode',
  'approvalId',
]);

const FORBIDDEN_SECRET_KEY =
  /(?:^|[_-])(?:password|passwd|secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|private[_-]?key|credential|credentials)(?:$|[_-])/i;

const SECRET_VALUE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:password|passwd|token|api[_-]?key)\s*[:=]\s*[^\s,;]{4,})/i;

function exactKeys(record, allowed) {
  return (
    Object.keys(record).every(
      (key) => allowed.has(key),
    )
  );
}

function validDateTime(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = Date.parse(value);
  return (
    Number.isFinite(parsed)
    && new Date(parsed).toISOString()
      === value
  );
}

function validString(
  value,
  min,
  max,
) {
  return (
    typeof value === 'string'
    && value.length >= min
    && value.length <= max
    && !SECRET_VALUE.test(value)
  );
}

function isPlainRecord(value) {
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

function freezeJson(value) {
  if (
    value === null
    || typeof value !== 'object'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return Object.freeze(
      value.map(freezeJson),
    );
  }

  const copy = {};

  for (const key of Object.keys(value)) {
    copy[key] =
      freezeJson(value[key]);
  }

  return Object.freeze(copy);
}

function isMetadataSafe(value) {
  if (!isPlainRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);

  if (keys.length > 128) {
    return false;
  }

  return keys.every((key) => {
    if (
      key.length > 128
      || FORBIDDEN_SECRET_KEY.test(key)
    ) {
      return false;
    }

    const entry = value[key];

    if (entry === null) {
      return true;
    }

    if (typeof entry === 'string') {
      return (
        entry.length <= 1000
        && !SECRET_VALUE.test(entry)
      );
    }

    return (
      typeof entry === 'boolean'
      || (
        typeof entry === 'number'
        && Number.isFinite(entry)
      )
    );
  });
}

function isJsonSafe(
  value,
  depth = 0,
) {
  if (depth > 12) {
    return false;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === 'string') {
    return !SECRET_VALUE.test(value);
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return (
      value.length <= 1000
      && value.every(
        (entry) =>
          isJsonSafe(entry, depth + 1),
      )
    );
  }

  if (!isPlainRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);

  if (keys.length > 1000) {
    return false;
  }

  for (const key of keys) {
    if (
      key.length > 256
      || FORBIDDEN_SECRET_KEY.test(key)
      || !isJsonSafe(
        value[key],
        depth + 1,
      )
    ) {
      return false;
    }
  }

  return true;
}

function parseApproval(value) {
  if (
    value === undefined
    || value === null
  ) {
    return null;
  }

  if (
    !isPlainRecord(value)
    || !exactKeys(
      value,
      APPROVAL_KEYS,
    )
    || ![
      'automatic',
      'task',
      'one_shot',
      'blocked',
    ].includes(value.mode)
    || (
      value.approvalId !== undefined
      && value.approvalId !== null
      && !validString(
        value.approvalId,
        8,
        160,
      )
    )
  ) {
    return undefined;
  }

  return Object.freeze({
    mode: value.mode,
    approvalId:
      value.approvalId ?? null,
  });
}

function parseStep(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || !exactKeys(value, STEP_KEYS)
    || !STEP_ID.test(value.stepId)
    || !TOOLS.has(value.tool)
    || !validString(
      value.summary,
      1,
      1000,
    )
    || !Array.isArray(
      value.requiredCapabilities,
    )
    || value.requiredCapabilities.length < 1
    || value.requiredCapabilities.length > 32
    || new Set(
      value.requiredCapabilities,
    ).size
      !== value.requiredCapabilities.length
    || (
      value.continueOnError !== undefined
      && typeof value.continueOnError
        !== 'boolean'
    )
    || (
      value.input !== undefined
      && (
        !isPlainRecord(value.input)
        || !isJsonSafe(value.input)
      )
    )
  ) {
    return null;
  }

  try {
    assertKnownCapabilities(
      value.requiredCapabilities,
    );
  } catch {
    return null;
  }

  return Object.freeze({
    stepId: value.stepId,
    tool: value.tool,
    summary: value.summary,
    requiredCapabilities:
      Object.freeze([
        ...value.requiredCapabilities,
      ]),
    input: freezeJson(
      value.input ?? {},
    ),
    continueOnError:
      value.continueOnError === true,
  });
}

function canonicalize(value) {
  if (
    value === null
    || typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return (
      '['
      + value.map(canonicalize).join(',')
      + ']'
    );
  }

  const keys =
    Object.keys(value).sort();

  return (
    '{'
    + keys.map(
      (key) =>
        JSON.stringify(key)
        + ':'
        + canonicalize(value[key]),
    ).join(',')
    + '}'
  );
}

export function canonicalTaskPayload(
  envelope,
) {
  if (
    typeof envelope !== 'object'
    || envelope === null
    || Array.isArray(envelope)
  ) {
    return null;
  }

  const payload = { ...envelope };
  delete payload.signature;

  return Buffer.from(
    canonicalize(payload),
    'utf8',
  );
}

export function parseComputerTaskEnvelope(
  input,
) {
  if (
    !isPlainRecord(input)
    || !exactKeys(
      input,
      ENVELOPE_KEYS,
    )
    || input.protocolVersion !== '1.0'
    || !TASK_ID.test(input.taskId)
    || !ACCOUNT_ID.test(input.accountId)
    || !DEVICE_ID.test(input.deviceId)
    || !SOURCE.has(input.source)
    || !validString(
      input.intent,
      1,
      4000,
    )    || (
      input.workspace !== undefined
      && input.workspace !== null
      && !validString(
        input.workspace,
        1,
        4096,
      )
    )
    || !RISK.has(input.risk)
    || !Array.isArray(
      input.requestedCapabilities,
    )
    || input.requestedCapabilities.length < 1
    || input.requestedCapabilities.length > 32
    || new Set(
      input.requestedCapabilities,
    ).size
      !== input.requestedCapabilities.length
    || !validDateTime(input.createdAt)
    || !validDateTime(input.expiresAt)
    || Date.parse(input.createdAt)
      >= Date.parse(input.expiresAt)
    || !NONCE.test(input.nonce)
    || !Array.isArray(input.steps)
    || input.steps.length < 1
    || input.steps.length > 500
    || (
      input.metadata !== undefined
      && (
        !isMetadataSafe(
          input.metadata,
        )
      )
    )
    || !SIGNER_KEY_ID.test(
      input.signerKeyId,
    )
    || typeof input.signature !== 'string'
    || input.signature.length < 32
    || input.signature.length > 1024
  ) {
    return null;
  }

  try {
    assertKnownCapabilities(
      input.requestedCapabilities,
    );
  } catch {
    return null;
  }

  const approval =
    parseApproval(input.approval);

  if (approval === undefined) {
    return null;
  }

  const steps =
    input.steps.map(parseStep);

  if (
    steps.some((step) => step === null)
    || new Set(
      steps.map((step) => step.stepId),
    ).size !== steps.length
  ) {
    return null;
  }

  const taskCapabilitySet =
    new Set(
      input.requestedCapabilities,
    );

  for (const step of steps) {
    if (
      step.requiredCapabilities.some(
        (capability) =>
          !taskCapabilitySet.has(capability),
      )
    ) {
      return null;
    }
  }

  const parsed =
    Object.freeze({
      protocolVersion: '1.0',
      taskId: input.taskId,
      accountId: input.accountId,
      deviceId: input.deviceId,
      source: input.source,
      intent: input.intent,
      workspace:
        input.workspace ?? null,
      risk: input.risk,
      requestedCapabilities:
        Object.freeze([
          ...input.requestedCapabilities,
        ]),
      approval,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      nonce: input.nonce,
      steps: Object.freeze(steps),
      metadata: freezeJson(
        input.metadata ?? {},
      ),
      signerKeyId:
        input.signerKeyId,
      signature: input.signature,
    });

  const canonical =
    canonicalTaskPayload(parsed);

  if (
    !canonical
    || canonical.byteLength > 256_000
  ) {
    return null;
  }

  return parsed;
}

export function verifyComputerTaskSignature(
  envelope,
  publicKey,
) {
  const parsed =
    parseComputerTaskEnvelope(envelope);

  if (!parsed) {
    return false;
  }

  const payload =
    canonicalTaskPayload(parsed);

  let signature;

  try {
    signature = Buffer.from(
      parsed.signature,
      'base64url',
    );
  } catch {
    return false;
  }

  if (
    !payload
    || signature.length !== 64
  ) {
    return false;
  }

  try {
    return crypto.verify(
      null,
      payload,
      publicKey,
      signature,
    );
  } catch {
    return false;
  }
}
