import fs from 'node:fs/promises';
import path from 'node:path';

const PROFILES =
  Object.freeze([
    'node.test',
    'npm.script',
  ]);

const PROFILE_SET =
  new Set(PROFILES);

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

function safeRelativePath(value) {
  return (
    safeString(value, 1, 2048)
    && !path.isAbsolute(value)
    && value !== '..'
    && !value.startsWith('../')
    && !value.includes('/../')
  );
}

function parsePaths(value) {
  if (value === undefined) {
    return Object.freeze([]);
  }

  if (
    !Array.isArray(value)
    || value.length > 128
    || value.some(
      (entry) =>
        !safeRelativePath(entry),
    )
    || new Set(value).size
      !== value.length
  ) {
    return null;
  }

  return Object.freeze([...value]);
}

function parseArgs(value) {
  if (value === undefined) {
    return Object.freeze([]);
  }

  if (
    !Array.isArray(value)
    || value.length > 128
    || value.some(
      (entry) =>
        !safeString(
          entry,
          0,
          1024,
        )
        || !/^[A-Za-z0-9_./:=@+,-]*$/
          .test(entry)
        || entry === '..'
        || entry.startsWith('../')
        || entry.includes('/../'),
    )
  ) {
    return null;
  }

  return Object.freeze([...value]);
}

export function isExecutionProfile(
  value,
) {
  return (
    typeof value === 'string'
    && PROFILE_SET.has(value)
  );
}

export function parseExecutionProfileInput(
  input,
) {
  if (
    !plainObject(input)
    || !isExecutionProfile(
      input.executionProfile,
    )
    || !safeString(
      input.cwd,
      1,
      4096,
    )
    || !path.isAbsolute(input.cwd)
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
  ) {
    return null;
  }

  if (
    input.executionProfile
      === 'node.test'
  ) {
    const allowed =
      new Set([
        'executionProfile',
        'cwd',
        'paths',
        'timeoutMs',
        'maxOutputBytes',
      ]);

    if (
      Object.keys(input).some(
        (key) => !allowed.has(key),
      )
    ) {
      return null;
    }

    const paths =
      parsePaths(input.paths);

    if (paths === null) {
      return null;
    }

    return Object.freeze({
      executionProfile:
        'node.test',
      cwd: path.resolve(input.cwd),
      paths,
      timeoutMs:
        input.timeoutMs ?? 120_000,
      maxOutputBytes:
        input.maxOutputBytes
        ?? 2 * 1024 * 1024,
    });
  }

  const allowed =
    new Set([
      'executionProfile',
      'cwd',
      'script',
      'scriptArgs',
      'timeoutMs',
      'maxOutputBytes',
    ]);

  if (
    Object.keys(input).some(
      (key) => !allowed.has(key),
    )
    || !safeString(
      input.script,
      1,
      128,
    )
    || !/^[A-Za-z0-9:_-]+$/.test(
      input.script,
    )
  ) {
    return null;
  }

  const scriptArgs =
    parseArgs(input.scriptArgs);

  if (scriptArgs === null) {
    return null;
  }

  return Object.freeze({
    executionProfile:
      'npm.script',
    cwd: path.resolve(input.cwd),
    script: input.script,
    scriptArgs,
    timeoutMs:
      input.timeoutMs ?? 300_000,
    maxOutputBytes:
      input.maxOutputBytes
      ?? 4 * 1024 * 1024,
  });
}

async function npmCli() {
  const npmLink =
    path.join(
      path.dirname(
        process.execPath,
      ),
      'npm',
    );

  let resolved;

  try {
    resolved =
      await fs.realpath(npmLink);
  } catch {
    throw new Error(
      'execution_profile_unavailable',
    );
  }

  let info;

  try {
    info = await fs.stat(resolved);
  } catch {
    throw new Error(
      'execution_profile_unavailable',
    );
  }

  if (!info.isFile()) {
    throw new Error(
      'execution_profile_unavailable',
    );
  }

  const marker =
    path.sep
    + 'node_modules'
    + path.sep
    + 'npm'
    + path.sep;

  if (!resolved.includes(marker)) {
    throw new Error(
      'execution_profile_unavailable',
    );
  }

  return resolved;
}

export async function resolveExecutionProfile(
  input,
) {
  const parsed =
    parseExecutionProfileInput(
      input,
    );

  if (!parsed) {
    throw new Error(
      'execution_profile_invalid',
    );
  }

  if (
    parsed.executionProfile
      === 'node.test'
  ) {
    return Object.freeze({
      executable:
        process.execPath,
      args: Object.freeze([
        '--test',
        ...parsed.paths,
      ]),
      cwd: parsed.cwd,
      env: Object.freeze({
        CI: '1',
      }),
      timeoutMs:
        parsed.timeoutMs,
      maxOutputBytes:
        parsed.maxOutputBytes,
      readOnlyRoots:
        Object.freeze([]),
    });
  }

  const cli = await npmCli();
  const packageRoot =
    path.resolve(
      path.dirname(cli),
      '..',
      '..',
    );

  return Object.freeze({
    executable:
      process.execPath,
    args: Object.freeze([
      cli,
      'run',
      '--silent',
      parsed.script,
      ...(parsed.scriptArgs.length
        ? [
            '--',
            ...parsed.scriptArgs,
          ]
        : []),
    ]),
    cwd: parsed.cwd,
    env: Object.freeze({
      CI: '1',
      NPM_CONFIG_UPDATE_NOTIFIER:
        'false',
      NPM_CONFIG_AUDIT: 'false',
      NPM_CONFIG_FUND: 'false',
    }),
    timeoutMs:
      parsed.timeoutMs,
    maxOutputBytes:
      parsed.maxOutputBytes,
    readOnlyRoots:
      Object.freeze([
        packageRoot,
      ]),
  });
}
