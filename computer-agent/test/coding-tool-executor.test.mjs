import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';

import {
  Section12CodingToolExecutor,
  normalizeCodingToolExecutionResult,
} from '../src/coding-tool-executor.mjs';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  createDirectTestTerminalSandbox,
} from './helpers/direct-terminal-sandbox.mjs';

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

function outerTask() {
  return {
    taskId:
      'ctask_bbbbbbbbbbbbbbbb',
    deviceId:
      'dev_bbbbbbbbbbbbbbbb',
    intent:
      'Run bounded coding tools',
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approval: {
      mode: 'automatic',
    },
    expiresAt: futureIso(),
  };
}

function terminalStep() {
  return {
    stepId:
      'cstep_bbbbbbbbbbbbbbbb',
    tool: 'terminal',
    summary:
      'Run bounded command',
    requiredCapabilities: [
      'terminal.execute',
    ],
    input: {
      executable:
        process.execPath,
      args: [
        '-e',
        'process.stdout.write("ok")',
      ],
      cwd: os.tmpdir(),
      timeoutMs: 5_000,
      maxOutputBytes:
        64 * 1024,
    },
    continueOnError: false,
  };
}

test(
  'Section12 coding executor runs through ComputerTaskRunner policy and sandbox',
  async () => {
    const outer = outerTask();
    const runner =
      new ComputerTaskRunner({
        grants: [{
          grantId:
            'grant-coding-terminal',
          deviceId:
            outer.deviceId,
          capability:
            'terminal.execute',
          mode: 'session',
          scope: {
            filesystemRoots: [
              os.tmpdir(),
            ],
            executables: [
              process.execPath,
            ],
            maxTaskDurationSeconds:
              10,
          },
          createdAt: pastIso(),
          expiresAt: futureIso(),
        }],
        terminalSandbox:
          createDirectTestTerminalSandbox(),
      });

    const executor =
      new Section12CodingToolExecutor({
        runner,
        outerTask: outer,
      });
    const step = terminalStep();

    const raw =
      await executor.execute({
        job: {
          outerTaskId:
            outer.taskId,
          deviceId:
            outer.deviceId,
        },
        steps: [step],
      });

    const normalized =
      normalizeCodingToolExecutionResult(
        raw,
        [step],
      );

    assert.ok(normalized);
    assert.equal(
      normalized.status,
      'succeeded',
    );
    assert.deepEqual(
      normalized.completedStepIds,
      [step.stepId],
    );
    assert.equal(
      normalized.mutationOccurred,
      true,
    );
  },
);

test(
  'Section12 coding executor cannot widen outer task capability envelope',
  async () => {
    const outer = outerTask();
    let calls = 0;
    const runner = {
      async run() {
        calls += 1;
        return {
          status: 'succeeded',
          steps: [],
        };
      },
      cancel() {},
    };
    const executor =
      new Section12CodingToolExecutor({
        runner,
        outerTask: outer,
      });

    const raw =
      await executor.execute({
        job: {
          outerTaskId:
            outer.taskId,
          deviceId:
            outer.deviceId,
        },
        steps: [{
          stepId:
            'cstep_cccccccccccccccc',
          tool: 'filesystem',
          summary:
            'Try broaden scope',
          requiredCapabilities: [
            'filesystem.write',
          ],
          input: {
            operation: 'write',
            path:
              os.tmpdir()
              + '/x.txt',
            encoding: 'utf8',
            content: 'x',
          },
          continueOnError: false,
        }],
      });

    assert.equal(
      raw.status,
      'blocked',
    );
    assert.equal(
      raw.summaryCode,
      'tool.capability_outside_outer_task',
    );
    assert.equal(calls, 0);
  },
);

test(
  'coding tool result normalizer rejects completed ids outside submitted steps',
  () => {
    const step = terminalStep();

    assert.equal(
      normalizeCodingToolExecutionResult(
        {
          status: 'succeeded',
          completedStepIds: [
            'cstep_unknownunknown',
          ],
          summaryCode:
            'tool.succeeded',
          observation: '',
        },
        [step],
      ),
      null,
    );
  },
);
