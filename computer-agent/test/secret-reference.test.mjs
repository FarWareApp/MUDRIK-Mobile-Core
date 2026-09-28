import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  parsePermissionGrant,
} from '../src/permission-grant.mjs';

import {
  parseSecretBindings,
  redactSecretValues,
  secretReferences,
} from '../src/secret-reference.mjs';

import {
  normalizeToolStep,
  policyContextForToolStep,
} from '../src/tool-contracts.mjs';

import {
  createDirectTestTerminalSandbox,
} from './helpers/direct-terminal-sandbox.mjs';

const REF =
  'secret_ref_0123456789abcdef';

function futureIso(minutes = 10) {
  return new Date(
    Date.now()
      + minutes * 60_000,
  ).toISOString();
}

function pastIso(minutes = 1) {
  return new Date(
    Date.now()
      - minutes * 60_000,
  ).toISOString();
}

function terminalGrant(root) {
  return {
    grantId:
      'grant-terminal-secret-test',
    deviceId: 'device-test',
    capability:
      'terminal.execute',
    mode: 'session',
    scope: {
      filesystemRoots: [root],
      executables: [
        process.execPath,
      ],
    },
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

function secretGrant(
  references = [REF],
) {
  return {
    grantId:
      'grant-secrets-test',
    deviceId: 'device-test',
    capability: 'secrets.use',
    mode: 'session',
    scope: {
      secretRefs: references,
    },
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

function secretTask(root) {
  return {
    taskId: 'secret-task-test',
    deviceId: 'device-test',
    intent:
      'Use an opaque local secret',
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
      'secrets.use',
    ],
    approval: {
      mode: 'task',
      approvalId:
        'approval-secret-test',
    },
    expiresAt: futureIso(),
    steps: [{
      stepId: 'step-secret',
      tool: 'terminal',
      summary:
        'Inject secret locally',
      requiredCapabilities: [
        'terminal.execute',
        'secrets.use',
      ],
      input: {
        executable:
          process.execPath,
        args: [
          '-e',
          'process.stdout.write(process.env.API_TOKEN);process.stderr.write(process.env.API_TOKEN)',
        ],
        cwd: root,
        secretBindings: [{
          envName: 'API_TOKEN',
          secretRef: REF,
        }],
      },
    }],
  };
}

test(
  'secret binding contract stores only opaque references',
  () => {
    const parsed =
      parseSecretBindings([{
        envName: 'API_TOKEN',
        secretRef: REF,
      }]);

    assert.ok(parsed);
    assert.deepEqual(
      secretReferences(parsed),
      [REF],
    );

    assert.equal(
      parseSecretBindings({
        API_TOKEN: REF,
      }),
      null,
    );

    assert.equal(
      parseSecretBindings([{
        envName: 'PATH',
        secretRef: REF,
      }]),
      null,
    );

    assert.equal(
      parseSecretBindings([{
        envName: 'API_TOKEN',
        secretRef: 'plaintext-secret',
      }]),
      null,
    );
  },
);

test(
  'permission grant accepts exact secret references and rejects malformed references',
  () => {
    assert.ok(
      parsePermissionGrant(
        secretGrant(),
      ),
    );

    assert.equal(
      parsePermissionGrant(
        secretGrant([
          'bad-secret-reference',
        ]),
      ),
      null,
    );
  },
);

test(
  'terminal secret bindings require independent secrets.use capability and high-risk context',
  () => {
    const task =
      secretTask(os.tmpdir());
    const normalized =
      normalizeToolStep(
        task.steps[0],
      );

    assert.ok(normalized);

    const context =
      policyContextForToolStep(
        normalized,
      );

    assert.deepEqual(
      context['secrets.use']
        .secretRefs,
      [REF],
    );
    assert.equal(
      context['secrets.use']
        .minimumRisk,
      'high',
    );

    assert.equal(
      normalizeToolStep({
        ...task.steps[0],
        requiredCapabilities: [
          'terminal.execute',
        ],
      }),
      null,
    );
  },
);

test(
  'secret resolver injects only at execution and redacts stdout and stderr',
  async () => {
    const root = os.tmpdir();
    const secret =
      'runtime-only-secret-value';
    let resolutions = 0;

    const runner =
      new ComputerTaskRunner({
        grants: [
          terminalGrant(root),
          secretGrant(),
        ],
        terminalSandbox:
          createDirectTestTerminalSandbox(),
        secretResolver: {
          async resolve(reference) {
            resolutions += 1;
            assert.equal(
              reference,
              REF,
            );
            return secret;
          },
        },
      });

    const task = secretTask(root);

    assert.equal(
      JSON.stringify(task)
        .includes(secret),
      false,
    );

    const result =
      await runner.run(task);

    assert.equal(
      result.status,
      'succeeded',
    );
    assert.equal(resolutions, 1);
    assert.equal(
      result.steps[0]
        .result.stdout,
      '[REDACTED]',
    );
    assert.equal(
      result.steps[0]
        .result.stderr,
      '[REDACTED]',
    );
    assert.equal(
      JSON.stringify(result)
        .includes(secret),
      false,
    );
  },
);

test(
  'wrong secret scope blocks before resolver access',
  async () => {
    const root = os.tmpdir();
    let resolutions = 0;

    const runner =
      new ComputerTaskRunner({
        grants: [
          terminalGrant(root),
          secretGrant([
            'secret_ref_1111111111111111',
          ]),
        ],
        terminalSandbox:
          createDirectTestTerminalSandbox(),
        secretResolver: {
          async resolve() {
            resolutions += 1;
            return 'should-not-resolve';
          },
        },
      });

    const result =
      await runner.run(
        secretTask(root),
      );

    assert.equal(
      result.status,
      'blocked',
    );
    assert.equal(
      result.policy.reason,
      'approval-required',
    );
    assert.equal(resolutions, 0);
  },
);

test(
  'authorized secret step fails closed when local resolver is unavailable',
  async () => {
    const root = os.tmpdir();

    const runner =
      new ComputerTaskRunner({
        grants: [
          terminalGrant(root),
          secretGrant(),
        ],
        terminalSandbox:
          createDirectTestTerminalSandbox(),
      });

    const result =
      await runner.run(
        secretTask(root),
      );

    assert.equal(
      result.status,
      'failed',
    );
    assert.equal(
      result.steps[0].error,
      'secret_resolution_unavailable',
    );
  },
);

test(
  'secret redaction handles repeated and overlapping values deterministically',
  () => {
    assert.equal(
      redactSecretValues(
        'abc123 abc abc123',
        ['abc', 'abc123'],
      ),
      '[REDACTED] [REDACTED] [REDACTED]',
    );
  },
);
