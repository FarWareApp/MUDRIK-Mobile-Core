import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url';

import {
  parseFilesystemToolInput,
} from '../filesystem-contract.mjs';

export class FilesystemSandboxError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      'FilesystemSandboxError';
    this.code = code;
  }
}

function fail(code) {
  throw new FilesystemSandboxError(code);
}

const HERE =
  path.dirname(
    fileURLToPath(import.meta.url),
  );

const SOURCE_ROOT =
  path.resolve(HERE, '..');

const WORKER_MODULE =
  path.join(
    SOURCE_ROOT,
    'tools',
    'filesystem.mjs',
  );

const WORKER_SOURCE = String.raw`
let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  body += chunk;
});
process.stdin.on('end', async () => {
  try {
    const payload = JSON.parse(body);
    const module = await import(process.argv[1]);
    const result =
      await module.runFilesystemOperation(
        payload.input,
        {
          allowedRoots:
            payload.allowedRoots,
        },
      );

    process.stdout.write(
      JSON.stringify({
        ok: true,
        result,
      }),
    );
  } catch (error) {
    const candidate =
      error && typeof error.code === 'string'
        ? error.code
        : error && typeof error.message === 'string'
          ? error.message
          : '';

    const safe =
      /^[a-z][a-z0-9_-]{0,127}$/.test(
        candidate,
      )
        ? candidate
        : 'filesystem_worker_failed';

    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: safe,
      }),
    );
    process.exitCode = 2;
  }
});
`;

function mutation(operation) {
  return (
    operation === 'write'
    || operation === 'mkdir'
    || operation === 'delete'
  );
}

export class SandboxedFilesystemAdapter {
  constructor({
    sandbox,
  } = {}) {
    if (
      !sandbox
      || typeof sandbox.run
        !== 'function'
    ) {
      throw new TypeError(
        'Filesystem sandbox backend is required.',
      );
    }

    this.sandbox = sandbox;
  }

  async run(
    input,
    {
      allowedRoots = [],
      signal,
    } = {},
  ) {
    const parsed =
      parseFilesystemToolInput(input);

    if (
      !parsed
      || !Array.isArray(allowedRoots)
      || allowedRoots.length < 1
      || allowedRoots.length > 64
    ) {
      fail('filesystem_sandbox_invalid');
    }

    const stdin =
      JSON.stringify({
        input: parsed,
        allowedRoots,
      });

    if (
      Buffer.byteLength(
        stdin,
        'utf8',
      ) > 1024 * 1024
    ) {
      fail('filesystem_sandbox_input_limit');
    }

    let execution;

    try {
      execution =
        await this.sandbox.run(
          {
            executable:
              process.execPath,
            args: [
              '--input-type=module',
              '-e',
              WORKER_SOURCE,
              pathToFileURL(
                WORKER_MODULE,
              ).href,
            ],
            cwd: allowedRoots[0],
            env: {},
            stdin,
            timeoutMs: 30_000,
            maxOutputBytes:
              12 * 1024 * 1024,
          },
          {
            ...(mutation(
              parsed.operation,
            )
              ? {
                  allowedRoots,
                  readOnlyRoots: [
                    SOURCE_ROOT,
                  ],
                }
              : {
                  readOnlyRoots: [
                    ...allowedRoots,
                    SOURCE_ROOT,
                  ],
                }),
            signal,
          },
        );
    } catch {
      fail('filesystem_sandbox_failed');
    }

    let envelope;

    try {
      envelope =
        JSON.parse(
          execution.stdout,
        );
    } catch {
      fail('filesystem_sandbox_result_invalid');
    }

    if (
      !envelope
      || typeof envelope !== 'object'
      || Array.isArray(envelope)
      || Object.keys(envelope)
        .some(
          (key) =>
            ![
              'ok',
              'result',
              'error',
            ].includes(key),
        )
    ) {
      fail('filesystem_sandbox_result_invalid');
    }

    if (
      envelope.ok !== true
    ) {
      if (
        typeof envelope.error
          === 'string'
        && /^[a-z][a-z0-9_-]{0,127}$/
          .test(envelope.error)
      ) {
        fail(envelope.error);
      }

      fail('filesystem_sandbox_failed');
    }

    if (
      execution.exitCode !== 0
      || !envelope.result
      || typeof envelope.result
        !== 'object'
    ) {
      fail('filesystem_sandbox_result_invalid');
    }

    return Object.freeze({
      ...envelope.result,
      sandbox:
        execution.sandbox
        ?? 'unknown',
      network:
        execution.network
        ?? 'isolated',
    });
  }
}
