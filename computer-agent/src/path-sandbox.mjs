import fs from 'node:fs/promises';
import path from 'node:path';

function isInside(
  candidate,
  root,
) {
  const relative =
    path.relative(
      root,
      candidate,
    );

  return (
    relative === ''
    || (
      !relative.startsWith('..')
      && !path.isAbsolute(relative)
    )
  );
}

function absolutePath(value) {
  return (
    typeof value === 'string'
    && value.length > 0
    && value.length <= 4096
    && !value.includes('\0')
    && path.isAbsolute(value)
  );
}

async function assertNoSymlinkPath(
  root,
  candidate,
  {
    allowMissingFinal = false,
  } = {},
) {
  const relative =
    path.relative(
      root,
      candidate,
    );

  if (
    relative.startsWith('..')
    || path.isAbsolute(relative)
  ) {
    return false;
  }

  const segments =
    relative === ''
      ? []
      : relative.split(
          path.sep,
        );

  let current = root;

  for (
    let index = 0;
    index < segments.length;
    index += 1
  ) {
    current =
      path.join(
        current,
        segments[index],
      );

    try {
      const info =
        await fs.lstat(current);

      if (info.isSymbolicLink()) {
        return false;
      }
    } catch (error) {
      if (
        error?.code === 'ENOENT'
        && allowMissingFinal
        && index
          === segments.length - 1
      ) {
        return true;
      }

      return false;
    }
  }

  return true;
}

async function canonicalRoot(
  rootInput,
) {
  if (!absolutePath(rootInput)) {
    return null;
  }

  const resolved =
    path.resolve(rootInput);

  let info;

  try {
    info = await fs.lstat(resolved);
  } catch {
    return null;
  }

  if (
    !info.isDirectory()
    || info.isSymbolicLink()
  ) {
    return null;
  }

  let real;

  try {
    real = await fs.realpath(resolved);
  } catch {
    return null;
  }

  if (
    real !== resolved
    || !await assertNoSymlinkPath(
      path.parse(resolved).root,
      resolved,
    )
  ) {
    return null;
  }

  return real;
}

export async function canonicalizeRoots(
  roots,
) {
  if (
    !Array.isArray(roots)
    || roots.length === 0
    || roots.length > 64
  ) {
    return null;
  }

  const canonical = [];

  for (const root of roots) {
    const value =
      await canonicalRoot(root);

    if (!value) {
      return null;
    }

    if (!canonical.includes(value)) {
      canonical.push(value);
    }
  }

  return Object.freeze(canonical);
}

function lexicalRootFor(
  candidate,
  roots,
) {
  return roots
    .filter(
      (root) =>
        isInside(
          candidate,
          root,
        ),
    )
    .sort(
      (a, b) =>
        b.length - a.length,
    )[0]
    ?? null;
}

export async function resolveSandboxPath(
  candidateInput,
  rootsInput,
  {
    mustExist = true,
    allowDirectory = true,
    allowFile = true,
    allowMissingFinal = false,
  } = {},
) {
  if (!absolutePath(candidateInput)) {
    return null;
  }

  const roots =
    await canonicalizeRoots(
      rootsInput,
    );

  if (!roots) {
    return null;
  }

  const candidate =
    path.resolve(candidateInput);
  const root =
    lexicalRootFor(
      candidate,
      roots,
    );

  if (!root) {
    return null;
  }

  const noLinks =
    await assertNoSymlinkPath(
      root,
      candidate,
      {
        allowMissingFinal,
      },
    );

  if (!noLinks) {
    return null;
  }

  let info;

  try {
    info = await fs.lstat(candidate);
  } catch (error) {
    if (
      error?.code === 'ENOENT'
      && !mustExist
      && allowMissingFinal
    ) {
      const parent =
        path.dirname(candidate);

      if (
        parent === candidate
        || !isInside(
          parent,
          root,
        )
        || !await assertNoSymlinkPath(
          root,
          parent,
        )
      ) {
        return null;
      }

      const parentInfo =
        await fs.lstat(parent)
          .catch(() => null);

      if (
        !parentInfo
        || !parentInfo.isDirectory()
        || parentInfo.isSymbolicLink()
      ) {
        return null;
      }

      return Object.freeze({
        root,
        path: candidate,
        exists: false,
        type: 'missing',
      });
    }

    return null;
  }

  if (info.isSymbolicLink()) {
    return null;
  }

  let real;

  try {
    real = await fs.realpath(candidate);
  } catch {
    return null;
  }

  if (
    !isInside(real, root)
    || real !== candidate
  ) {
    return null;
  }

  const isDirectory =
    info.isDirectory();
  const isFile =
    info.isFile();

  if (
    (!allowDirectory && isDirectory)
    || (!allowFile && isFile)
    || (!isDirectory && !isFile)
  ) {
    return null;
  }

  return Object.freeze({
    root,
    path: candidate,
    exists: true,
    type:
      isDirectory
        ? 'directory'
        : 'file',
  });
}

export function pathInsideRoot(
  candidate,
  root,
) {
  if (
    !absolutePath(candidate)
    || !absolutePath(root)
  ) {
    return false;
  }

  return isInside(
    path.resolve(candidate),
    path.resolve(root),
  );
}
