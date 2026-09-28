import path from 'node:path';

const OPERATIONS = new Set([
  'status',
  'diff',
  'log',
  'add',
  'commit',
  'push',
  'force_push',
  'reset_hard',
  'clean',
]);

const READ_OPERATIONS = new Set([
  'status',
  'diff',
  'log',
]);

const LOCAL_WRITE_OPERATIONS =
  new Set([
    'add',
    'commit',
  ]);

const DESTRUCTIVE_OPERATIONS =
  new Set([
    'reset_hard',
    'clean',
  ]);

const NETWORK_OPERATIONS =
  new Set([
    'push',
    'force_push',
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
    && !value.includes('\n')
    && !value.includes('\r')
  );
}
function safeRepository(value) {
  return (
    safeString(value, 1, 4096)
    && path.isAbsolute(value)
  );
}

function safePathspec(value) {
  return (
    safeString(value, 1, 1024)
    && !path.isAbsolute(value)
    && value !== '..'
    && !value.startsWith('../')
    && !value.includes('/../')
  );
}

function parsePaths(value) {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > 128
    || value.some(
      (entry) =>
        !safePathspec(entry),
    )
    || new Set(value).size
      !== value.length
  ) {
    return null;
  }

  return Object.freeze([...value]);
}
function exactKeys(
  value,
  allowed,
) {
  return Object.keys(value).every(
    (key) => allowed.has(key),
  );
}

function base(
  input,
  allowed,
) {
  if (
    !plainObject(input)
    || !exactKeys(input, allowed)
    || !OPERATIONS.has(
      input.operation,
    )
    || !safeRepository(
      input.repository,
    )
  ) {
    return null;
  }

  return {
    operation: input.operation,
    repository:
      path.resolve(input.repository),
  };
}

export function gitCapabilitiesFor(
  operation,
) {
  if (READ_OPERATIONS.has(operation)) {
    return Object.freeze([
      'git.read',
    ]);
  }
  if (
    LOCAL_WRITE_OPERATIONS.has(
      operation,
    )
    || DESTRUCTIVE_OPERATIONS.has(
      operation,
    )
  ) {
    return Object.freeze([
      'git.write',
    ]);
  }

  if (NETWORK_OPERATIONS.has(operation)) {
    return Object.freeze([
      'git.write',
      'network.outbound',
    ]);
  }

  return null;
}

export function gitRiskFor(operation) {
  if (READ_OPERATIONS.has(operation)) {
    return 'low';
  }

  if (
    LOCAL_WRITE_OPERATIONS.has(
      operation,
    )
  ) {
    return 'medium';
  }

  if (
    operation === 'push'
    || DESTRUCTIVE_OPERATIONS.has(
      operation,
    )
  ) {
    return 'high';
  }

  if (operation === 'force_push') {
    return 'critical';
  }

  return null;
}
export function parseGitToolInput(
  input,
) {
  if (!plainObject(input)) {
    return null;
  }

  const operation = input.operation;

  if (operation === 'status') {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
      ]),
    );

    return parsed
      ? Object.freeze(parsed)
      : null;
  }

  if (operation === 'diff') {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
        'paths',
        'staged',
        'maxBytes',
      ]),
    );

    if (!parsed) {
      return null;
    }
    const paths =
      input.paths === undefined
        ? Object.freeze([])
        : parsePaths(input.paths);

    if (
      paths === null
      || (
        input.staged !== undefined
        && typeof input.staged
          !== 'boolean'
      )
      || (
        input.maxBytes !== undefined
        && (
          !Number.isInteger(
            input.maxBytes,
          )
          || input.maxBytes < 1024
          || input.maxBytes
            > 2 * 1024 * 1024
        )
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...parsed,
      paths,
      staged:
        input.staged === true,
      maxBytes:
        input.maxBytes
        ?? 512 * 1024,
    });
  }

  if (operation === 'log') {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
        'maxEntries',
      ]),
    );

    if (
      !parsed
      || (
        input.maxEntries !== undefined
        && (
          !Number.isInteger(
            input.maxEntries,
          )
          || input.maxEntries < 1
          || input.maxEntries > 200
        )
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...parsed,
      maxEntries:
        input.maxEntries ?? 50,
    });
  }

  if (operation === 'add') {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
        'paths',
      ]),
    );
    const paths =
      parsePaths(input.paths);

    if (!parsed || !paths) {
      return null;
    }
    return Object.freeze({
      ...parsed,
      paths,
    });
  }

  if (operation === 'commit') {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
        'paths',
        'message',
        'authorName',
        'authorEmail',
      ]),
    );
    const paths =
      parsePaths(input.paths);

    if (
      !parsed
      || !paths
      || !safeString(
        input.message,
        1,
        4000,
      )
      || !safeString(
        input.authorName,
        1,
        200,
      )
      || !safeString(
        input.authorEmail,
        3,
        320,
      )
      || !/^[^@\s]+@[^@\s]+$/.test(
        input.authorEmail,
      )
    ) {
      return null;
    }
    return Object.freeze({
      ...parsed,
      paths,
      message: input.message,
      authorName:
        input.authorName,
      authorEmail:
        input.authorEmail,
    });
  }

  if (
    operation === 'reset_hard'
    || operation === 'clean'
  ) {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
      ]),
    );

    return parsed
      ? Object.freeze(parsed)
      : null;
  }

  if (
    operation === 'push'
    || operation === 'force_push'
  ) {
    const parsed = base(
      input,
      new Set([
        'operation',
        'repository',
        'remote',
        'remoteHost',
        'refspec',
      ]),
    );

    if (
      !parsed
      || !safeString(
        input.remote,
        1,
        128,
      )
      || !/^[A-Za-z0-9._-]+$/.test(
        input.remote,
      )
      || !safeString(
        input.remoteHost,
        1,
        253,
      )
      || !/^[A-Za-z0-9.-]+$/.test(
        input.remoteHost,
      )
      || !safeString(
        input.refspec,
        1,
        512,
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...parsed,
      remote: input.remote,
      remoteHost:
        input.remoteHost
          .toLowerCase(),
      refspec: input.refspec,
    });
  }

  return null;
}
export function normalizeGitStep(
  step,
) {
  if (
    !step
    || step.tool !== 'git'
    || !Array.isArray(
      step.requiredCapabilities,
    )
  ) {
    return null;
  }

  const input =
    parseGitToolInput(
      step.input ?? {},
    );

  if (!input) {
    return null;
  }

  const required =
    gitCapabilitiesFor(
      input.operation,
    );

  if (
    !required
    || step.requiredCapabilities.length
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
export function gitPolicyContext(
  step,
) {
  const normalized =
    normalizeGitStep(step);

  if (!normalized) {
    return null;
  }

  const risk =
    gitRiskFor(
      normalized.input.operation,
    );
  const context = {};

  for (
    const capability of
      normalized.requiredCapabilities
  ) {
    context[capability] = {
      repository:
        normalized.input.repository,
      minimumRisk: risk,
    };
  }

  if (
    normalized.input.remoteHost
    && context['network.outbound']
  ) {
    context['network.outbound'] = {
      ...context['network.outbound'],
      domain:
        normalized.input.remoteHost,
    };
  }

  return context;
}
