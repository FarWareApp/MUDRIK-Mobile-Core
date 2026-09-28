import {
  spawn,
} from 'node:child_process';
import fs from 'node:fs/promises';
import {
  constants as fsConstants,
} from 'node:fs';
import path from 'node:path';

import {
  canonicalizeRoots,
  pathInsideRoot,
} from './path-sandbox.mjs';

import {
  runTerminalCommand,
} from './tools/terminal.mjs';

const DEFAULT_BWRAP =
  '/usr/bin/bwrap';

const SYSTEM_PREFIXES =
  Object.freeze([
    '/',
    '/boot',
    '/dev',
    '/etc',
    '/proc',
    '/root',
    '/run',
    '/sbin',
    '/sys',
    '/usr',
    '/var',
  ]);

const DENIED_EXACT_TASK_ROOTS =
  new Set([
    '/tmp',
  ]);

function executableFile(value) {
  return (
    typeof value === 'string'
    && path.isAbsolute(value)
    && value.length <= 4096
    && !value.includes('\0')
  );
}

function validInput(input) {
  return (
    input
    && typeof input === 'object'
    && executableFile(
      input.executable,
    )
    && typeof input.cwd === 'string'
    && path.isAbsolute(input.cwd)
    && Array.isArray(input.args)
    && input.args.every(
      (arg) =>
        typeof arg === 'string',
    )
    && (
      input.stdin === undefined
      || input.stdin === null
      || (
        typeof input.stdin === 'string'
        && Buffer.byteLength(
          input.stdin,
          'utf8',
        ) <= 1024 * 1024
      )
    )
    && (
      input.env === undefined
      || (
        typeof input.env === 'object'
        && input.env !== null
        && !Array.isArray(input.env)
        && Object.entries(input.env)
          .every(
            ([key, value]) =>
              typeof key === 'string'
              && typeof value === 'string'
              && !key.includes('\0')
              && !value.includes('\0'),
          )
      )
    )
  );
}

function isDeniedTaskRoot(root) {
  if (
    DENIED_EXACT_TASK_ROOTS.has(root)
    || SYSTEM_PREFIXES.some(
      (prefix) =>
        root === prefix
        || (
          prefix !== '/'
          && pathInsideRoot(
            root,
            prefix,
          )
        ),
    )
  ) {
    return true;
  }

  const home =
    process.env.HOME;

  if (
    typeof home === 'string'
    && path.isAbsolute(home)
    && (
      root === home
      || pathInsideRoot(
        home,
        root,
      )
    )
  ) {
    return true;
  }

  return false;
}

async function canonicalExecutable(
  executable,
) {
  if (!executableFile(executable)) {
    return null;
  }

  let info;

  try {
    info =
      await fs.lstat(executable);
  } catch {
    return null;
  }

  if (
    !info.isFile()
    || info.isSymbolicLink()
    || (info.mode & 0o111) === 0
  ) {
    return null;
  }

  let real;

  try {
    real =
      await fs.realpath(executable);
  } catch {
    return null;
  }

  return real === executable
    ? real
    : null;
}

async function canonicalizeOptionalRoots(
  roots,
) {
  if (
    !Array.isArray(roots)
    || roots.length > 64
  ) {
    return null;
  }

  if (roots.length === 0) {
    return Object.freeze([]);
  }

  return canonicalizeRoots(roots);
}

function systemPath(candidate) {
  return (
    candidate === '/usr'
    || pathInsideRoot(
      candidate,
      '/usr',
    )
  );
}

function bubblewrapBaseArgs() {
  return [
    '--die-with-parent',
    '--new-session',
    '--unshare-net',
    '--unshare-pid',
    '--unshare-ipc',
    '--unshare-uts',
    '--cap-drop',
    'ALL',
    '--ro-bind',
    '/usr',
    '/usr',
    '--symlink',
    'usr/bin',
    '/bin',
    '--symlink',
    'usr/lib',
    '/lib',
    '--symlink',
    'usr/lib64',
    '/lib64',
    '--symlink',
    'usr/sbin',
    '/sbin',
    '--dev',
    '/dev',
    '--proc',
    '/proc',
    '--tmpfs',
    '/tmp',
  ];
}

function hostEnvironment() {
  return {
    PATH:
      process.env.PATH
      ?? '/usr/bin:/bin',
    LANG:
      process.env.LANG
      ?? 'C.UTF-8',
  };
}

export class LinuxBubblewrapSandbox {
  constructor({
    bwrapPath =
      DEFAULT_BWRAP,
  } = {}) {
    this.bwrapPath =
      bwrapPath;
  }

  async available() {
    if (
      process.platform !== 'linux'
      || !executableFile(
        this.bwrapPath,
      )
    ) {
      return false;
    }

    try {
      await fs.access(
        this.bwrapPath,
        fsConstants.X_OK,
      );
      return true;
    } catch {
      return false;
    }
  }

  async prepare(
    input,
    {
      allowedRoots = [],
      readOnlyRoots = [],
    } = {},
  ) {
    if (
      !validInput(input)
      || !await this.available()
    ) {
      throw new Error(
        !validInput(input)
          ? 'sandbox_invalid_input'
          : 'sandbox_unavailable',
      );
    }

    const writableRoots =
      await canonicalizeOptionalRoots(
        allowedRoots,
      );
    const canonicalReadOnlyRoots =
      await canonicalizeOptionalRoots(
        readOnlyRoots,
      );

    if (
      !writableRoots
      || !canonicalReadOnlyRoots
    ) {
      throw new Error(
        'sandbox_root_denied',
      );
    }

    const roots =
      [...new Set([
        ...writableRoots,
        ...canonicalReadOnlyRoots,
      ])];

    if (
      roots.length === 0
      || roots.some(
        isDeniedTaskRoot,
      )
    ) {
      throw new Error(
        'sandbox_root_denied',
      );
    }

    let canonicalCwd;

    try {
      canonicalCwd =
        await fs.realpath(
          input.cwd,
        );
    } catch {
      canonicalCwd = null;
    }

    if (
      !canonicalCwd
      || canonicalCwd !== input.cwd
      || !roots.some(
        (root) =>
          pathInsideRoot(
            canonicalCwd,
            root,
          ),
      )
    ) {
      throw new Error(
        'sandbox_cwd_denied',
      );
    }

    const executable =
      await canonicalExecutable(
        input.executable,
      );

    if (!executable) {
      throw new Error(
        'sandbox_executable_denied',
      );
    }

    const args =
      bubblewrapBaseArgs();

    for (const root of writableRoots) {
      args.push(
        '--dir',
        root,
        '--bind',
        root,
        root,
      );
    }

    for (
      const root of
        canonicalReadOnlyRoots
    ) {
      args.push(
        '--dir',
        root,
        '--ro-bind',
        root,
        root,
      );
    }

    if (
      !systemPath(executable)
      && !roots.some(
        (root) =>
          pathInsideRoot(
            executable,
            root,
          ),
      )
    ) {
      args.push(
        '--dir',
        path.dirname(executable),
        '--ro-bind',
        executable,
        executable,
      );
    }

    args.push(
      '--dir',
      '/tmp/mudrik-home',
      '--chdir',
      input.cwd,
      '--clearenv',
      '--setenv',
      'HOME',
      '/tmp/mudrik-home',
      '--setenv',
      'PATH',
      '/usr/bin:/bin',
    );

    for (
      const [
        key,
        value,
      ] of Object.entries(
        input.env ?? {},
      )
    ) {
      args.push(
        '--setenv',
        key,
        value,
      );
    }

    args.push(
      executable,
      ...input.args,
    );

    return Object.freeze({
      executable:
        this.bwrapPath,
      args: Object.freeze(args),
      cwd: '/',
      env:
        Object.freeze(
          hostEnvironment(),
        ),
      innerExecutable:
        executable,
      innerArgs:
        Object.freeze([
          ...input.args,
        ]),
      innerCwd:
        input.cwd,
      stdin:
        input.stdin ?? null,
    });
  }

  async run(
    input,
    {
      allowedRoots = [],
      readOnlyRoots = [],
      signal,
    } = {},
  ) {
    const invocation =
      await this.prepare(
        input,
        {
          allowedRoots,
          readOnlyRoots,
        },
      );

    const result =
      await runTerminalCommand({
        executable:
          invocation.executable,
        args: invocation.args,
        cwd: invocation.cwd,
        env: invocation.env,
        timeoutMs:
          input.timeoutMs,
        maxOutputBytes:
          input.maxOutputBytes,
        stdin:
          invocation.stdin,
        signal,
      });

    return Object.freeze({
      executable:
        invocation.innerExecutable,
      args:
        invocation.innerArgs,
      cwd:
        invocation.innerCwd,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut:
        result.timedOut,
      aborted:
        result.aborted,
      stdout: result.stdout,
      stderr: result.stderr,
      stdoutTruncated:
        result.stdoutTruncated,
      stderrTruncated:
        result.stderrTruncated,
      sandbox: 'linux-bubblewrap',
      network: 'isolated',
    });
  }

  async spawnBackground(
    input,
    {
      allowedRoots = [],
      readOnlyRoots = [],
      signal,
    } = {},
  ) {
    if (
      !Number.isInteger(
        input.timeoutMs,
      )
      || input.timeoutMs < 1
      || input.timeoutMs > 3_600_000
    ) {
      throw new Error(
        'sandbox_invalid_timeout',
      );
    }

    const invocation =
      await this.prepare(
        input,
        {
          allowedRoots,
          readOnlyRoots,
        },
      );

    const child = spawn(
      invocation.executable,
      invocation.args,
      {
        cwd: invocation.cwd,
        env: invocation.env,
        shell: false,
        stdio: 'ignore',
        detached: true,
        windowsHide: true,
      },
    );

    let running = true;
    let exitCode = null;
    let closeSignal = null;
    let timedOut = false;
    let forceKillTimer = null;

    const killGroup = (sig) => {
      if (
        !running
        || !Number.isInteger(child.pid)
      ) {
        return false;
      }

      try {
        process.kill(
          -child.pid,
          sig,
        );
        return true;
      } catch {
        try {
          return child.kill(sig);
        } catch {
          return false;
        }
      }
    };

    const terminate = () => {
      if (!running) {
        return false;
      }

      killGroup('SIGTERM');

      if (!forceKillTimer) {
        forceKillTimer =
          setTimeout(() => {
            if (running) {
              killGroup('SIGKILL');
            }
          }, 1500);
        forceKillTimer.unref();
      }

      return true;
    };

    let spawnError = null;

    const completion =
      new Promise(
        (resolve) => {
          child.once(
            'error',
            (error) => {
              running = false;
              spawnError = error;
              clearTimeout(timer);

              if (forceKillTimer) {
                clearTimeout(
                  forceKillTimer,
                );
              }

              signal?.removeEventListener(
                'abort',
                onAbort,
              );

              resolve(
                Object.freeze({
                  exitCode: null,
                  signal: null,
                  timedOut,
                  spawnFailed: true,
                }),
              );
            },
          );

          child.once(
            'close',
            (code, sig) => {
              running = false;
              exitCode = code;
              closeSignal = sig;
              clearTimeout(timer);

              if (forceKillTimer) {
                clearTimeout(
                  forceKillTimer,
                );
              }

              signal?.removeEventListener(
                'abort',
                onAbort,
              );

              resolve(
                Object.freeze({
                  exitCode,
                  signal:
                    closeSignal,
                  timedOut,
                  spawnFailed: false,
                }),
              );
            },
          );
        },
      );

    const timer =
      setTimeout(() => {
        timedOut = true;
        terminate();
      }, input.timeoutMs);
    timer.unref();

    const onAbort = () => {
      terminate();
    };

    if (signal?.aborted) {
      terminate();
    } else {
      signal?.addEventListener(
        'abort',
        onAbort,
        { once: true },
      );
    }

    await new Promise(
      (resolve, reject) => {
        const onSpawn = () => {
          child.off(
            'error',
            onError,
          );
          resolve();
        };
        const onError = (error) => {
          child.off(
            'spawn',
            onSpawn,
          );
          reject(error);
        };

        child.once(
          'spawn',
          onSpawn,
        );
        child.once(
          'error',
          onError,
        );
      },
    ).catch((error) => {
      void completion;
      throw error;
    });

    if (spawnError) {
      throw spawnError;
    }

    return Object.freeze({
      running:
        () => running,
      snapshot:
        () =>
          Object.freeze({
            running,
            exitCode,
            signal:
              closeSignal,
            timedOut,
          }),
      terminate,
      wait:
        () => completion,
      sandbox:
        'linux-bubblewrap',
      network: 'isolated',
    });
  }
}

export function createDefaultTerminalSandbox() {
  return new LinuxBubblewrapSandbox();
}
