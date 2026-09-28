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

function executableFile(value) {
  return (
    typeof value === 'string'
    && path.isAbsolute(value)
    && value.length <= 4096
    && !value.includes('\0')
  );
}

function isDeniedWritableRoot(root) {
  if (
    SYSTEM_PREFIXES.some(
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

  if (real !== executable) {
    return null;
  }

  return real;
}

function systemPath(
  candidate,
) {
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

  async run(
    input,
    {
      allowedRoots = [],
      signal,
    } = {},
  ) {
    if (!await this.available()) {
      throw new Error(
        'sandbox_unavailable',
      );
    }

    const roots =
      await canonicalizeRoots(
        allowedRoots,
      );

    if (
      !roots
      || roots.some(
        isDeniedWritableRoot,
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

    for (const root of roots) {
      args.push(
        '--dir',
        root,
        '--bind',
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

    const result =
      await runTerminalCommand({
        executable:
          this.bwrapPath,
        args,
        cwd: '/',
        env: {},
        timeoutMs:
          input.timeoutMs,
        maxOutputBytes:
          input.maxOutputBytes,
        signal,
      });

    return Object.freeze({
      executable,
      args: input.args,
      cwd: input.cwd,
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
}

export function createDefaultTerminalSandbox() {
  return new LinuxBubblewrapSandbox();
}
