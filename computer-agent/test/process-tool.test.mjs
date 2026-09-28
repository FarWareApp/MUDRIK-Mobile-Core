import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  LinuxBubblewrapSandbox,
} from '../src/linux-bubblewrap-sandbox.mjs';

import {
  normalizeProcessStep,
  parseProcessToolInput,
  processPolicyContext,
  processRiskFor,
} from '../src/process-contract.mjs';

import {
  OwnedProcessRuntime,
  ProcessToolError,
} from '../src/tools/process.mjs';

const REF =
  'proc_0123456789abcdef';

function futureIso() {
  return new Date(
    Date.now() + 600_000,
  ).toISOString();
}

function pastIso() {
  return new Date(
    Date.now() - 60_000,
  ).toISOString();
}

async function fixture(t) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-process-',
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

  const sandbox =
    new LinuxBubblewrapSandbox();

  if (!await sandbox.available()) {
    t.skip('bubblewrap unavailable');
    return null;
  }

  const runtime =
    new OwnedProcessRuntime({
      sandbox,
    });

  t.after(
    () => runtime.stopAll(),
  );

  return {
    root,
    sandbox,
    runtime,
  };
}

function startInput(root) {
  return {
    operation: 'start',
    processRef: REF,
    executable:
      process.execPath,
    args: [
      '-e',
      'setInterval(() => {}, 1000)',
    ],
    cwd: root,
    env: {},
    maxRuntimeMs: 10_000,
  };
}

function grant(
  root,
  capability,
  processRef = REF,
) {
  return {
    grantId:
      'grant-'
      + capability.replace('.', '-'),
    deviceId: 'device-test',
    capability,
    mode: 'session',
    scope: {
      processRefs: [processRef],
      ...(capability === 'process.start'
        ? {
            filesystemRoots: [root],
            executables: [
              process.execPath,
            ],
            backgroundAllowed: true,
            maxTaskDurationSeconds: 30,
          }
        : {}),
    },
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

test(
  'process contract rejects raw PID authority and enforces operation risk',
  () => {
    assert.equal(
      parseProcessToolInput({
        operation: 'stop',
        processRef: REF,
        pid: 1,
      }),
      null,
    );

    assert.equal(
      parseProcessToolInput({
        operation: 'inspect',
        processRef: 'proc_bad',
      }),
      null,
    );

    assert.equal(
      processRiskFor('inspect'),
      'low',
    );
    assert.equal(
      processRiskFor('start'),
      'medium',
    );
    assert.equal(
      processRiskFor('stop'),
      'high',
    );

    const step =
      normalizeProcessStep({
        tool: 'process',
        requiredCapabilities: [
          'process.start',
        ],
        input: startInput(
          '/tmp/safe-root',
        ),
      });

    assert.ok(step);

    const context =
      processPolicyContext(step);

    assert.equal(
      context['process.start']
        .processRef,
      REF,
    );
    assert.equal(
      context['process.start']
        .requiresBackground,
      true,
    );
  },
);

test(
  'owned process runtime starts inspects and stops only its opaque reference',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    const started =
      await f.runtime.start(
        startInput(f.root),
        {
          allowedRoots: [
            f.root,
          ],
        },
      );

    assert.equal(
      started.running,
      true,
    );
    assert.equal(
      Object.hasOwn(
        started,
        'pid',
      ),
      false,
    );

    const inspected =
      f.runtime.inspect({
        operation: 'inspect',
        processRef: REF,
      });

    assert.equal(
      inspected.running,
      true,
    );
    assert.equal(
      inspected.owned,
      true,
    );

    const stopped =
      await f.runtime.stop({
        operation: 'stop',
        processRef: REF,
      });

    assert.equal(
      stopped.running,
      false,
    );
    assert.equal(
      stopped.stopped,
      true,
    );

    const after =
      f.runtime.inspect({
        operation: 'inspect',
        processRef: REF,
      });

    assert.equal(
      after.running,
      false,
    );
  },
);

test(
  'owned process reference cannot be rebound after completion',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    await f.runtime.start(
      startInput(f.root),
      {
        allowedRoots: [
          f.root,
        ],
      },
    );
    await f.runtime.stop({
      operation: 'stop',
      processRef: REF,
    });

    await assert.rejects(
      () => f.runtime.start(
        startInput(f.root),
        {
          allowedRoots: [
            f.root,
          ],
        },
      ),
      (error) =>
        error instanceof
          ProcessToolError
        && error.code
          === 'process_ref_replay',
    );
  },
);

test(
  'unowned process references fail closed for inspect and stop',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    for (
      const operation of [
        'inspect',
        'stop',
      ]
    ) {
      const action = () =>
        f.runtime.run({
          operation,
          processRef:
            'proc_9999999999999999',
        });

      if (operation === 'inspect') {
        await assert.rejects(
          async () => action(),
          /process_not_owned/,
        );
      } else {
        await assert.rejects(
          action,
          /process_not_owned/,
        );
      }
    }
  },
);

test(
  'runner requires exact processRef and independent start/read/stop grants',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            'process.start',
          ),
        ],
        terminalSandbox:
          f.sandbox,
        processRuntime:
          f.runtime,
      });

    const startTask = {
      taskId:
        'process-start-task',
      deviceId: 'device-test',
      intent:
        'Start owned process',
      risk: 'medium',
      requestedCapabilities: [
        'process.start',
      ],
      expiresAt: futureIso(),
      steps: [{
        stepId: 'step-start',
        tool: 'process',
        summary: 'Start process',
        requiredCapabilities: [
          'process.start',
        ],
        input:
          startInput(f.root),
      }],
    };

    const started =
      await runner.run(startTask);

    assert.equal(
      started.status,
      'succeeded',
    );
    assert.equal(
      started.steps[0]
        .result.running,
      true,
    );

    runner.setGrants([
      grant(
        f.root,
        'process.read',
        'proc_9999999999999999',
      ),
    ]);

    const blockedInspect =
      await runner.run({
        taskId:
          'process-inspect-blocked',
        deviceId: 'device-test',
        intent: 'Inspect process',
        risk: 'low',
        requestedCapabilities: [
          'process.read',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-inspect',
          tool: 'process',
          summary: 'Inspect process',
          requiredCapabilities: [
            'process.read',
          ],
          input: {
            operation: 'inspect',
            processRef: REF,
          },
        }],
      });

    assert.equal(
      blockedInspect.status,
      'blocked',
    );
    assert.equal(
      blockedInspect.policy.reason,
      'approval-required',
    );

    runner.setGrants([
      grant(
        f.root,
        'process.stop',
      ),
    ]);

    const stopped =
      await runner.run({
        taskId:
          'process-stop-task',
        deviceId: 'device-test',
        intent: 'Stop owned process',
        risk: 'medium',
        requestedCapabilities: [
          'process.stop',
        ],
        approval: {
          mode: 'task',
          approvalId:
            'approval-process-stop',
        },
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-stop',
          tool: 'process',
          summary: 'Stop process',
          requiredCapabilities: [
            'process.stop',
          ],
          input: {
            operation: 'stop',
            processRef: REF,
          },
        }],
      });

    assert.equal(
      stopped.status,
      'succeeded',
    );
    assert.equal(
      stopped.steps[0]
        .result.running,
      false,
    );
  },
);

test(
  'owned background process is force-bounded by max runtime',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    await f.runtime.start(
      {
        ...startInput(f.root),
        processRef:
          'proc_2222222222222222',
        maxRuntimeMs: 150,
      },
      {
        allowedRoots: [
          f.root,
        ],
      },
    );

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 300),
    );

    const state =
      f.runtime.inspect({
        operation: 'inspect',
        processRef:
          'proc_2222222222222222',
      });

    assert.equal(
      state.running,
      false,
    );
    assert.equal(
      state.timedOut,
      true,
    );
  },
);

test(
  'process start fails policy when background execution is not explicitly granted',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    const deniedGrant = {
      ...grant(
        f.root,
        'process.start',
      ),
      scope: {
        processRefs: [REF],
        filesystemRoots: [
          f.root,
        ],
        executables: [
          process.execPath,
        ],
        backgroundAllowed: false,
        maxTaskDurationSeconds: 30,
      },
    };

    const runner =
      new ComputerTaskRunner({
        grants: [deniedGrant],
        terminalSandbox:
          f.sandbox,
        processRuntime:
          f.runtime,
      });

    const result =
      await runner.run({
        taskId:
          'process-background-denied',
        deviceId: 'device-test',
        intent:
          'Attempt ungranted background work',
        risk: 'medium',
        requestedCapabilities: [
          'process.start',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-start',
          tool: 'process',
          summary:
            'Start background process',
          requiredCapabilities: [
            'process.start',
          ],
          input:
            startInput(f.root),
        }],
      });

    assert.equal(
      result.status,
      'blocked',
    );
    assert.equal(
      result.policy.reason,
      'approval-required',
    );
  },
);

test(
  'process start fails policy when executable or root is outside the exact grant',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    const otherRoot =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'mudrik-process-other-',
        ),
      );

    t.after(
      () => fs.rm(
        otherRoot,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            'process.start',
          ),
        ],
        terminalSandbox:
          f.sandbox,
        processRuntime:
          f.runtime,
      });

    const wrongRoot =
      await runner.run({
        taskId:
          'process-root-denied',
        deviceId: 'device-test',
        intent: 'Escape process root',
        risk: 'medium',
        requestedCapabilities: [
          'process.start',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-root',
          tool: 'process',
          summary: 'Wrong root',
          requiredCapabilities: [
            'process.start',
          ],
          input: {
            ...startInput(f.root),
            cwd: otherRoot,
          },
        }],
      });

    assert.equal(
      wrongRoot.status,
      'blocked',
    );

    const wrongExecutable =
      await runner.run({
        taskId:
          'process-executable-denied',
        deviceId: 'device-test',
        intent:
          'Use ungranted executable',
        risk: 'medium',
        requestedCapabilities: [
          'process.start',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-exec',
          tool: 'process',
          summary:
            'Wrong executable',
          requiredCapabilities: [
            'process.start',
          ],
          input: {
            ...startInput(f.root),
            executable:
              '/usr/bin/true',
          },
        }],
      });

    assert.equal(
      wrongExecutable.status,
      'blocked',
    );
  },
);

test(
  'process tool fails closed when runner sandbox lacks background primitive',
  async () => {
    const root = os.tmpdir();

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            root,
            'process.start',
          ),
        ],
        terminalSandbox: {
          async run() {
            throw new Error(
              'must-not-run',
            );
          },
        },
      });

    const result =
      await runner.run({
        taskId:
          'process-runtime-unavailable',
        deviceId: 'device-test',
        intent:
          'Require process backend',
        risk: 'medium',
        requestedCapabilities: [
          'process.start',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId:
            'step-process-unavailable',
          tool: 'process',
          summary:
            'Require background backend',
          requiredCapabilities: [
            'process.start',
          ],
          input:
            startInput(root),
        }],
      });

    assert.equal(
      result.status,
      'failed',
    );
    assert.equal(
      result.steps[0].error,
      'process_runtime_unavailable',
    );
  },
);
