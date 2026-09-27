import path from 'node:path';

import {
  filesystemPolicyContext,
  normalizeFilesystemStep,
} from './filesystem-contract.mjs';

import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
} from './tools/terminal.mjs';

const TERMINAL_INPUT_KEYS =
  new Set([
    'executable',
    'args',
    'cwd',
    'env',
    'timeoutMs',
    'maxOutputBytes',
    'requiresElevation',
  ]);

const ENV_NAME =
  /^[A-Z_][A-Z0-9_]{0,63}$/;

const SECRET_ENV_NAME =
  /(?:^|_)(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|CREDENTIALS?|AUTHORIZATION)(?:$|_)/i;

const DANGEROUS_ENV_NAMES =
  new Set([
    'BASH_ENV',
    'CDPATH',
    'ENV',
    'GIT_CONFIG',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_GLOBAL',
    'GIT_CONFIG_SYSTEM',
    'GIT_SSH',
    'GIT_SSH_COMMAND',
    'HOME',
    'IFS',
    'LD_LIBRARY_PATH',
    'LD_PRELOAD',
    'NODE_OPTIONS',
    'PATH',
    'PERL5LIB',
    'PERL5OPT',
    'PROMPT_COMMAND',
    'PYTHONHOME',
    'PYTHONPATH',
    'RUBYLIB',
    'RUBYOPT',
    'SHELLOPTS',
    'SSH_ASKPASS',
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

function exactKeys(value, allowed) {
  return Object.keys(value).every(
    (key) => allowed.has(key),
  );
}

function safeString(
  value,
  min,
  max,
) {
  return (
    typeof value === 'string'
    && value.length >= min
    && value.length <= max
    && !value.includes('\0')
  );
}

function parseEnvironment(value) {
  if (value === undefined) {
    return Object.freeze({});
  }

  if (!plainObject(value)) {
    return null;
  }

  const entries =
    Object.entries(value);

  if (entries.length > 64) {
    return null;
  }

  const parsed = {};

  for (const [key, entry] of entries) {
    if (
      !ENV_NAME.test(key)
      || SECRET_ENV_NAME.test(key)
      || DANGEROUS_ENV_NAMES.has(key)
      || !safeString(
        entry,
        0,
        4096,
      )
    ) {
      return null;
    }

    parsed[key] = entry;
  }

  return Object.freeze(parsed);
}

export function parseTerminalToolInput(
  input,
  {
    defaultCwd = process.cwd(),
  } = {},
) {
  if (
    !plainObject(input)
    || !exactKeys(
      input,
      TERMINAL_INPUT_KEYS,
    )
    || !safeString(
      input.executable,
      1,
      4096,
    )
    || !path.isAbsolute(
      input.executable,
    )
    || (
      input.args !== undefined
      && (
        !Array.isArray(input.args)
        || input.args.length > 256
        || input.args.some(
          (arg) =>
            !safeString(
              arg,
              0,
              32_768,
            ),
        )
      )
    )
    || (
      input.cwd !== undefined
      && (
        !safeString(
          input.cwd,
          1,
          4096,
        )
        || !path.isAbsolute(
          input.cwd,
        )
      )
    )
    || (
      input.timeoutMs !== undefined
      && (
        !Number.isInteger(
          input.timeoutMs,
        )
        || input.timeoutMs < 1
        || input.timeoutMs
          > 3_600_000
      )
    )
    || (
      input.maxOutputBytes !== undefined
      && (
        !Number.isInteger(
          input.maxOutputBytes,
        )
        || input.maxOutputBytes < 1024
        || input.maxOutputBytes
          > 8 * 1024 * 1024
      )
    )
    || input.requiresElevation === true
    || (
      input.requiresElevation !== undefined
      && typeof input.requiresElevation
        !== 'boolean'
    )
  ) {
    return null;
  }

  const env =
    parseEnvironment(input.env);

  if (!env) {
    return null;
  }

  const cwd =
    input.cwd ?? defaultCwd;

  if (
    !safeString(cwd, 1, 4096)
    || !path.isAbsolute(cwd)
  ) {
    return null;
  }

  return Object.freeze({
    executable:
      input.executable,
    args:
      Object.freeze([
        ...(input.args ?? []),
      ]),
    cwd,
    env,
    timeoutMs:
      input.timeoutMs
      ?? DEFAULT_TIMEOUT_MS,
    maxOutputBytes:
      input.maxOutputBytes
      ?? DEFAULT_MAX_OUTPUT_BYTES,
    requiresElevation: false,
  });
}

export function normalizeToolStep(
  step,
) {
  if (
    !step
    || typeof step !== 'object'
    || typeof step.tool !== 'string'
    || !Array.isArray(
      step.requiredCapabilities,
    )
  ) {
    return null;
  }

  if (step.tool === 'terminal') {
    if (
      !step.requiredCapabilities
        .includes('terminal.execute')
    ) {
      return null;
    }

    const input =
      parseTerminalToolInput(
        step.input ?? {},
      );

    if (!input) {
      return null;
    }

    return Object.freeze({
      ...step,
      input,
    });
  }

  if (step.tool === 'filesystem') {
    return normalizeFilesystemStep(
      step,
    );
  }

  return null;
}

export function policyContextForToolStep(
  step,
) {
  const normalized =
    normalizeToolStep(step);

  if (!normalized) {
    return null;
  }

  if (normalized.tool === 'terminal') {
    return Object.fromEntries(
      normalized.requiredCapabilities
        .map((capability) => [
          capability,
          {
            cwd:
              normalized.input.cwd,
            executable:
              normalized.input
                .executable,
            timeoutMs:
              normalized.input
                .timeoutMs,
            requiresElevation: false,
            minimumRisk: 'medium',
          },
        ]),
    );
  }

  if (normalized.tool === 'filesystem') {
    return filesystemPolicyContext(
      normalized,
    );
  }

  return null;
}
