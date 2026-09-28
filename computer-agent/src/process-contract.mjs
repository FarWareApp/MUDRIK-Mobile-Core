import path from 'node:path';

const PROCESS_REF =
  /^proc_[A-Za-z0-9_-]{16,240}$/;

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

function parseEnv(value) {
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

  const env = {};

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

    env[key] = entry;
  }

  return Object.freeze(env);
}

export function isProcessReference(
  value,
) {
  return (
    typeof value === 'string'
    && PROCESS_REF.test(value)
  );
}

export function processCapabilityFor(
  operation,
) {
  if (operation === 'inspect') {
    return 'process.read';
  }

  if (operation === 'start') {
    return 'process.start';
  }

  if (operation === 'stop') {
    return 'process.stop';
  }

  return null;
}

export function processRiskFor(
  operation,
) {
  if (operation === 'inspect') {
    return 'low';
  }

  if (operation === 'start') {
    return 'medium';
  }

  if (operation === 'stop') {
    return 'high';
  }

  return null;
}

export function parseProcessToolInput(
  input,
) {
  if (
    !plainObject(input)
    || ![
      'inspect',
      'start',
      'stop',
    ].includes(input.operation)
    || !isProcessReference(
      input.processRef,
    )
  ) {
    return null;
  }

  if (
    input.operation === 'inspect'
    || input.operation === 'stop'
  ) {
    if (
      Object.keys(input).length !== 2
      || !Object.hasOwn(
        input,
        'operation',
      )
      || !Object.hasOwn(
        input,
        'processRef',
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation: input.operation,
      processRef:
        input.processRef,
    });
  }

  const allowed =
    new Set([
      'operation',
      'processRef',
      'executable',
      'args',
      'cwd',
      'env',
      'maxRuntimeMs',
    ]);

  if (
    Object.keys(input).some(
      (key) => !allowed.has(key),
    )
    || !safeString(
      input.executable,
      1,
      4096,
    )
    || !path.isAbsolute(
      input.executable,
    )
    || !safeString(
      input.cwd,
      1,
      4096,
    )
    || !path.isAbsolute(input.cwd)
    || !Array.isArray(input.args)
    || input.args.length > 256
    || input.args.some(
      (arg) =>
        !safeString(
          arg,
          0,
          32_768,
        ),
    )
    || (
      input.maxRuntimeMs !== undefined
      && (
        !Number.isInteger(
          input.maxRuntimeMs,
        )
        || input.maxRuntimeMs < 100
        || input.maxRuntimeMs
          > 3_600_000
      )
    )
  ) {
    return null;
  }

  const env = parseEnv(input.env);

  if (!env) {
    return null;
  }

  return Object.freeze({
    operation: 'start',
    processRef: input.processRef,
    executable:
      input.executable,
    args:
      Object.freeze([
        ...input.args,
      ]),
    cwd: input.cwd,
    env,
    maxRuntimeMs:
      input.maxRuntimeMs
      ?? 120_000,
  });
}

export function normalizeProcessStep(
  step,
) {
  if (
    !step
    || step.tool !== 'process'
    || !Array.isArray(
      step.requiredCapabilities,
    )
  ) {
    return null;
  }

  const input =
    parseProcessToolInput(
      step.input ?? {},
    );

  if (!input) {
    return null;
  }

  const capability =
    processCapabilityFor(
      input.operation,
    );

  if (
    step.requiredCapabilities.length
      !== 1
    || step.requiredCapabilities[0]
      !== capability
  ) {
    return null;
  }

  return Object.freeze({
    ...step,
    input,
  });
}

export function processPolicyContext(
  step,
) {
  const normalized =
    normalizeProcessStep(step);

  if (!normalized) {
    return null;
  }

  const capability =
    processCapabilityFor(
      normalized.input.operation,
    );
  const context = {
    processRef:
      normalized.input.processRef,
    minimumRisk:
      processRiskFor(
        normalized.input.operation,
      ),
  };

  if (
    normalized.input.operation
      === 'start'
  ) {
    context.cwd =
      normalized.input.cwd;
    context.executable =
      normalized.input.executable;
    context.timeoutMs =
      normalized.input.maxRuntimeMs;
    context.requiresBackground =
      true;
  }

  return {
    [capability]: context,
  };
}
