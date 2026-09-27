import path from 'node:path';

const OPERATIONS =
  new Set([
    'stat',
    'list',
    'read',
    'write',
    'mkdir',
    'delete',
  ]);

const COMMON_KEYS =
  new Set([
    'operation',
    'path',
    'encoding',
    'maxBytes',
    'maxEntries',
    'content',
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
  input,
  allowed,
) {
  return Object.keys(input).every(
    (key) => allowed.has(key),
  );
}

function safePath(value) {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= 4096
    && !value.includes('\0')
    && path.isAbsolute(value)
  );
}

function safeContent(value) {
  return (
    typeof value === 'string'
    && value.length <= 200_000
    && !value.includes('\0')
  );
}

export function filesystemCapabilityFor(
  operation,
) {
  if (
    operation === 'stat'
    || operation === 'list'
    || operation === 'read'
  ) {
    return 'filesystem.read';
  }

  if (
    operation === 'write'
    || operation === 'mkdir'
  ) {
    return 'filesystem.write';
  }

  if (operation === 'delete') {
    return 'filesystem.delete';
  }

  return null;
}

export function filesystemRiskFor(
  operation,
) {
  if (
    operation === 'stat'
    || operation === 'list'
    || operation === 'read'
  ) {
    return 'low';
  }

  if (
    operation === 'write'
    || operation === 'mkdir'
  ) {
    return 'medium';
  }

  if (operation === 'delete') {
    return 'high';
  }

  return null;
}

export function parseFilesystemToolInput(
  input,
) {
  if (
    !plainObject(input)
    || !exactKeys(
      input,
      COMMON_KEYS,
    )
    || !OPERATIONS.has(
      input.operation,
    )
    || !safePath(input.path)
  ) {
    return null;
  }

  const operation =
    input.operation;

  if (
    operation === 'stat'
    || operation === 'mkdir'
    || operation === 'delete'
  ) {
    if (
      input.encoding !== undefined
      || input.maxBytes !== undefined
      || input.maxEntries !== undefined
      || input.content !== undefined
    ) {
      return null;
    }

    return Object.freeze({
      operation,
      path: path.resolve(input.path),
    });
  }

  if (operation === 'list') {
    if (
      input.encoding !== undefined
      || input.maxBytes !== undefined
      || input.content !== undefined
      || (
        input.maxEntries !== undefined
        && (
          !Number.isInteger(
            input.maxEntries,
          )
          || input.maxEntries < 1
          || input.maxEntries > 5000
        )
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation,
      path: path.resolve(input.path),
      maxEntries:
        input.maxEntries ?? 1000,
    });
  }

  if (operation === 'read') {
    if (
      input.maxEntries !== undefined
      || input.content !== undefined
      || (
        input.encoding !== undefined
        && ![
          'utf8',
          'base64',
        ].includes(input.encoding)
      )
      || (
        input.maxBytes !== undefined
        && (
          !Number.isInteger(
            input.maxBytes,
          )
          || input.maxBytes < 1
          || input.maxBytes
            > 8 * 1024 * 1024
        )
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation,
      path: path.resolve(input.path),
      encoding:
        input.encoding ?? 'utf8',
      maxBytes:
        input.maxBytes
        ?? 1024 * 1024,
    });
  }

  if (operation === 'write') {
    if (
      input.maxEntries !== undefined
      || input.maxBytes !== undefined
      || !safeContent(input.content)
      || (
        input.encoding !== undefined
        && ![
          'utf8',
          'base64',
        ].includes(input.encoding)
      )
    ) {
      return null;
    }

    if (
      input.encoding === 'base64'
      && (
        input.content.length % 4 === 1
        || !/^[A-Za-z0-9+/]*={0,2}$/.test(
          input.content,
        )
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation,
      path: path.resolve(input.path),
      encoding:
        input.encoding ?? 'utf8',
      content: input.content,
    });
  }

  return null;
}

export function normalizeFilesystemStep(
  step,
) {
  if (
    !step
    || step.tool !== 'filesystem'
    || !Array.isArray(
      step.requiredCapabilities,
    )
  ) {
    return null;
  }

  const input =
    parseFilesystemToolInput(
      step.input ?? {},
    );

  if (!input) {
    return null;
  }

  const capability =
    filesystemCapabilityFor(
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

export function filesystemPolicyContext(
  step,
) {
  const normalized =
    normalizeFilesystemStep(step);

  if (!normalized) {
    return null;
  }

  const capability =
    filesystemCapabilityFor(
      normalized.input.operation,
    );

  return {
    [capability]: {
      paths: [
        normalized.input.path,
      ],
      minimumRisk:
        filesystemRiskFor(
          normalized.input.operation,
        ),
    },
  };
}
