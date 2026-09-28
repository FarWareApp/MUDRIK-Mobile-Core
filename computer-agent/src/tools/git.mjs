import fs from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalizeRoots,
} from '../path-sandbox.mjs';

export class GitToolError extends Error {
  constructor(code) {
    super(code);
    this.name = 'GitToolError';
    this.code = code;
  }
}

function fail(code) {
  throw new GitToolError(code);
}

const GIT_EXECUTABLE =
  '/usr/bin/git';

const COMMON_CONFIG = Object.freeze([
  '-c',
  'core.hooksPath=/dev/null',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'commit.gpgSign=false',
  '-c',
  'credential.helper=',
  '-c',
  'diff.external=',
]);
const LOCAL_READ = new Set([
  'status',
  'diff',
  'log',
]);

const LOCAL_WRITE = new Set([
  'add',
  'commit',
]);

const UNSUPPORTED_DESTRUCTIVE =
  new Set([
    'reset_hard',
    'clean',
  ]);

const UNSUPPORTED_NETWORK =
  new Set([
    'push',
    'force_push',
  ]);

async function canonicalRepository(
  repository,
  allowedRepositories,
) {
  const allowed =
    await canonicalizeRoots(
      allowedRepositories,
    );
  const requested =
    await canonicalizeRoots([
      repository,
    ]);

  if (
    !allowed
    || !requested
    || !allowed.includes(
      requested[0],
    )
  ) {
    fail('git_repository_denied');
  }

  const root = requested[0];
  const dotGit =
    path.join(root, '.git');

  let info;

  try {
    info = await fs.lstat(dotGit);
  } catch {
    fail('git_repository_invalid');
  }

  if (
    !info.isDirectory()
    || info.isSymbolicLink()
  ) {
    fail('git_repository_invalid');
  }

  let real;

  try {
    real = await fs.realpath(dotGit);
  } catch {
    fail('git_repository_invalid');
  }

  if (real !== dotGit) {
    fail('git_repository_invalid');
  }

  return root;
}

function commonArgs() {
  return [
    '--no-pager',
    ...COMMON_CONFIG,
  ];
}
function commandFor(input) {
  const prefix = commonArgs();

  if (input.operation === 'status') {
    return [
      ...prefix,
      'status',
      '--short',
      '--branch',
      '--untracked-files=normal',
    ];
  }

  if (input.operation === 'diff') {
    return [
      ...prefix,
      'diff',
      '--no-ext-diff',
      '--no-color',
      ...(input.staged
        ? ['--cached']
        : []),
      '--',
      ...input.paths,
    ];
  }

  if (input.operation === 'log') {
    return [
      ...prefix,
      'log',
      '--no-color',
      '--no-ext-diff',
      '--format=%H%x09%an%x09%ae%x09%at%x09%s',
      '-n',
      String(input.maxEntries),
    ];
  }
  if (input.operation === 'add') {
    return [
      ...prefix,
      'add',
      '--',
      ...input.paths,
    ];
  }

  if (input.operation === 'commit') {
    return [
      '--no-pager',
      ...COMMON_CONFIG,
      '-c',
      'user.name='
        + input.authorName,
      '-c',
      'user.email='
        + input.authorEmail,
      'commit',
      '--no-verify',
      '--only',
      '--message',
      input.message,
      '--',
      ...input.paths,
    ];
  }

  return null;
}

function maxOutputFor(input) {
  if (input.operation === 'diff') {
    return input.maxBytes;
  }

  if (input.operation === 'log') {
    return 512 * 1024;
  }

  return 256 * 1024;
}
export async function runGitOperation(
  input,
  {
    allowedRepositories = [],
    sandbox,
    signal,
  } = {},
) {
  if (
    !input
    || typeof input !== 'object'
    || !sandbox
    || typeof sandbox.run !== 'function'
  ) {
    fail('git_invalid_input');
  }

  if (
    UNSUPPORTED_NETWORK.has(
      input.operation,
    )
  ) {
    fail(
      'git_network_operation_unavailable',
    );
  }

  if (
    UNSUPPORTED_DESTRUCTIVE.has(
      input.operation,
    )
  ) {
    fail(
      'git_destructive_operation_unavailable',
    );
  }

  if (
    !LOCAL_READ.has(input.operation)
    && !LOCAL_WRITE.has(
      input.operation,
    )
  ) {
    fail('git_invalid_operation');
  }
  const repository =
    await canonicalRepository(
      input.repository,
      allowedRepositories,
    );
  const args =
    commandFor(input);

  if (!args) {
    fail('git_invalid_operation');
  }

  const readOnly =
    LOCAL_READ.has(input.operation);

  let result;

  try {
    result = await sandbox.run(
      {
        executable:
          GIT_EXECUTABLE,
        args,
        cwd: repository,
        env: {
          GIT_OPTIONAL_LOCKS: '0',
          GIT_TERMINAL_PROMPT: '0',
        },
        timeoutMs: 30_000,
        maxOutputBytes:
          maxOutputFor(input),
      },
      {
        ...(readOnly
          ? {
              readOnlyRoots: [
                repository,
              ],
            }
          : {
              allowedRoots: [
                repository,
              ],
            }),
        signal,
      },
    );
  } catch (error) {
    if (
      error instanceof GitToolError
    ) {
      throw error;
    }

    const code =
      error instanceof Error
        ? error.message
        : '';

    if (
      code === 'sandbox_unavailable'
      || code ===
        'sandbox_executable_denied'
    ) {
      fail('git_backend_unavailable');
    }

    fail('git_execution_failed');
  }

  return Object.freeze({
    exitCode: result.exitCode,
    operation: input.operation,
    repository,
    stdout: result.stdout,
    stderr: result.stderr,
    timedOut: result.timedOut,
    aborted: result.aborted,
    stdoutTruncated:
      result.stdoutTruncated,
    stderrTruncated:
      result.stderrTruncated,
    sandbox:
      result.sandbox
      ?? 'unknown',
    network:
      result.network
      ?? 'isolated',
  });
}
