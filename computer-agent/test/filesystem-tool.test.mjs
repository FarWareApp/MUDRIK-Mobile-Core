import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  parseFilesystemToolInput,
} from '../src/filesystem-contract.mjs';

import {
  pathInsideRoot,
  resolveSandboxPath,
} from '../src/path-sandbox.mjs';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  FilesystemToolError,
  runFilesystemOperation,
} from '../src/tools/filesystem.mjs';

import {
  SandboxedFilesystemAdapter,
} from '../src/tools/filesystem-sandbox.mjs';

import {
  LinuxBubblewrapSandbox,
} from '../src/linux-bubblewrap-sandbox.mjs';

function futureIso() {
  return new Date(
    Date.now() + 600_000,
  ).toISOString();
}

function grant(
  root,
  capability,
  mode = 'persistent',
) {
  return {
    grantId:
      'grant-filesystem-test',
    deviceId: 'device-test',
    capability,
    mode,
    scope: {
      filesystemRoots: [root],
    },
    createdAt:
      new Date(
        Date.now() - 1000,
      ).toISOString(),
    expiresAt: futureIso(),
  };
}

function taskFor(
  capability,
  input,
  {
    risk = 'low',
    approval = {
      mode: 'automatic',
    },
  } = {},
) {
  return {
    taskId:
      'filesystem-task-test',
    deviceId: 'device-test',
    intent:
      'Exercise filesystem adapter',
    risk,
    requestedCapabilities: [
      capability,
    ],
    approval,
    expiresAt: futureIso(),
    steps: [{
      stepId:
        'cstep_filesystem_test',
      tool: 'filesystem',
      summary:
        'Filesystem operation',
      requiredCapabilities: [
        capability,
      ],
      input,
      continueOnError: false,
    }],
  };
}

async function fixture() {
  const parent =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-fs-tool-',
      ),
    );
  const root =
    path.join(parent, 'root');
  const outside =
    path.join(parent, 'outside');

  await fs.mkdir(root);
  await fs.mkdir(outside);

  return {
    parent,
    root,
    outside,
  };
}

test(
  'filesystem contract is exact and capability-specific',
  () => {
    assert.ok(
      parseFilesystemToolInput({
        operation: 'read',
        path: '/tmp/example',
      }),
    );

    assert.equal(
      parseFilesystemToolInput({
        operation: 'read',
        path: 'relative.txt',
      }),
      null,
    );

    assert.equal(
      parseFilesystemToolInput({
        operation: 'delete',
        path: '/tmp/example',
        recursive: true,
      }),
      null,
    );

    assert.equal(
      parseFilesystemToolInput({
        operation: 'write',
        path: '/tmp/example',
      }),
      null,
    );
  },
);

test(
  'sandbox path rejects sibling prefixes symlink roots and symlink escapes',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.parent,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const inside =
      path.join(
        f.root,
        'inside.txt',
      );
    const outsideFile =
      path.join(
        f.outside,
        'outside.txt',
      );

    await fs.writeFile(
      inside,
      'inside',
    );
    await fs.writeFile(
      outsideFile,
      'outside',
    );

    assert.equal(
      pathInsideRoot(
        inside,
        f.root,
      ),
      true,
    );
    assert.equal(
      pathInsideRoot(
        f.root + '-evil/file',
        f.root,
      ),
      false,
    );

    const symlinkFile =
      path.join(
        f.root,
        'link.txt',
      );
    await fs.symlink(
      outsideFile,
      symlinkFile,
    );

    assert.equal(
      await resolveSandboxPath(
        symlinkFile,
        [f.root],
      ),
      null,
    );

    const symlinkDir =
      path.join(
        f.root,
        'link-dir',
      );
    await fs.symlink(
      f.outside,
      symlinkDir,
    );

    assert.equal(
      await resolveSandboxPath(
        path.join(
          symlinkDir,
          'outside.txt',
        ),
        [f.root],
      ),
      null,
    );

    const rootLink =
      path.join(
        f.parent,
        'root-link',
      );
    await fs.symlink(
      f.root,
      rootLink,
    );

    assert.equal(
      await resolveSandboxPath(
        path.join(
          rootLink,
          'inside.txt',
        ),
        [rootLink],
      ),
      null,
    );
  },
);

test(
  'filesystem read and list stay inside canonical grant roots',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.parent,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const file =
      path.join(
        f.root,
        'alpha.txt',
      );
    await fs.writeFile(
      file,
      'alpha',
    );

    const read =
      await runFilesystemOperation(
        {
          operation: 'read',
          path: file,
          encoding: 'utf8',
          maxBytes: 100,
        },
        {
          allowedRoots: [f.root],
        },
      );

    assert.equal(read.content, 'alpha');
    assert.equal(read.bytes, 5);

    const listed =
      await runFilesystemOperation(
        {
          operation: 'list',
          path: f.root,
          maxEntries: 10,
        },
        {
          allowedRoots: [f.root],
        },
      );

    assert.deepEqual(
      listed.entries.map(
        (entry) => entry.name,
      ),
      ['alpha.txt'],
    );

    await assert.rejects(
      () =>
        runFilesystemOperation(
          {
            operation: 'read',
            path:
              path.join(
                f.outside,
                'missing.txt',
              ),
            encoding: 'utf8',
            maxBytes: 100,
          },
          {
            allowedRoots: [f.root],
          },
        ),
      (error) =>
        error
          instanceof FilesystemToolError
        && error.code
          === 'filesystem_scope_denied',
    );
  },
);

test(
  'filesystem writes are bounded atomic and cannot traverse a symlink parent',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.parent,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const target =
      path.join(
        f.root,
        'created.txt',
      );

    const result =
      await runFilesystemOperation(
        {
          operation: 'write',
          path: target,
          encoding: 'utf8',
          content: 'created',
        },
        {
          allowedRoots: [f.root],
        },
      );

    assert.equal(result.exitCode, 0);
    assert.equal(
      await fs.readFile(
        target,
        'utf8',
      ),
      'created',
    );

    const parentLink =
      path.join(
        f.root,
        'escape',
      );
    await fs.symlink(
      f.outside,
      parentLink,
    );

    await assert.rejects(
      () =>
        runFilesystemOperation(
          {
            operation: 'write',
            path:
              path.join(
                parentLink,
                'escaped.txt',
              ),
            encoding: 'utf8',
            content: 'no',
          },
          {
            allowedRoots: [f.root],
          },
        ),
      (error) =>
        error.code
          === 'filesystem_scope_denied',
    );

    await assert.rejects(
      () =>
        fs.access(
          path.join(
            f.outside,
            'escaped.txt',
          ),
        ),
    );
  },
);

test(
  'filesystem delete refuses grant root symlinks and non-empty recursive deletion',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.parent,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await assert.rejects(
      () =>
        runFilesystemOperation(
          {
            operation: 'delete',
            path: f.root,
          },
          {
            allowedRoots: [f.root],
          },
        ),
      (error) =>
        error.code
          === 'filesystem_root_delete_denied',
    );

    const directory =
      path.join(
        f.root,
        'directory',
      );
    await fs.mkdir(directory);
    await fs.writeFile(
      path.join(
        directory,
        'child.txt',
      ),
      'child',
    );

    await assert.rejects(
      () =>
        runFilesystemOperation(
          {
            operation: 'delete',
            path: directory,
          },
          {
            allowedRoots: [f.root],
          },
        ),
      (error) =>
        error.code
          === 'filesystem_directory_not_empty',
    );

    const link =
      path.join(
        f.root,
        'outside-link',
      );
    await fs.symlink(
      f.outside,
      link,
    );

    await assert.rejects(
      () =>
        runFilesystemOperation(
          {
            operation: 'delete',
            path: link,
          },
          {
            allowedRoots: [f.root],
          },
        ),
      (error) =>
        error.code
          === 'filesystem_scope_denied',
    );

    assert.ok(
      await fs.stat(f.outside),
    );
  },
);

test(
  'task runner enforces filesystem capability separation and risk floors',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.parent,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const file =
      path.join(
        f.root,
        'runner.txt',
      );
    await fs.writeFile(
      file,
      'runner',
    );

    const readRunner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            'filesystem.read',
          ),
        ],
      });

    const read =
      await readRunner.run(
        taskFor(
          'filesystem.read',
          {
            operation: 'read',
            path: file,
          },
        ),
      );

    assert.equal(
      read.status,
      'succeeded',
    );
    assert.equal(
      read.steps[0]
        .result.content,
      'runner',
    );

    const writeRunner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            'filesystem.read',
          ),
        ],
      });

    const write =
      await writeRunner.run(
        taskFor(
          'filesystem.write',
          {
            operation: 'write',
            path: file,
            content: 'changed',
          },
        ),
      );

    assert.equal(
      write.status,
      'blocked',
    );
    assert.equal(
      write.policy.reason,
      'approval-required',
    );

    const deleteRunner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            'filesystem.delete',
            'session',
          ),
        ],
      });

    const deletion =
      await deleteRunner.run(
        taskFor(
          'filesystem.delete',
          {
            operation: 'delete',
            path: file,
          },
          {
            risk: 'low',
          },
        ),
      );

    assert.equal(
      deletion.status,
      'blocked',
    );
    assert.equal(
      deletion.policy.reason,
      'high-risk-approval-required',
    );
    assert.equal(
      await fs.readFile(
        file,
        'utf8',
      ),
      'runner',
    );
  },
);

test(
  'Bubblewrap filesystem mutation cannot escape during directory-to-symlink race',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const parent =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'mudrik-fs-race-',
        ),
      );
    const root =
      path.join(parent, 'root');
    const outside =
      path.join(parent, 'outside');
    const swap =
      path.join(root, 'swap');
    const outsideTarget =
      path.join(
        outside,
        'target.txt',
      );

    await fs.mkdir(root);
    await fs.mkdir(outside);
    await fs.writeFile(
      outsideTarget,
      'sentinel',
    );

    t.after(
      () => fs.rm(
        parent,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const adapter =
      new SandboxedFilesystemAdapter({
        sandbox,
      });

    let stop = false;

    const toggle =
      (async () => {
        while (!stop) {
          await fs.rm(
            swap,
            {
              recursive: true,
              force: true,
            },
          ).catch(() => {});

          await fs.mkdir(swap)
            .catch(() => {});

          await new Promise(
            (resolve) =>
              setImmediate(resolve),
          );

          await fs.rm(
            swap,
            {
              recursive: true,
              force: true,
            },
          ).catch(() => {});

          await fs.symlink(
            outside,
            swap,
          ).catch(() => {});

          await new Promise(
            (resolve) =>
              setImmediate(resolve),
          );
        }
      })();

    try {
      for (
        let index = 0;
        index < 16;
        index += 1
      ) {
        await adapter.run(
          {
            operation: 'write',
            path:
              path.join(
                swap,
                'target.txt',
              ),
            encoding: 'utf8',
            content:
              'inside-'
              + String(index),
          },
          {
            allowedRoots: [root],
          },
        ).catch(() => {});
      }
    } finally {
      stop = true;
      await toggle;
    }

    assert.equal(
      await fs.readFile(
        outsideTarget,
        'utf8',
      ),
      'sentinel',
    );
  },
);
