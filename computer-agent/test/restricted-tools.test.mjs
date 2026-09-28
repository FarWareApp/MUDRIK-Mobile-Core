import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  normalizeRestrictedStep,
  restrictedPolicyContext,
} from '../src/restricted-tool-contracts.mjs';

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

function grant(
  capability,
  scope = {},
  mode = 'session',
) {
  return {
    grantId:
      'grant-'
      + capability.replace('.', '-'),
    deviceId: 'device-test',
    capability,
    mode,
    scope,
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

function task(
  {
    taskId,
    risk = 'low',
    capabilities,
    step,
    approval = null,
  },
) {
  return {
    taskId,
    deviceId: 'device-test',
    intent: 'Restricted tool test',
    risk,
    requestedCapabilities:
      capabilities,
    approval,
    expiresAt: futureIso(),
    steps: [step],
  };
}

test(
  'browser contract requires HTTPS and independent scoped network capability',
  () => {
    const step = {
      tool: 'browser',
      requiredCapabilities: [
        'browser.read',
        'network.outbound',
      ],
      input: {
        operation: 'read',
        url:
          'https://Example.Test/path',
      },
    };

    const normalized =
      normalizeRestrictedStep(step);

    assert.ok(normalized);
    const context =
      restrictedPolicyContext(
        normalized,
      );

    assert.equal(
      context['browser.read']
        .domain,
      'example.test',
    );
    assert.equal(
      context['network.outbound']
        .domain,
      'example.test',
    );
    assert.equal(
      context['network.outbound']
        .minimumRisk,
      'medium',
    );

    assert.equal(
      normalizeRestrictedStep({
        ...step,
        input: {
          operation: 'read',
          url:
            'http://example.test/',
        },
      }),
      null,
    );

    assert.equal(
      normalizeRestrictedStep({
        ...step,
        input: {
          operation: 'read',
          url:
            'https://user:pass@example.test/',
        },
      }),
      null,
    );

    assert.equal(
      normalizeRestrictedStep({
        ...step,
        requiredCapabilities: [
          'browser.read',
        ],
      }),
      null,
    );
  },
);

test(
  'screen clipboard and system contracts expose fixed risk floors and exact resources',
  () => {
    const screen =
      normalizeRestrictedStep({
        tool: 'screen',
        requiredCapabilities: [
          'screen.capture',
        ],
        input: {
          operation: 'capture',
          surfaceRef:
            'surface_0123456789abcdef',
        },
      });

    assert.ok(screen);
    assert.equal(
      restrictedPolicyContext(
        screen,
      )['screen.capture']
        .minimumRisk,
      'high',
    );
    assert.equal(
      restrictedPolicyContext(
        screen,
      )['screen.capture']
        .surfaceRef,
      'surface_0123456789abcdef',
    );

    const clipboardRead =
      normalizeRestrictedStep({
        tool: 'clipboard',
        requiredCapabilities: [
          'clipboard.read',
        ],
        input: {
          operation: 'read',
        },
      });

    assert.ok(clipboardRead);
    assert.equal(
      restrictedPolicyContext(
        clipboardRead,
      )['clipboard.read']
        .minimumRisk,
      'high',
    );

    const clipboardWrite =
      normalizeRestrictedStep({
        tool: 'clipboard',
        requiredCapabilities: [
          'clipboard.write',
        ],
        input: {
          operation: 'write',
          text: 'bounded text',
        },
      });

    assert.ok(clipboardWrite);
    assert.equal(
      restrictedPolicyContext(
        clipboardWrite,
      )['clipboard.write']
        .minimumRisk,
      'medium',
    );

    const setting =
      normalizeRestrictedStep({
        tool: 'system',
        requiredCapabilities: [
          'system.settings',
        ],
        input: {
          operation:
            'inspect_setting',
          settingId:
            'setting_audio.volume',
        },
      });

    assert.ok(setting);
    assert.equal(
      restrictedPolicyContext(
        setting,
      )['system.settings']
        .settingId,
      'setting_audio.volume',
    );

    const admin =
      normalizeRestrictedStep({
        tool: 'system',
        requiredCapabilities: [
          'system.admin',
        ],
        input: {
          operation: 'admin_action',
          actionId:
            'admin_service.restart',
        },
      });

    assert.ok(admin);
    assert.equal(
      restrictedPolicyContext(
        admin,
      )['system.admin']
        .minimumRisk,
      'critical',
    );
    assert.equal(
      restrictedPolicyContext(
        admin,
      )['system.admin']
        .adminActionId,
      'admin_service.restart',
    );
  },
);

test(
  'browser wrong domain is blocked before unavailable backend',
  async () => {
    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            'browser.read',
            {
              domains: [
                'allowed.test',
              ],
            },
          ),
          grant(
            'network.outbound',
            {
              domains: [
                'allowed.test',
              ],
            },
          ),
        ],
      });

    const result =
      await runner.run(
        task({
          taskId:
            'browser-domain-blocked',
          capabilities: [
            'browser.read',
            'network.outbound',
          ],
          step: {
            stepId: 'browser-step',
            tool: 'browser',
            summary: 'Read page',
            requiredCapabilities: [
              'browser.read',
              'network.outbound',
            ],
            input: {
              operation: 'read',
              url:
                'https://other.test/',
            },
          },
        }),
      );

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
  'authorized browser remains fail closed while destination-enforced backend is unavailable',
  async () => {
    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            'browser.read',
            {
              domains: [
                'example.test',
              ],
            },
          ),
          grant(
            'network.outbound',
            {
              domains: [
                'example.test',
              ],
            },
          ),
        ],
      });

    const result =
      await runner.run(
        task({
          taskId:
            'browser-unavailable',
          capabilities: [
            'browser.read',
            'network.outbound',
          ],
          step: {
            stepId: 'browser-step',
            tool: 'browser',
            summary: 'Read page',
            requiredCapabilities: [
              'browser.read',
              'network.outbound',
            ],
            input: {
              operation: 'read',
              url:
                'https://example.test/',
            },
          },
        }),
      );

    assert.equal(
      result.status,
      'failed',
    );
    assert.equal(
      result.steps[0].error,
      'browser_backend_unavailable',
    );
  },
);

test(
  'screen capture is scoped to exact surface and remains backend unavailable',
  async () => {
    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            'screen.capture',
            {
              surfaceRefs: [
                'surface_0123456789abcdef',
              ],
            },
          ),
        ],
      });

    const blocked =
      await runner.run(
        task({
          taskId:
            'screen-scope-blocked',
          risk: 'high',
          capabilities: [
            'screen.capture',
          ],
          approval: {
            mode: 'task',
            approvalId:
              'approval-screen',
          },
          step: {
            stepId: 'screen-step',
            tool: 'screen',
            summary:
              'Capture wrong surface',
            requiredCapabilities: [
              'screen.capture',
            ],
            input: {
              operation: 'capture',
              surfaceRef:
                'surface_9999999999999999',
            },
          },
        }),
      );

    assert.equal(
      blocked.status,
      'blocked',
    );

    const unavailable =
      await runner.run(
        task({
          taskId:
            'screen-unavailable',
          risk: 'high',
          capabilities: [
            'screen.capture',
          ],
          approval: {
            mode: 'task',
            approvalId:
              'approval-screen',
          },
          step: {
            stepId: 'screen-step',
            tool: 'screen',
            summary:
              'Capture allowed surface',
            requiredCapabilities: [
              'screen.capture',
            ],
            input: {
              operation: 'capture',
              surfaceRef:
                'surface_0123456789abcdef',
            },
          },
        }),
      );

    assert.equal(
      unavailable.status,
      'failed',
    );
    assert.equal(
      unavailable.steps[0].error,
      'screen_backend_unavailable',
    );
  },
);

test(
  'system admin requires exact action scope and fresh critical approval',
  async () => {
    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            'system.admin',
            {
              adminActionIds: [
                'admin_service.restart',
              ],
            },
          ),
        ],
      });

    const ordinaryApproval =
      await runner.run(
        task({
          taskId:
            'admin-not-fresh',
          risk: 'critical',
          capabilities: [
            'system.admin',
          ],
          approval: {
            mode: 'task',
            approvalId:
              'approval-admin',
          },
          step: {
            stepId: 'admin-step',
            tool: 'system',
            summary:
              'Restart bounded service',
            requiredCapabilities: [
              'system.admin',
            ],
            input: {
              operation:
                'admin_action',
              actionId:
                'admin_service.restart',
            },
          },
        }),
      );

    assert.equal(
      ordinaryApproval.status,
      'blocked',
    );
    assert.equal(
      ordinaryApproval.policy.reason,
      'fresh-critical-approval-required',
    );

    const wrongScope =
      await runner.run(
        task({
          taskId:
            'admin-wrong-scope',
          risk: 'critical',
          capabilities: [
            'system.admin',
          ],
          approval: {
            mode: 'one_shot',
            approvalId:
              'approval-admin-fresh',
          },
          step: {
            stepId: 'admin-step',
            tool: 'system',
            summary:
              'Wrong admin action',
            requiredCapabilities: [
              'system.admin',
            ],
            input: {
              operation:
                'admin_action',
              actionId:
                'admin_user.create',
            },
          },
        }),
      );

    assert.equal(
      wrongScope.status,
      'blocked',
    );

    const unavailable =
      await runner.run(
        task({
          taskId:
            'admin-unavailable',
          risk: 'critical',
          capabilities: [
            'system.admin',
          ],
          approval: {
            mode: 'one_shot',
            approvalId:
              'approval-admin-fresh',
          },
          step: {
            stepId: 'admin-step',
            tool: 'system',
            summary:
              'Allowed admin action',
            requiredCapabilities: [
              'system.admin',
            ],
            input: {
              operation:
                'admin_action',
              actionId:
                'admin_service.restart',
            },
          },
        }),
      );

    assert.equal(
      unavailable.status,
      'failed',
    );
    assert.equal(
      unavailable.steps[0].error,
      'system_backend_unavailable',
    );
  },
);
