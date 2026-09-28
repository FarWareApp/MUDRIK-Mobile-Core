import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  LinuxBubblewrapSandbox,
} from '../src/linux-bubblewrap-sandbox.mjs';

async function fixture(t) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-bwrap-',
      ),
    );

  t.after(
    () => fs.rm(
      root,
      {
        recursive: true,
        force: true,
      },
    ),
  );

  return root;
}

function input(
  cwd,
  overrides = {},
) {
  return {
    executable:
      process.execPath,
    args: [
      '-e',
      'console.log("ok")',
    ],
    cwd,
    env: {},
    timeoutMs: 5_000,
    maxOutputBytes: 64 * 1024,
    ...overrides,
  };
}

test(
  'bubblewrap backend is fail closed when unavailable',
  async () => {
    const sandbox =
      new LinuxBubblewrapSandbox({
        bwrapPath:
          '/definitely/missing/bwrap',
      });

    await assert.rejects(
      () => sandbox.run(
        input('/tmp'),
        {
          allowedRoots: ['/tmp'],
        },
      ),
      /sandbox_unavailable/,
    );
  },
);

test(
  'bubblewrap writes only inside the granted writable root',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const root = await fixture(t);
    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const output =
      path.join(
        root,
        'inside.txt',
      );
    const result =
      await sandbox.run(
        input(
          root,
          {
            args: [
              '-e',
              'require("fs").writeFileSync(process.argv[1],"inside")',
              output,
            ],
          },
        ),
        {
          allowedRoots: [root],
        },
      );

    assert.equal(result.exitCode, 0);
    assert.equal(
      await fs.readFile(
        output,
        'utf8',
      ),
      'inside',
    );
    assert.equal(
      result.sandbox,
      'linux-bubblewrap',
    );
    assert.equal(
      result.network,
      'isolated',
    );
  },
);

test(
  'bubblewrap host system and home are not writable task roots',
  {
    skip:
      process.platform !== 'linux',
  },
  async () => {
    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      return;
    }

    await assert.rejects(
      () => sandbox.run(
        input('/etc'),
        {
          allowedRoots: ['/etc'],
        },
      ),
      /sandbox_root_denied/,
    );

    if (
      typeof process.env.HOME
        === 'string'
    ) {
      await assert.rejects(
        () => sandbox.run(
          input(process.env.HOME),
          {
            allowedRoots: [
              process.env.HOME,
            ],
          },
        ),
        /sandbox_root_denied/,
      );
    }
  },
);

test(
  'bubblewrap rejects symlink cwd and noncanonical executable',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const root = await fixture(t);
    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const linked =
      path.join(root, 'linked');

    await fs.symlink(
      root,
      linked,
    );

    await assert.rejects(
      () => sandbox.run(
        input(linked),
        {
          allowedRoots: [root],
        },
      ),
      /sandbox_cwd_denied/,
    );

    const executableLink =
      path.join(
        root,
        'node-link',
      );

    await fs.symlink(
      process.execPath,
      executableLink,
    );

    await assert.rejects(
      () => sandbox.run(
        input(
          root,
          {
            executable:
              executableLink,
          },
        ),
        {
          allowedRoots: [root],
        },
      ),
      /sandbox_executable_denied/,
    );
  },
);

test(
  'bubblewrap clears host environment and isolates outbound network namespace',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const root = await fixture(t);
    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    process.env.MUDRIK_HOST_SECRET =
      'must-not-leak';

    t.after(() => {
      delete process.env
        .MUDRIK_HOST_SECRET;
    });

    const envResult =
      await sandbox.run(
        input(
          root,
          {
            args: [
              '-e',
              'process.stdout.write(String(process.env.MUDRIK_HOST_SECRET || ""))',
            ],
            env: {
              MUDRIK_SAFE_VALUE:
                'visible',
            },
          },
        ),
        {
          allowedRoots: [root],
        },
      );

    assert.equal(
      envResult.stdout,
      '',
    );

    const visibilityResult =
      await sandbox.run(
        input(
          root,
          {
            args: [
              '-e',
              [
                'const fs=require("fs");',
                'let etc="visible";',
                'try{fs.readFileSync("/etc/passwd");}catch{etc="denied";}',
                'process.stdout.write(etc+":"+process.env.HOME);',
              ].join(''),
            ],
          },
        ),
        {
          allowedRoots: [root],
        },
      );

    assert.equal(
      visibilityResult.stdout,
      'denied:/tmp/mudrik-home',
    );

    const networkResult =
      await sandbox.run(
        input(
          root,
          {
            args: [
              '-e',
              'const n=require("net").connect({host:"1.1.1.1",port:80});n.setTimeout(700);n.on("connect",()=>process.exit(9));n.on("error",()=>process.exit(0));n.on("timeout",()=>process.exit(0));',
            ],
            timeoutMs: 2_000,
          },
        ),
        {
          allowedRoots: [root],
        },
      );

    assert.equal(
      networkResult.exitCode,
      0,
    );
  },
);


test(
  'bubblewrap cannot reach a host loopback listener',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const root = await fixture(t);
    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const server =
      net.createServer(
        (socket) => {
          socket.end('host');
        },
      );

    await new Promise(
      (resolve, reject) => {
        server.once('error', reject);
        server.listen(
          0,
          '127.0.0.1',
          resolve,
        );
      },
    );

    t.after(
      () =>
        new Promise((resolve) => {
          server.close(resolve);
        }),
    );

    const address =
      server.address();

    assert.ok(
      address
      && typeof address === 'object',
    );

    const result =
      await sandbox.run(
        input(
          root,
          {
            args: [
              '-e',
              [
                'const net=require("net");',
                'const s=net.connect({host:"127.0.0.1",port:',
                String(address.port),
                '});',
                's.setTimeout(700);',
                's.on("connect",()=>process.exit(9));',
                's.on("error",()=>process.exit(0));',
                's.on("timeout",()=>process.exit(0));',
              ].join(''),
            ],
            timeoutMs: 2_000,
          },
        ),
        {
          allowedRoots: [root],
        },
      );

    assert.equal(
      result.exitCode,
      0,
    );
  },
);
