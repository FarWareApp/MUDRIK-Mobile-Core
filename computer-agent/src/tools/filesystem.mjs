import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {
  constants as fsConstants,
} from 'node:fs';
import path from 'node:path';

import {
  resolveSandboxPath,
} from '../path-sandbox.mjs';

export class FilesystemToolError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      'FilesystemToolError';
    this.code = code;
  }
}

function fail(code) {
  throw new FilesystemToolError(code);
}

async function resolveRequired(
  candidate,
  allowedRoots,
  options,
) {
  const resolved =
    await resolveSandboxPath(
      candidate,
      allowedRoots,
      options,
    );

  if (!resolved) {
    fail('filesystem_scope_denied');
  }

  return resolved;
}

async function readFileBounded(
  target,
  maxBytes,
) {
  let handle;

  try {
    handle = await fs.open(
      target,
      fsConstants.O_RDONLY
        | fsConstants.O_NOFOLLOW,
    );

    const info =
      await handle.stat();

    if (!info.isFile()) {
      fail('filesystem_not_file');
    }

    if (info.size > maxBytes) {
      fail('filesystem_read_limit');
    }

    const buffer =
      Buffer.alloc(
        maxBytes + 1,
      );
    const {
      bytesRead,
    } = await handle.read(
      buffer,
      0,
      buffer.length,
      0,
    );

    if (bytesRead > maxBytes) {
      fail('filesystem_read_limit');
    }

    return buffer.subarray(
      0,
      bytesRead,
    );
  } finally {
    await handle?.close()
      .catch(() => {});
  }
}

async function writeAtomic(
  target,
  data,
  existingMode = 0o600,
) {
  const directory =
    path.dirname(target);
  const temporary =
    path.join(
      directory,
      '.mudrik-write-'
        + process.pid
        + '-'
        + crypto
          .randomBytes(12)
          .toString('hex'),
    );

  let handle;

  try {
    handle = await fs.open(
      temporary,
      fsConstants.O_WRONLY
        | fsConstants.O_CREAT
        | fsConstants.O_EXCL
        | fsConstants.O_NOFOLLOW,
      existingMode,
    );

    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = null;

    const current =
      await fs.lstat(target)
        .catch(
          (error) =>
            error?.code === 'ENOENT'
              ? null
              : Promise.reject(error),
        );

    if (
      current?.isSymbolicLink()
      || current?.isDirectory()
    ) {
      fail('filesystem_target_changed');
    }

    await fs.rename(
      temporary,
      target,
    );
    await fs.chmod(
      target,
      existingMode,
    );

    const directoryHandle =
      await fs.open(
        directory,
        fsConstants.O_RDONLY
          | fsConstants.O_DIRECTORY,
      )
        .catch(() => null);

    if (directoryHandle) {
      await directoryHandle.sync()
        .catch(() => {});
      await directoryHandle.close()
        .catch(() => {});
    }
  } catch (error) {
    await handle?.close()
      .catch(() => {});
    await fs.unlink(temporary)
      .catch(() => {});

    if (
      error instanceof
        FilesystemToolError
    ) {
      throw error;
    }

    fail('filesystem_write_failed');
  }
}

function entryType(entry) {
  if (entry.isFile()) {
    return 'file';
  }

  if (entry.isDirectory()) {
    return 'directory';
  }

  if (entry.isSymbolicLink()) {
    return 'symlink';
  }

  return 'other';
}

export async function runFilesystemOperation(
  input,
  {
    allowedRoots = [],
  } = {},
) {
  if (
    !input
    || typeof input !== 'object'
  ) {
    fail('filesystem_invalid_input');
  }

  if (input.operation === 'stat') {
    const resolved =
      await resolveRequired(
        input.path,
        allowedRoots,
        {
          mustExist: true,
          allowDirectory: true,
          allowFile: true,
        },
      );

    const info =
      await fs.lstat(
        resolved.path,
      );

    return Object.freeze({
      exitCode: 0,
      operation: 'stat',
      path: resolved.path,
      type: resolved.type,
      size:
        info.isFile()
          ? info.size
          : null,
    });
  }

  if (input.operation === 'list') {
    const resolved =
      await resolveRequired(
        input.path,
        allowedRoots,
        {
          mustExist: true,
          allowDirectory: true,
          allowFile: false,
        },
      );

    const entries =
      await fs.readdir(
        resolved.path,
        {
          withFileTypes: true,
        },
      );

    const limited =
      entries
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
            ),
        )
        .slice(
          0,
          input.maxEntries,
        )
        .map(
          (entry) =>
            Object.freeze({
              name: entry.name,
              type:
                entryType(entry),
            }),
        );

    return Object.freeze({
      exitCode: 0,
      operation: 'list',
      path: resolved.path,
      entries:
        Object.freeze(limited),
      truncated:
        entries.length
          > input.maxEntries,
    });
  }

  if (input.operation === 'read') {
    const resolved =
      await resolveRequired(
        input.path,
        allowedRoots,
        {
          mustExist: true,
          allowDirectory: false,
          allowFile: true,
        },
      );

    const data =
      await readFileBounded(
        resolved.path,
        input.maxBytes,
      );

    return Object.freeze({
      exitCode: 0,
      operation: 'read',
      path: resolved.path,
      encoding: input.encoding,
      content:
        data.toString(
          input.encoding,
        ),
      bytes: data.byteLength,
    });
  }

  if (input.operation === 'write') {
    const resolved =
      await resolveRequired(
        input.path,
        allowedRoots,
        {
          mustExist: false,
          allowDirectory: false,
          allowFile: true,
          allowMissingFinal: true,
        },
      );

    let mode = 0o600;

    if (resolved.exists) {
      const info =
        await fs.lstat(
          resolved.path,
        );

      if (
        !info.isFile()
        || info.isSymbolicLink()
      ) {
        fail(
          'filesystem_target_changed',
        );
      }

      mode =
        info.mode & 0o777;
    }

    const data =
      Buffer.from(
        input.content,
        input.encoding,
      );

    if (
      data.byteLength
        > 256 * 1024
    ) {
      fail('filesystem_write_limit');
    }

    await writeAtomic(
      resolved.path,
      data,
      mode,
    );

    return Object.freeze({
      exitCode: 0,
      operation: 'write',
      path: resolved.path,
      bytes: data.byteLength,
    });
  }

  if (input.operation === 'mkdir') {
    const resolved =
      await resolveRequired(
        input.path,
        allowedRoots,
        {
          mustExist: false,
          allowDirectory: true,
          allowFile: false,
          allowMissingFinal: true,
        },
      );

    if (resolved.exists) {
      fail(
        'filesystem_target_exists',
      );
    }

    try {
      await fs.mkdir(
        resolved.path,
        {
          mode: 0o700,
        },
      );
    } catch {
      fail(
        'filesystem_mkdir_failed',
      );
    }

    return Object.freeze({
      exitCode: 0,
      operation: 'mkdir',
      path: resolved.path,
    });
  }

  if (input.operation === 'delete') {
    const resolved =
      await resolveRequired(
        input.path,
        allowedRoots,
        {
          mustExist: true,
          allowDirectory: true,
          allowFile: true,
        },
      );

    if (
      resolved.path === resolved.root
    ) {
      fail(
        'filesystem_root_delete_denied',
      );
    }

    const current =
      await fs.lstat(
        resolved.path,
      );

    if (current.isSymbolicLink()) {
      fail(
        'filesystem_target_changed',
      );
    }

    try {
      if (current.isDirectory()) {
        await fs.rmdir(
          resolved.path,
        );
      } else if (current.isFile()) {
        await fs.unlink(
          resolved.path,
        );
      } else {
        fail(
          'filesystem_type_denied',
        );
      }
    } catch (error) {
      if (
        error instanceof
          FilesystemToolError
      ) {
        throw error;
      }

      fail(
        current.isDirectory()
          ? 'filesystem_directory_not_empty'
          : 'filesystem_delete_failed',
      );
    }

    return Object.freeze({
      exitCode: 0,
      operation: 'delete',
      path: resolved.path,
      type: resolved.type,
    });
  }

  fail('filesystem_invalid_operation');
}
