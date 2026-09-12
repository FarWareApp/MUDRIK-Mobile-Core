import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

function minimalEnvironment(extra = {}) {
  const keys = [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'LANG',
    'LC_ALL',
    'TMPDIR',
    'XDG_CONFIG_HOME',
    'XDG_CACHE_HOME',
    'XDG_DATA_HOME',
  ];

  const env = {};

  for (const key of keys) {
    if (typeof process.env[key] === 'string') {
      env[key] = process.env[key];
    }
  }

  return {
    ...env,
    ...extra,
  };
}

function appendCapped(current, chunk, maxBytes) {
  const next = Buffer.concat([current, Buffer.from(chunk)]);

  if (next.byteLength <= maxBytes) {
    return {
      value: next,
      truncated: false,
    };
  }

  return {
    value: next.subarray(0, maxBytes),
    truncated: true,
  };
}

export function runTerminalCommand({
  executable,
  args = [],
  cwd,
  env = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  signal,
}) {
  if (typeof executable !== 'string' || executable.trim().length === 0) {
    throw new Error('Executable is required.');
  }

  if (!Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) {
    throw new Error('Terminal args must be an array of strings.');
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3_600_000) {
    throw new Error('Invalid terminal timeout.');
  }

  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1024) {
    throw new Error('Invalid output limit.');
  }

  return new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let aborted = false;
    let settled = false;
    let forceKillTimer = null;

    const child = spawn(executable, args, {
      cwd,
      env: minimalEnvironment(env),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
      }

      signal?.removeEventListener('abort', onAbort);
      callback();
    };

    const terminate = () => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill('SIGTERM');

      if (!forceKillTimer) {
        forceKillTimer = setTimeout(() => {
          if (child.exitCode === null) {
            child.kill('SIGKILL');
          }
        }, 1500);

        forceKillTimer.unref();
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);

    const onAbort = () => {
      aborted = true;
      terminate();
    };

    if (signal?.aborted) {
      aborted = true;
      terminate();
    } else {
      signal?.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout.on('data', (chunk) => {
      if (stdoutTruncated) {
        return;
      }

      const result = appendCapped(stdout, chunk, maxOutputBytes);
      stdout = result.value;
      stdoutTruncated = result.truncated;
    });

    child.stderr.on('data', (chunk) => {
      if (stderrTruncated) {
        return;
      }

      const result = appendCapped(stderr, chunk, maxOutputBytes);
      stderr = result.value;
      stderrTruncated = result.truncated;
    });

    child.on('error', (error) => {
      finish(() => reject(error));
    });

    child.on('close', (code, closeSignal) => {
      finish(() => resolve({
        executable,
        args,
        cwd: cwd ?? process.cwd(),
        exitCode: code,
        signal: closeSignal,
        timedOut,
        aborted,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        stdoutTruncated,
        stderrTruncated,
      }));
    });
  });
}
