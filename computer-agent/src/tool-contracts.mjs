import path from 'node:path';

import {
  filesystemPolicyContext,
  normalizeFilesystemStep,
} from './filesystem-contract.mjs';

import {
  gitPolicyContext,
  normalizeGitStep,
} from './git-contract.mjs';

import {
  parseSecretBindings,
  secretReferences,
} from './secret-reference.mjs';

import {
  normalizeProcessStep,
  processPolicyContext,
} from './process-contract.mjs';

import {
  parseExecutionProfileInput,
} from './execution-profile.mjs';

import {
  normalizeRestrictedStep,
  restrictedPolicyContext,
} from './restricted-tool-contracts.mjs';

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
    'secretBindings',
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
  const secretBindings =
    parseSecretBindings(
      input.secretBindings,
    );

  if (
    !env
    || !secretBindings
  ) {
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
    secretBindings,
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
      step.input
      && typeof step.input === 'object'
      && !Array.isArray(step.input)
      && Object.hasOwn(
        step.input,
        'executionProfile',
      )
    ) {
      const input =
        parseExecutionProfileInput(
          step.input,
        );

      if (
        !input
        || step.requiredCapabilities.length
          !== 1
        || step.requiredCapabilities[0]
          !== 'terminal.execute'
      ) {
        return null;
      }

      return Object.freeze({
        ...step,
        input,
      });
    }

    const input =
      parseTerminalToolInput(
        step.input ?? {},
      );

    if (!input) {
      return null;
    }

    const references =
      secretReferences(
        input.secretBindings,
      );
    const required =
      references.length > 0
        ? [
            'terminal.execute',
            'secrets.use',
          ]
        : [
            'terminal.execute',
          ];

    if (
      step.requiredCapabilities.length
        !== required.length
      || required.some(
        (capability, index) =>
          step.requiredCapabilities[index]
            !== capability,
      )
    ) {
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

  if (step.tool === 'git') {
    return normalizeGitStep(step);
  }

  if (step.tool === 'process') {
    return normalizeProcessStep(step);
  }

  if (
    step.tool === 'browser'
    || step.tool === 'screen'
    || step.tool === 'clipboard'
    || step.tool === 'system'
  ) {
    return normalizeRestrictedStep(
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
    if (
      normalized.input.executionProfile
    ) {
      return {
        'terminal.execute': {
          cwd:
            normalized.input.cwd,
          executionProfile:
            normalized.input
              .executionProfile,
          timeoutMs:
            normalized.input
              .timeoutMs,
          requiresElevation: false,
          minimumRisk: 'medium',
        },
      };
    }

    const context = {
      'terminal.execute': {
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
    };
    const references =
      secretReferences(
        normalized.input
          .secretBindings,
      );

    if (references.length > 0) {
      context['secrets.use'] = {
        secretRefs: references,
        minimumRisk: 'high',
      };
    }

    return context;
  }

  if (normalized.tool === 'filesystem') {
    return filesystemPolicyContext(
      normalized,
    );
  }

  if (normalized.tool === 'git') {
    return gitPolicyContext(normalized);
  }

  if (normalized.tool === 'process') {
    return processPolicyContext(
      normalized,
    );
  }

  if (
    normalized.tool === 'browser'
    || normalized.tool === 'screen'
    || normalized.tool === 'clipboard'
    || normalized.tool === 'system'
  ) {
    return restrictedPolicyContext(
      normalized,
    );
  }

  return null;
}
