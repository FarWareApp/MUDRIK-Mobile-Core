import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseIntegrationAdapterRegistration,
  toPublicIntegrationAdapter,
} = loadTypeScriptModule(
  'src/core/integrations/integrationAdapter.ts',
);
const {
  parseIntegrationDiscoveryRecord,
} = loadTypeScriptModule(
  'src/core/integrations/integrationDiscovery.ts',
);
const {
  parseIntegrationDeviceBinding,
} = loadTypeScriptModule(
  'src/core/integrations/integrationBinding.ts',
);
const {
  parseIntegrationPolicy,
} = loadTypeScriptModule(
  'src/core/integrations/integrationPolicy.ts',
);
const {
  parseIntegrationCommand,
} = loadTypeScriptModule(
  'src/core/integrations/integrationCommand.ts',
);
const {
  parseIntegrationApproval,
} = loadTypeScriptModule(
  'src/core/integrations/integrationApproval.ts',
);
const {
  authorizeIntegrationCommand,
} = loadTypeScriptModule(
  'src/core/integrations/integrationAuthorization.ts',
);
const {
  parseIntegrationRoutine,
} = loadTypeScriptModule(
  'src/core/integrations/integrationRoutine.ts',
);
const {
  parseIntegrationAutomation,
} = loadTypeScriptModule(
  'src/core/integrations/integrationAutomation.ts',
);
const {
  authorizeIntegrationRoutineDefinition,
  authorizeIntegrationAutomationDefinition,
} = loadTypeScriptModule(
  'src/core/integrations/integrationCompositionPolicy.ts',
);
const {
  IntegrationRegistry,
} = loadTypeScriptModule(
  'src/core/integrations/integrationRegistry.ts',
);
const {
  parseIntegrationAdapterInvocation,
} = loadTypeScriptModule(
  'src/core/integrations/integrationAdapterInvocation.ts',
);
const {
  parseIntegrationResultEnvelope,
} = loadTypeScriptModule(
  'src/core/integrations/integrationResult.ts',
);
const {
  parseIntegrationAuditEvent,
} = loadTypeScriptModule(
  'src/core/integrations/integrationAudit.ts',
);
const {
  resolveIntegrationAlias,
  listIntegrationRoomMembers,
} = loadTypeScriptModule(
  'src/core/integrations/integrationAliasResolver.ts',
);

const NOW = 2_100_000_000;
const ACCOUNT = 'acct_1111111111111111';
const WORKSPACE =
  'workspace_1111111111111111';
const POLICY =
  'integration_policy_1111111111111111';
const INTEGRATION =
  'integration_1111111111111111';
const ADAPTER =
  'iadapter_1111111111111111';
const DISCOVERY =
  'idiscovery_1111111111111111';
const DEVICE =
  'idevice_1111111111111111';
const BINDING =
  'ibinding_1111111111111111';
const COMMAND =
  'icommand_1111111111111111';
const APPROVAL =
  'iapproval_1111111111111111';
const ROUTINE =
  'iroutine_1111111111111111';
const AUTOMATION =
  'iautomation_1111111111111111';
const TRIGGER =
  'itrigger_1111111111111111';
const DEVICE_B =
  'idevice_2222222222222222';
const BINDING_B =
  'ibinding_2222222222222222';
const DISCOVERY_B =
  'idiscovery_2222222222222222';

function adapter(overrides = {}) {
  return {
    protocolVersion: '1.0',
    adapterId: ADAPTER,
    integrationId: INTEGRATION,
    kind: 'smart_home',
    displayName: 'Home Adapter',
    status: 'ready',
    credentialRef:
      'credential_ref_1111111111111111',
    declaredAtMs: NOW - 1_000,
    expiresAtMs: NOW + 60_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function discovery(overrides = {}) {
  return {
    protocolVersion: '1.0',
    discoveryId: DISCOVERY,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    adapterId: ADAPTER,
    integrationId: INTEGRATION,
    externalDeviceRef:
      'vendor-device-1111111111111111',
    proposedDeviceId: DEVICE,
    label: 'Living Room Device',
    vendorCapabilities: [
      'vendor_power',
      'vendor_unlock',
    ],
    mappedCapabilities: [
      'power.set',
      'access.unlock',
      'state.read',
    ],
    observedAtMs: NOW - 500,
    expiresAtMs: NOW + 30_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function binding(overrides = {}) {
  return {
    protocolVersion: '1.0',
    bindingId: BINDING,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    integrationId: INTEGRATION,
    adapterId: ADAPTER,
    deviceId: DEVICE,
    externalDeviceRef:
      'vendor-device-1111111111111111',
    capabilities: [
      'power.set',
      'access.unlock',
      'state.read',
    ],
    alias: 'Lamp',
    room: 'Living Room',
    revision: 1,
    state: 'active',
    admittedAtMs: NOW - 400,
    revokedAtMs: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    protocolVersion: '1.0',
    policyId: POLICY,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    enabled: true,
    allowedCapabilities: [
      'state.read',
      'power.set',
      'access.unlock',
    ],
    instantMaxRisk: 'medium',
    automationAllowedCapabilities: [
      'power.set',
    ],
    maxRoutineActions: 16,
    maxAutomationRunsPerHour: 12,
    revision: 1,
    updatedAtMs: NOW - 300,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function command(overrides = {}) {
  return {
    protocolVersion: '1.0',
    commandId: COMMAND,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    policyId: POLICY,
    policyRevision: 1,
    bindingId: BINDING,
    bindingRevision: 1,
    deviceId: DEVICE,
    capability: 'power.set',
    value: true,
    mode: 'instant',
    automationExecutionId: null,
    automationActionIndex: null,
    requestedAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function approval(overrides = {}) {
  return {
    protocolVersion: '1.0',
    approvalId: APPROVAL,
    commandId: COMMAND,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    policyId: POLICY,
    policyRevision: 1,
    bindingId: BINDING,
    bindingRevision: 1,
    capability: 'access.unlock',
    decision: 'approved',
    approvedAtMs: NOW - 10,
    expiresAtMs: NOW + 10_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function routine(overrides = {}) {
  return {
    protocolVersion: '1.0',
    routineId: ROUTINE,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    policyId: POLICY,
    policyRevision: 1,
    label: 'Evening Routine',
    revision: 1,
    state: 'active',
    actions: [
      {
        bindingId: BINDING,
        bindingRevision: 1,
        deviceId: DEVICE,
        capability: 'power.set',
        value: true,
      },
    ],
    updatedAtMs: NOW - 100,
    revokedAtMs: null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function automation(overrides = {}) {
  return {
    protocolVersion: '1.0',
    automationId: AUTOMATION,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    policyId: POLICY,
    policyRevision: 1,
    routineId: ROUTINE,
    routineRevision: 1,
    label: 'Evening Automation',
    triggerKind: 'schedule',
    triggerRef: 'schedule-evening',
    maxRunsPerHour: 2,
    validFromMs: NOW - 10_000,
    validUntilMs: NOW + 60_000,
    revision: 1,
    state: 'enabled',
    updatedAtMs: NOW - 50,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function bindingB(overrides = {}) {
  return binding({
    bindingId: BINDING_B,
    deviceId: DEVICE_B,
    externalDeviceRef:
      'vendor-device-2222222222222222',
    alias: 'Second Device',
    ...overrides,
  });
}

function discoveryB(overrides = {}) {
  return discovery({
    discoveryId: DISCOVERY_B,
    externalDeviceRef:
      'vendor-device-2222222222222222',
    proposedDeviceId: DEVICE_B,
    label: 'Second Device',
    ...overrides,
  });
}

function grant(
  capability = 'home.device.control',
  allowBackground = false,
) {
  return {
    grantId: 'grant_1111111111111111',
    subjectId: DEVICE,
    capability,
    scope: {
      resourceId: DEVICE,
      allowBackground,
      maxElevation: 'none',
    },
    expiresAtMs: NOW + 60_000,
  };
}

test(
  'adapter credential is stripped from public projection',
  () => {
    const parsed =
      parseIntegrationAdapterRegistration(
        adapter(),
      );

    assert.ok(parsed);
    assert.equal(
      parsed.credentialRef,
      'credential_ref_1111111111111111',
    );

    const publicValue =
      toPublicIntegrationAdapter(parsed);

    assert.equal(
      Object.hasOwn(
        publicValue,
        'credentialRef',
      ),
      false,
    );
  },
);

test(
  'discovery is strict descriptive data with zero authority',
  () => {
    const parsed =
      parseIntegrationDiscoveryRecord(
        discovery(),
      );

    assert.ok(parsed);
    assert.equal(
      parsed.grantsExecutionAuthority,
      false,
    );

    assert.equal(
      parseIntegrationDiscoveryRecord({
        ...discovery(),
        grantsCapabilityAuthority: true,
      }),
      null,
    );

    assert.equal(
      parseIntegrationDiscoveryRecord({
        ...discovery(),
        mappedCapabilities: [
          'vendor.unlock.anything',
        ],
      }),
      null,
    );
  },
);

test(
  'binding and policy reject duplicate capabilities and hidden fields',
  () => {
    assert.ok(
      parseIntegrationDeviceBinding(
        binding(),
      ),
    );
    assert.ok(
      parseIntegrationPolicy(
        policy(),
      ),
    );

    assert.equal(
      parseIntegrationDeviceBinding({
        ...binding(),
        capabilities: [
          'power.set',
          'power.set',
        ],
      }),
      null,
    );

    assert.equal(
      parseIntegrationPolicy({
        ...policy(),
        hiddenVendorOverride: true,
      }),
      null,
    );
  },
);

test(
  'safe instant power command requires admitted capability policy and MUDRIK capability grant',
  () => {
    const result =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: command(),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      result.authorized,
      true,
    );
    assert.equal(
      result.reason,
      'authorized',
    );
    assert.equal(
      result.requiredMudrikCapability,
      'home.device.control',
    );
  },
);

test(
  'instant unlock is denied even when vendor and binding claim support',
  () => {
    const unlock =
      command({
        capability: 'access.unlock',
        value: null,
        mode: 'instant',
      });

    const result =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: unlock,
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      result.authorized,
      false,
    );
    assert.equal(
      result.reason,
      'instant_risk_denied',
    );
  },
);

test(
  'approved unlock requires exact live approval binding',
  () => {
    const unlock =
      command({
        capability: 'access.unlock',
        value: null,
        mode: 'approved',
      });

    const allowed =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: unlock,
          approval: approval(),
          capabilityGrants: [
            grant(
              'home.access.control',
              false,
            ),
          ],
        },
        NOW,
        false,
        true,
      );

    assert.equal(
      allowed.authorized,
      true,
    );
    assert.equal(
      allowed.approvalId,
      APPROVAL,
    );

    const expired =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: unlock,
          approval: approval({
            expiresAtMs: NOW,
          }),
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
        false,
        true,
      );

    assert.equal(
      expired.reason,
      'approval_invalid',
    );
  },
);

test(
  'approval cannot be replayed across command binding or capability',
  () => {
    const unlock =
      command({
        capability: 'access.unlock',
        value: null,
        mode: 'approved',
      });

    for (const badApproval of [
      approval({
        commandId:
          'icommand_2222222222222222',
      }),
      approval({
        bindingRevision: 2,
      }),
      approval({
        capability: 'power.set',
      }),
      approval({
        decision: 'denied',
      }),
    ]) {
      const result =
        authorizeIntegrationCommand(
          {
            policy: policy(),
            binding: binding(),
            command: unlock,
            approval: badApproval,
            capabilityGrants: [
              grant(),
            ],
          },
          NOW,
          false,
          true,
        );

      assert.equal(
        result.authorized,
        false,
      );
      assert.equal(
        result.reason,
        'approval_invalid',
      );
    }
  },
);

test(
  'revoked or mismatched bindings fail closed',
  () => {
    const revoked =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding({
            state: 'revoked',
            revokedAtMs: NOW - 1,
          }),
          command: command(),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      revoked.reason,
      'binding_revoked',
    );

    const mismatch =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: command({
            bindingRevision: 2,
          }),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      mismatch.reason,
      'binding_mismatch',
    );
  },
);

test(
  'policy and admitted capability are both required',
  () => {
    const notAdmitted =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding({
            capabilities: [
              'state.read',
            ],
          }),
          command: command(),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      notAdmitted.reason,
      'capability_not_admitted',
    );

    const policyDenied =
      authorizeIntegrationCommand(
        {
          policy: policy({
            allowedCapabilities: [
              'state.read',
              'access.unlock',
            ],
            automationAllowedCapabilities: [],
          }),
          binding: binding(),
          command: command(),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      policyDenied.reason,
      'capability_policy_denied',
    );
  },
);

test(
  'automation requires issued execution proof and background capability scope',
  () => {
    const automated =
      command({
        mode: 'automation',
        automationExecutionId:
          'iautoexec_1111111111111111',
        automationActionIndex: 0,
      });

    const noProof =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: automated,
          approval: null,
          capabilityGrants: [
            grant(
              'home.device.control',
              true,
            ),
          ],
        },
        NOW,
      );

    assert.equal(
      noProof.reason,
      'automation_proof_required',
    );

    const noBackground =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: automated,
          approval: null,
          capabilityGrants: [
            grant(
              'home.device.control',
              false,
            ),
          ],
        },
        NOW,
        true,
      );

    assert.equal(
      noBackground.reason,
      'capability_denied',
    );

    const allowed =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: automated,
          approval: null,
          capabilityGrants: [
            grant(
              'home.device.control',
              true,
            ),
          ],
        },
        NOW,
        true,
      );

    assert.equal(
      allowed.authorized,
      true,
    );

    const highRisk =
      authorizeIntegrationCommand(
        {
          policy: policy({
            automationAllowedCapabilities: [
              'power.set',
              'access.unlock',
            ],
          }),
          binding: binding(),
          command: command({
            capability: 'access.unlock',
            value: null,
            mode: 'automation',
            automationExecutionId:
              'iautoexec_1111111111111111',
            automationActionIndex: 0,
          }),
          approval: null,
          capabilityGrants: [
            grant(
              'home.access.control',
              true,
            ),
          ],
        },
        NOW,
        true,
      );

    assert.equal(
      highRisk.reason,
      'automation_denied',
    );
  },
);

test(
  'commerce purchase always routes to specialized policy',
  () => {
    const result =
      authorizeIntegrationCommand(
        {
          policy: policy({
            allowedCapabilities: [
              'state.read',
              'power.set',
              'commerce.purchase',
            ],
          }),
          binding: binding({
            capabilities: [
              'power.set',
              'commerce.purchase',
            ],
          }),
          command: command({
            capability:
              'commerce.purchase',
            value: null,
            mode: 'specialized',
          }),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      result.reason,
      'specialized_policy_required',
    );
  },
);

test(
  'future command timestamp fails against trusted time',
  () => {
    const result =
      authorizeIntegrationCommand(
        {
          policy: policy(),
          binding: binding(),
          command: command({
            requestedAtMs: NOW + 1,
          }),
          approval: null,
          capabilityGrants: [
            grant(),
          ],
        },
        NOW,
      );

    assert.equal(
      result.reason,
      'invalid_input',
    );
  },
);

test(
  'routine parser requires exact targets and rejects wildcard-style targets',
  () => {
    assert.ok(
      parseIntegrationRoutine(
        routine(),
      ),
    );

    assert.equal(
      parseIntegrationRoutine(
        routine({
          actions: [
            {
              bindingId: '*',
              bindingRevision: 1,
              deviceId: DEVICE,
              capability: 'power.set',
              value: true,
            },
          ],
        }),
      ),
      null,
    );
  },
);

test(
  'routine definition requires current active exact bindings and policy scope',
  () => {
    const allowed =
      authorizeIntegrationRoutineDefinition(
        {
          policy: policy(),
          routine: routine(),
          bindings: [
            binding(),
          ],
        },
        NOW,
      );

    assert.equal(
      allowed.authorized,
      true,
    );

    const stale =
      authorizeIntegrationRoutineDefinition(
        {
          policy: policy(),
          routine: routine(),
          bindings: [
            binding({
              revision: 2,
            }),
          ],
        },
        NOW,
      );

    assert.equal(
      stale.reason,
      'binding_mismatch',
    );

    const revoked =
      authorizeIntegrationRoutineDefinition(
        {
          policy: policy(),
          routine: routine(),
          bindings: [
            binding({
              state: 'revoked',
              revokedAtMs: NOW - 1,
            }),
          ],
        },
        NOW,
      );

    assert.equal(
      revoked.reason,
      'binding_revoked',
    );
  },
);

test(
  'cross-device routine must enumerate every exact target',
  () => {
    const crossDevice =
      routine({
        actions: [
          {
            bindingId: BINDING,
            bindingRevision: 1,
            deviceId: DEVICE,
            capability: 'power.set',
            value: true,
          },
          {
            bindingId: BINDING_B,
            bindingRevision: 1,
            deviceId: DEVICE_B,
            capability: 'power.set',
            value: false,
          },
        ],
      });

    const allowed =
      authorizeIntegrationRoutineDefinition(
        {
          policy: policy(),
          routine: crossDevice,
          bindings: [
            binding(),
            bindingB(),
          ],
        },
        NOW,
      );

    assert.equal(
      allowed.authorized,
      true,
    );

    const missingTarget =
      authorizeIntegrationRoutineDefinition(
        {
          policy: policy(),
          routine: crossDevice,
          bindings: [
            binding(),
          ],
        },
        NOW,
      );

    assert.equal(
      missingTarget.reason,
      'binding_mismatch',
    );
  },
);

test(
  'automation definition rejects high-risk routine actions and policy widening',
  () => {
    assert.ok(
      parseIntegrationAutomation(
        automation(),
      ),
    );

    const allowed =
      authorizeIntegrationAutomationDefinition(
        {
          policy: policy(),
          routine: routine(),
          automation: automation(),
          bindings: [
            binding(),
          ],
        },
        NOW,
      );

    assert.equal(
      allowed.authorized,
      true,
    );

    const highRiskRoutine =
      routine({
        actions: [
          {
            bindingId: BINDING,
            bindingRevision: 1,
            deviceId: DEVICE,
            capability: 'access.unlock',
            value: null,
          },
        ],
      });

    const denied =
      authorizeIntegrationAutomationDefinition(
        {
          policy: policy({
            automationAllowedCapabilities: [
              'power.set',
              'access.unlock',
            ],
          }),
          routine: highRiskRoutine,
          automation: automation(),
          bindings: [
            binding(),
          ],
        },
        NOW,
      );

    assert.equal(
      denied.reason,
      'automation_scope_denied',
    );

    const tooBroad =
      authorizeIntegrationAutomationDefinition(
        {
          policy: policy(),
          routine: routine(),
          automation: automation({
            maxRunsPerHour: 13,
          }),
          bindings: [
            binding(),
          ],
        },
        NOW,
      );

    assert.equal(
      tooBroad.reason,
      'automation_scope_denied',
    );
  },
);

function readyRegistry() {
  const registry =
    new IntegrationRegistry();

  assert.equal(
    registry.setPolicy(
      policy(),
      NOW,
    ).accepted,
    true,
  );
  assert.equal(
    registry.registerAdapter(
      adapter(),
      NOW,
    ).accepted,
    true,
  );
  assert.equal(
    registry.ingestDiscovery(
      discovery(),
      NOW,
    ).accepted,
    true,
  );
  assert.equal(
    registry.admitBinding(
      binding(),
      DISCOVERY,
      NOW,
    ).accepted,
    true,
  );

  return registry;
}

test(
  'registry discovery cannot admit capabilities outside mapped discovery',
  () => {
    const registry =
      new IntegrationRegistry();

    registry.setPolicy(
      policy(),
      NOW,
    );
    registry.registerAdapter(
      adapter(),
      NOW,
    );

    assert.equal(
      registry.ingestDiscovery(
        discovery({
          mappedCapabilities: [
            'power.set',
          ],
        }),
        NOW,
      ).accepted,
      true,
    );

    const admitted =
      registry.admitBinding(
        binding({
          capabilities: [
            'power.set',
            'access.unlock',
          ],
        }),
        DISCOVERY,
        NOW,
      );

    assert.equal(
      admitted.accepted,
      false,
    );
    assert.equal(
      admitted.reason,
      'discovery_binding_mismatch',
    );
  },
);

test(
  'registry exposes adapter credential only behind active current binding',
  () => {
    const registry =
      readyRegistry();

    const internal =
      registry.resolveAdapterCredential(
        BINDING,
        NOW,
      );

    assert.ok(internal);
    assert.equal(
      internal.credentialRef,
      'credential_ref_1111111111111111',
    );

    assert.equal(
      registry.resolveAdapterCredential(
        BINDING,
        NOW + 70_000,
      ),
      null,
    );
  },
);

test(
  'registry authorizes command against current policy and binding only',
  () => {
    const registry =
      readyRegistry();

    const allowed =
      registry.authorizeCommand(
        command(),
        null,
        [
          grant(),
        ],
        NOW,
      );

    assert.equal(
      allowed.authorized,
      true,
    );

    assert.equal(
      registry.revokeBinding(
        BINDING,
        NOW + 1,
      ).accepted,
      true,
    );

    const stale =
      registry.authorizeCommand(
        command(),
        null,
        [
          grant(),
        ],
        NOW + 1,
      );

    assert.equal(
      stale.authorized,
      false,
    );
    assert.equal(
      stale.reason,
      'binding_mismatch',
    );
  },
);

function configuredRegistry({
  secondDevice = false,
} = {}) {
  const registry =
    new IntegrationRegistry();

  assert.equal(
    registry.setPolicy(
      policy(),
      NOW,
    ).accepted,
    true,
  );
  assert.equal(
    registry.registerAdapter(
      adapter(),
      NOW,
    ).accepted,
    true,
  );

  assert.equal(
    registry.ingestDiscovery(
      discovery({
        mappedCapabilities: [
          'state.read',
          'power.set',
          'access.unlock',
        ],
      }),
      NOW,
    ).accepted,
    true,
  );
  assert.equal(
    registry.admitBinding(
      binding(),
      DISCOVERY,
      NOW,
    ).accepted,
    true,
  );

  if (secondDevice) {
    assert.equal(
      registry.ingestDiscovery(
        discoveryB({
          mappedCapabilities: [
            'state.read',
            'power.set',
          ],
        }),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.admitBinding(
        bindingB({
          capabilities: [
            'state.read',
            'power.set',
          ],
        }),
        DISCOVERY_B,
        NOW,
      ).accepted,
      true,
    );
  }

  return registry;
}

test(
  'registry binds discovery to account workspace and admission before credential resolution',
  () => {
    const registry =
      new IntegrationRegistry();

    assert.equal(
      registry.setPolicy(
        policy(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.registerAdapter(
        adapter(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.ingestDiscovery(
        discovery({
          mappedCapabilities: [
            'state.read',
            'power.set',
            'access.unlock',
          ],
        }),
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      registry.resolveAdapterCredential(
        BINDING,
        NOW,
      ),
      null,
    );

    const crossWorkspace =
      registry.admitBinding(
        binding({
          workspaceId:
            'workspace_2222222222222222',
        }),
        DISCOVERY,
        NOW,
      );

    assert.equal(
      crossWorkspace.reason,
      'discovery_binding_mismatch',
    );

    const admitted =
      registry.admitBinding(
        binding(),
        DISCOVERY,
        NOW,
      );

    assert.equal(
      admitted.accepted,
      true,
      admitted.reason,
    );

    const credential =
      registry.resolveAdapterCredential(
        BINDING,
        NOW,
      );

    assert.ok(credential);
    assert.equal(
      credential.credentialRef,
      'credential_ref_1111111111111111',
    );
  },
);

test(
  'adapter status refresh is monotonic and unavailable adapter removes credential access',
  () => {
    const registry =
      configuredRegistry();

    const unavailable =
      registry.registerAdapter(
        adapter({
          status: 'unavailable',
          declaredAtMs: NOW - 50,
          expiresAtMs: NOW + 60_000,
        }),
        NOW,
      );

    assert.equal(
      unavailable.accepted,
      true,
      unavailable.reason,
    );
    assert.equal(
      unavailable.reason,
      'adapter_updated',
    );

    assert.equal(
      registry.resolveAdapterCredential(
        BINDING,
        NOW,
      ),
      null,
    );

    const stale =
      registry.registerAdapter(
        adapter(),
        NOW,
      );

    assert.equal(
      stale.accepted,
      false,
    );
    assert.equal(
      stale.reason,
      'adapter_stale',
    );
  },
);

test(
  'routine and automation registry authorizes exact trigger and idempotent replay',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );

    const event = {
      eventId: TRIGGER,
      automationId: AUTOMATION,
      automationRevision: 1,
      routineId: ROUTINE,
      routineRevision: 1,
      triggerKind: 'schedule',
      triggerRef: 'schedule-evening',
    };

    const first =
      registry.authorizeAutomationTrigger(
        event,
        NOW,
      );

    assert.equal(
      first.accepted,
      true,
      first.reason,
    );
    assert.equal(
      first.reason,
      'automation_trigger_authorized',
    );

    const duplicate =
      registry.authorizeAutomationTrigger(
        event,
        NOW + 1,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
    assert.equal(
      duplicate.reason,
      'duplicate',
    );

    const conflict =
      registry.authorizeAutomationTrigger(
        {
          ...event,
          triggerRef: 'schedule-other',
        },
        NOW + 2,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'trigger_replay_conflict',
    );
  },
);

test(
  'automation trigger enforces per-automation hourly rate limit',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation({
          maxRunsPerHour: 1,
        }),
        NOW,
      ).accepted,
      true,
    );

    const event = {
      eventId: TRIGGER,
      automationId: AUTOMATION,
      automationRevision: 1,
      routineId: ROUTINE,
      routineRevision: 1,
      triggerKind: 'schedule',
      triggerRef: 'schedule-evening',
    };

    assert.equal(
      registry.authorizeAutomationTrigger(
        event,
        NOW,
      ).accepted,
      true,
    );

    const second =
      registry.authorizeAutomationTrigger(
        {
          ...event,
          eventId:
            'itrigger_2222222222222222',
        },
        NOW + 1,
      );

    assert.equal(
      second.accepted,
      false,
    );
    assert.equal(
      second.reason,
      'automation_rate_limited',
    );
  },
);

test(
  'automation pause and revocation revisions are storable but never executable',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );

    const paused =
      registry.setAutomation(
        automation({
          revision: 2,
          state: 'paused',
          updatedAtMs: NOW + 1,
        }),
        NOW + 1,
      );

    assert.equal(
      paused.accepted,
      true,
      paused.reason,
    );

    const pausedTrigger =
      registry.authorizeAutomationTrigger(
        {
          eventId: TRIGGER,
          automationId: AUTOMATION,
          automationRevision: 2,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 1,
      );

    assert.equal(
      pausedTrigger.accepted,
      false,
    );
    assert.equal(
      pausedTrigger.reason,
      'automation_disabled',
    );

    const revoked =
      registry.setAutomation(
        automation({
          revision: 3,
          state: 'revoked',
          updatedAtMs: NOW + 2,
        }),
        NOW + 2,
      );

    assert.equal(
      revoked.accepted,
      true,
      revoked.reason,
    );
  },
);

test(
  'binding and routine revocation propagate to stale automation triggers',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );

    const revokedBinding =
      registry.admitBinding(
        binding({
          revision: 2,
          state: 'revoked',
          revokedAtMs: NOW + 1,
        }),
        DISCOVERY,
        NOW + 1,
      );

    assert.equal(
      revokedBinding.accepted,
      true,
      revokedBinding.reason,
    );

    const activeRoutineUpdate =
      registry.setRoutine(
        routine({
          revision: 2,
          updatedAtMs: NOW + 2,
          actions: [
            {
              bindingId: BINDING,
              bindingRevision: 2,
              deviceId: DEVICE,
              capability: 'power.set',
              value: true,
            },
          ],
        }),
        NOW + 2,
      );

    assert.equal(
      activeRoutineUpdate.accepted,
      false,
    );
    assert.equal(
      activeRoutineUpdate.reason,
      'binding_revoked',
    );

    const revokedRoutine =
      registry.setRoutine(
        routine({
          revision: 2,
          state: 'revoked',
          updatedAtMs: NOW + 2,
          revokedAtMs: NOW + 2,
          actions: [
            {
              bindingId: BINDING,
              bindingRevision: 2,
              deviceId: DEVICE,
              capability: 'power.set',
              value: true,
            },
          ],
        }),
        NOW + 2,
      );

    assert.equal(
      revokedRoutine.accepted,
      true,
      revokedRoutine.reason,
    );

    const staleTrigger =
      registry.authorizeAutomationTrigger(
        {
          eventId: TRIGGER,
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 3,
      );

    assert.equal(
      staleTrigger.accepted,
      false,
    );
    assert.equal(
      staleTrigger.reason,
      'trigger_binding_mismatch',
    );
  },
);

test(
  'policy revision invalidates stale routine automation and command bindings',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 2,
          updatedAtMs: NOW + 1,
        }),
        NOW + 1,
      ).accepted,
      true,
    );

    const commandDecision =
      registry.authorizeCommand(
        command(),
        null,
        [grant()],
        NOW + 1,
      );

    assert.equal(
      commandDecision.authorized,
      false,
    );
    assert.equal(
      commandDecision.reason,
      'binding_mismatch',
    );

    const triggerDecision =
      registry.authorizeAutomationTrigger(
        {
          eventId: TRIGGER,
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 1,
      );

    assert.equal(
      triggerDecision.accepted,
      false,
    );
    assert.equal(
      triggerDecision.reason,
      'binding_mismatch',
    );
  },
);

test(
  'cross-device routine requires exact binding revision and device identity for every action',
  () => {
    const registry =
      configuredRegistry({
        secondDevice: true,
      });

    const exactRoutine =
      routine({
        actions: [
          {
            bindingId: BINDING,
            bindingRevision: 1,
            deviceId: DEVICE,
            capability: 'power.set',
            value: true,
          },
          {
            bindingId: BINDING_B,
            bindingRevision: 1,
            deviceId: DEVICE_B,
            capability: 'power.set',
            value: false,
          },
        ],
      });

    assert.ok(
      parseIntegrationRoutine(
        exactRoutine,
      ),
    );

    assert.equal(
      registry.setRoutine(
        exactRoutine,
        NOW,
      ).accepted,
      true,
    );

    const wrongTarget =
      routine({
        routineId:
          'iroutine_2222222222222222',
        actions: [
          {
            bindingId: BINDING_B,
            bindingRevision: 1,
            deviceId: DEVICE,
            capability: 'power.set',
            value: true,
          },
        ],
      });

    const denied =
      registry.setRoutine(
        wrongTarget,
        NOW,
      );

    assert.equal(
      denied.accepted,
      false,
    );
    assert.equal(
      denied.reason,
      'binding_mismatch',
    );
  },
);

test(
  'future binding revocation timestamp fails closed',
  () => {
    const registry =
      configuredRegistry();

    const futureRevocation =
      registry.admitBinding(
        binding({
          revision: 2,
          state: 'revoked',
          revokedAtMs: NOW + 10,
        }),
        DISCOVERY,
        NOW,
      );

    assert.equal(
      futureRevocation.accepted,
      false,
    );
    assert.equal(
      futureRevocation.reason,
      'binding_invalid',
    );
  },
);

test(
  'registry routine and automation trigger are revision bound and replay safe',
  () => {
    const registry =
      readyRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );

    const trigger = {
      eventId: TRIGGER,
      automationId: AUTOMATION,
      automationRevision: 1,
      routineId: ROUTINE,
      routineRevision: 1,
      triggerKind: 'schedule',
      triggerRef: 'schedule-evening',
    };

    const first =
      registry.authorizeAutomationTrigger(
        trigger,
        NOW,
      );

    assert.equal(
      first.accepted,
      true,
    );
    assert.ok(first.value);

    const duplicate =
      registry.authorizeAutomationTrigger(
        trigger,
        NOW,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
    assert.ok(duplicate.value);
    assert.equal(
      duplicate.value.executionId,
      first.value.executionId,
    );

    const replayConflict =
      registry.authorizeAutomationTrigger(
        {
          ...trigger,
          triggerRef:
            'different-schedule',
        },
        NOW,
      );

    assert.equal(
      replayConflict.reason,
      'trigger_replay_conflict',
    );
  },
);

test(
  'registry automation rate limit is enforced per current revision',
  () => {
    const registry =
      readyRegistry();

    registry.setRoutine(
      routine(),
      NOW,
    );
    registry.setAutomation(
      automation({
        maxRunsPerHour: 2,
      }),
      NOW,
    );

    for (const eventId of [
      'itrigger_1111111111111111',
      'itrigger_2222222222222222',
    ]) {
      assert.equal(
        registry.authorizeAutomationTrigger(
          {
            eventId,
            automationId: AUTOMATION,
            automationRevision: 1,
            routineId: ROUTINE,
            routineRevision: 1,
            triggerKind: 'schedule',
            triggerRef: 'schedule-evening',
          },
          NOW,
        ).accepted,
        true,
      );
    }

    const blocked =
      registry.authorizeAutomationTrigger(
        {
          eventId:
            'itrigger_3333333333333333',
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW,
      );

    assert.equal(
      blocked.accepted,
      false,
    );
    assert.equal(
      blocked.reason,
      'automation_rate_limited',
    );
  },
);

test(
  'binding revocation invalidates routine and automation execution immediately',
  () => {
    const registry =
      readyRegistry();

    registry.setRoutine(
      routine(),
      NOW,
    );
    registry.setAutomation(
      automation(),
      NOW,
    );

    assert.equal(
      registry.revokeBinding(
        BINDING,
        NOW + 1,
      ).reason,
      'binding_revoked',
    );

    const result =
      registry.authorizeAutomationTrigger(
        {
          eventId:
            'itrigger_4444444444444444',
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 1,
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'binding_mismatch',
    );
  },
);

test(
  'policy revision invalidates old routine and automation scope',
  () => {
    const registry =
      readyRegistry();

    registry.setRoutine(
      routine(),
      NOW,
    );
    registry.setAutomation(
      automation(),
      NOW,
    );

    const updatedPolicy =
      policy({
        revision: 2,
        updatedAtMs: NOW + 1,
        automationAllowedCapabilities: [],
      });

    assert.equal(
      registry.setPolicy(
        updatedPolicy,
        NOW + 1,
      ).accepted,
      true,
    );

    const result =
      registry.authorizeAutomationTrigger(
        {
          eventId:
            'itrigger_5555555555555555',
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 1,
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'binding_mismatch',
    );
  },
);

test(
  'adapter invocation is credential-free idempotent and replay-conflict safe',
  () => {
    const registry =
      readyRegistry();

    const first =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [grant()],
        NOW,
      );

    assert.equal(
      first.accepted,
      true,
    );
    assert.ok(first.value);
    assert.ok(
      parseIntegrationAdapterInvocation(
        first.value,
      ),
    );
    assert.equal(
      Object.hasOwn(
        first.value,
        'credentialRef',
      ),
      false,
    );

    const duplicate =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [grant()],
        NOW + 1,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
    assert.equal(
      duplicate.value.issuedAtMs,
      NOW,
    );

    const conflict =
      registry.prepareAdapterInvocation(
        command({
          value: false,
        }),
        null,
        [grant()],
        NOW + 1,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'command_replay_conflict',
    );
  },
);

test(
  'adapter result must match an issued invocation exactly',
  () => {
    const registry =
      readyRegistry();

    const invocation =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [grant()],
        NOW,
      ).value;

    assert.ok(invocation);

    const resultEnvelope = {
      protocolVersion: '1.0',
      commandId: COMMAND,
      bindingId: BINDING,
      deviceId: DEVICE,
      adapterId: ADAPTER,
      integrationId: INTEGRATION,
      status: 'succeeded',
      reasonCode: 'ok',
      resultRef:
        'result_ref_1111111111111111',
      completedAtMs: NOW + 5,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.ok(
      parseIntegrationResultEnvelope(
        resultEnvelope,
      ),
    );

    const accepted =
      registry.acceptAdapterResult(
        resultEnvelope,
        NOW + 5,
      );

    assert.equal(
      accepted.accepted,
      true,
    );

    const duplicate =
      registry.acceptAdapterResult(
        resultEnvelope,
        NOW + 6,
      );

    assert.equal(
      duplicate.duplicate,
      true,
    );

    const mismatch =
      registry.acceptAdapterResult(
        {
          ...resultEnvelope,
          commandId:
            'icommand_2222222222222222',
        },
        NOW + 5,
      );

    assert.equal(
      mismatch.reason,
      'result_binding_mismatch',
    );

    const conflict =
      registry.acceptAdapterResult(
        {
          ...resultEnvelope,
          status: 'failed',
          reasonCode: 'vendor_error',
        },
        NOW + 6,
      );

    assert.equal(
      conflict.reason,
      'result_conflict',
    );
  },
);

test(
  'result and audit contracts reject hidden payloads and authority escalation',
  () => {
    const resultEnvelope = {
      protocolVersion: '1.0',
      commandId: COMMAND,
      bindingId: BINDING,
      deviceId: DEVICE,
      adapterId: ADAPTER,
      integrationId: INTEGRATION,
      status: 'failed',
      reasonCode: 'vendor_error',
      resultRef: null,
      completedAtMs: NOW,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.equal(
      parseIntegrationResultEnvelope({
        ...resultEnvelope,
        grantsExecutionAuthority: true,
      }),
      null,
    );

    assert.equal(
      parseIntegrationResultEnvelope({
        ...resultEnvelope,
        vendorPayload: {
          private: 'data',
        },
      }),
      null,
    );

    const audit = {
      protocolVersion: '1.0',
      eventId:
        'ievent_1111111111111111',
      kind: 'command_authorized',
      accountId: ACCOUNT,
      workspaceId: WORKSPACE,
      bindingId: BINDING,
      commandId: COMMAND,
      routineId: null,
      automationId: null,
      capability: 'power.set',
      reasonCode: 'authorized',
      occurredAtMs: NOW,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.ok(
      parseIntegrationAuditEvent(audit),
    );

    assert.equal(
      parseIntegrationAuditEvent({
        ...audit,
        rawPayload: 'private',
      }),
      null,
    );
  },
);

test(
  'issued automation execution binds exact action index and prevents action replay under another command id',
  () => {
    const registry =
      readyRegistry();

    registry.setRoutine(
      routine(),
      NOW,
    );
    registry.setAutomation(
      automation(),
      NOW,
    );

    const triggered =
      registry.authorizeAutomationTrigger(
        {
          eventId:
            'itrigger_7777777777777777',
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW,
      );

    assert.equal(
      triggered.accepted,
      true,
    );
    assert.ok(triggered.value);

    const automated =
      command({
        mode: 'automation',
        automationExecutionId:
          triggered.value.executionId,
        automationActionIndex: 0,
      });

    const first =
      registry.authorizeCommand(
        automated,
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW,
      );

    assert.equal(
      first.authorized,
      true,
    );

    const idempotent =
      registry.authorizeCommand(
        automated,
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW,
      );

    assert.equal(
      idempotent.authorized,
      true,
    );

    const replay =
      registry.authorizeCommand(
        {
          ...automated,
          commandId:
            'icommand_2222222222222222',
        },
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW,
      );

    assert.equal(
      replay.authorized,
      false,
    );
    assert.equal(
      replay.reason,
      'automation_action_replay_conflict',
    );

    const wrongIndex =
      registry.authorizeCommand(
        {
          ...automated,
          commandId:
            'icommand_3333333333333333',
          automationActionIndex: 1,
        },
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW,
      );

    assert.equal(
      wrongIndex.authorized,
      false,
    );
    assert.equal(
      wrongIndex.reason,
      'automation_execution_invalid',
    );
  },
);

test(
  'automation execution binds exact action and prevents duplicate action with a new command id',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );

    const triggered =
      registry.authorizeAutomationTrigger(
        {
          eventId: TRIGGER,
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW,
      );

    assert.equal(
      triggered.accepted,
      true,
      triggered.reason,
    );
    assert.ok(triggered.value);

    const execution =
      triggered.value;
    const automatedCommand =
      command({
        mode: 'automation',
        automationExecutionId:
          execution.executionId,
        automationActionIndex: 0,
        requestedAtMs: NOW + 1,
      });

    const first =
      registry.authorizeCommand(
        automatedCommand,
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW + 1,
      );

    assert.equal(
      first.authorized,
      true,
      first.reason,
    );

    const duplicate =
      registry.authorizeCommand(
        automatedCommand,
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW + 1,
      );

    assert.equal(
      duplicate.authorized,
      true,
      duplicate.reason,
    );

    const replay =
      registry.authorizeCommand(
        {
          ...automatedCommand,
          commandId:
            'icommand_2222222222222222',
        },
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW + 1,
      );

    assert.equal(
      replay.authorized,
      false,
    );
    assert.equal(
      replay.reason,
      'automation_action_replay_conflict',
    );

    const secondTrigger =
      registry.authorizeAutomationTrigger(
        {
          eventId:
            'itrigger_2222222222222222',
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 2,
      );

    assert.equal(
      secondTrigger.accepted,
      true,
      secondTrigger.reason,
    );
    assert.ok(secondTrigger.value);

    const tampered =
      registry.authorizeCommand(
        command({
          commandId:
            'icommand_3333333333333333',
          mode: 'automation',
          automationExecutionId:
            secondTrigger.value.executionId,
          automationActionIndex: 0,
          value: false,
          requestedAtMs: NOW + 2,
        }),
        null,
        [
          grant(
            'home.device.control',
            true,
          ),
        ],
        NOW + 2,
      );

    assert.equal(
      tampered.authorized,
      false,
    );
    assert.equal(
      tampered.reason,
      'automation_execution_invalid',
    );
  },
);

test(
  'explicit high-risk approval requires registry provenance and supports revocation',
  () => {
    const registry =
      configuredRegistry();
    const unlock =
      command({
        capability: 'access.unlock',
        value: null,
        mode: 'approved',
      });
    const approvalValue =
      approval();

    const fabricated =
      registry.authorizeCommand(
        unlock,
        approvalValue,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW,
      );

    assert.equal(
      fabricated.authorized,
      false,
    );
    assert.equal(
      fabricated.reason,
      'approval_proof_required',
    );

    const recorded =
      registry.recordApproval(
        approvalValue,
        NOW,
      );

    assert.equal(
      recorded.accepted,
      true,
      recorded.reason,
    );
    assert.equal(
      recorded.reason,
      'approval_recorded',
    );

    const authorized =
      registry.authorizeCommand(
        unlock,
        approvalValue,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW,
      );

    assert.equal(
      authorized.authorized,
      true,
      authorized.reason,
    );

    const revoked =
      registry.revokeApproval(
        APPROVAL,
        NOW + 1,
      );

    assert.equal(
      revoked.accepted,
      true,
      revoked.reason,
    );
    assert.equal(
      revoked.reason,
      'approval_revoked',
    );

    const afterRevoke =
      registry.authorizeCommand(
        unlock,
        approvalValue,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW + 1,
      );

    assert.equal(
      afterRevoke.authorized,
      false,
    );
    assert.equal(
      afterRevoke.reason,
      'approval_proof_required',
    );

    const resurrection =
      registry.recordApproval(
        approvalValue,
        NOW + 1,
      );

    assert.equal(
      resurrection.accepted,
      false,
    );
    assert.equal(
      resurrection.reason,
      'approval_revoked',
    );
  },
);

test(
  'approval command binding is one-decision identity and future approval time fails closed',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.recordApproval(
        approval(),
        NOW,
      ).accepted,
      true,
    );

    const conflicting =
      registry.recordApproval(
        approval({
          approvalId:
            'iapproval_2222222222222222',
        }),
        NOW,
      );

    assert.equal(
      conflicting.accepted,
      false,
    );
    assert.equal(
      conflicting.reason,
      'approval_command_conflict',
    );

    const other =
      configuredRegistry();
    const future =
      other.recordApproval(
        approval({
          approvedAtMs: NOW + 1,
          expiresAtMs: NOW + 10_000,
        }),
        NOW,
      );

    assert.equal(
      future.accepted,
      false,
    );
    assert.equal(
      future.reason,
      'approval_invalid',
    );
  },
);

test(
  'alias resolution is metadata-only and refuses ambiguous or revoked targets',
  () => {
    const exact =
      resolveIntegrationAlias(
        [
          binding(),
          bindingB({
            alias: 'Lamp',
            room: 'Kitchen',
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          alias: 'lamp',
          room: 'living room',
        },
      );

    assert.equal(
      exact.status,
      'resolved',
    );
    assert.equal(
      exact.target.bindingId,
      BINDING,
    );
    assert.equal(
      exact.grantsAuthority,
      false,
    );

    const ambiguous =
      resolveIntegrationAlias(
        [
          binding(),
          bindingB({
            alias: 'Lamp',
            room: 'Living Room',
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          alias: 'Lamp',
          room: null,
        },
      );

    assert.equal(
      ambiguous.status,
      'ambiguous',
    );
    assert.equal(
      ambiguous.target,
      null,
    );

    const revokedOnly =
      resolveIntegrationAlias(
        [
          binding({
            state: 'revoked',
            revision: 2,
            revokedAtMs: NOW,
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          alias: 'Lamp',
          room: null,
        },
      );

    assert.equal(
      revokedOnly.status,
      'not_found',
    );
  },
);

test(
  'room projection returns exact active targets only and grants no authority',
  () => {
    const projection =
      listIntegrationRoomMembers(
        [
          binding(),
          bindingB({
            room: 'Living Room',
          }),
          binding({
            bindingId:
              'ibinding_3333333333333333',
            deviceId:
              'idevice_3333333333333333',
            externalDeviceRef:
              'vendor-device-3333333333333333',
            accountId:
              'acct_2222222222222222',
            alias: 'Other Account',
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          room: 'living room',
        },
      );

    assert.equal(
      projection.status,
      'resolved',
    );
    assert.deepEqual(
      projection.targets.map(
        (target) => target.bindingId,
      ),
      [
        BINDING,
        BINDING_B,
      ].sort(),
    );
    assert.equal(
      projection.grantsAuthority,
      false,
    );
    assert.equal(
      projection.targets.every(
        (target) =>
          !Object.hasOwn(
            target,
            'capabilities',
          ),
      ),
      true,
    );
  },
);

test(
  'adapter invocation expires no later than adapter authorization window',
  () => {
    const registry =
      readyRegistry();

    const invocation =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [grant()],
        NOW,
      );

    assert.equal(
      invocation.accepted,
      true,
      invocation.reason,
    );
    assert.ok(invocation.value);
    assert.equal(
      invocation.value.expiresAtMs,
      NOW + 60_000,
    );

    const expiredResult =
      registry.acceptAdapterResult(
        {
          protocolVersion: '1.0',
          commandId: COMMAND,
          bindingId: BINDING,
          deviceId: DEVICE,
          adapterId: ADAPTER,
          integrationId: INTEGRATION,
          status: 'succeeded',
          reasonCode: 'ok',
          resultRef:
            'result_ref_9999999999999999',
          completedAtMs:
            invocation.value.expiresAtMs,
          grantsExecutionAuthority: false,
          grantsSensorAuthority: false,
          grantsApprovalAuthority: false,
          grantsCapabilityAuthority: false,
        },
        invocation.value.expiresAtMs,
      );

    assert.equal(
      expiredResult.accepted,
      false,
    );
    assert.equal(
      expiredResult.reason,
      'result_expired',
    );
  },
);

test(
  'approved high-risk invocation cannot outlive its recorded approval',
  () => {
    const registry =
      readyRegistry();
    const unlock =
      command({
        capability: 'access.unlock',
        value: null,
        mode: 'approved',
      });
    const approvalValue =
      approval({
        expiresAtMs: NOW + 10_000,
      });

    assert.equal(
      registry.recordApproval(
        approvalValue,
        NOW,
      ).accepted,
      true,
    );

    const invocation =
      registry.prepareAdapterInvocation(
        unlock,
        approvalValue,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW,
      );

    assert.equal(
      invocation.accepted,
      true,
      invocation.reason,
    );
    assert.ok(invocation.value);
    assert.equal(
      invocation.value.expiresAtMs,
      NOW + 10_000,
    );
  },
);

test(
  'aliases resolve only to active exact bindings and ambiguity grants no authority',
  () => {
    const ambiguous =
      resolveIntegrationAlias(
        [
          binding(),
          bindingB({
            alias: 'Lamp',
            room: 'Bedroom',
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          alias: 'Lamp',
          room: null,
        },
      );

    assert.equal(
      ambiguous.status,
      'ambiguous',
    );
    assert.equal(
      ambiguous.target,
      null,
    );
    assert.equal(
      ambiguous.grantsAuthority,
      false,
    );

    const scoped =
      resolveIntegrationAlias(
        [
          binding(),
          bindingB({
            alias: 'Lamp',
            room: 'Bedroom',
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          alias: 'Lamp',
          room: 'Living Room',
        },
      );

    assert.equal(
      scoped.status,
      'resolved',
    );
    assert.equal(
      scoped.target.deviceId,
      DEVICE,
    );
    assert.equal(
      scoped.grantsAuthority,
      false,
    );

    const revokedIgnored =
      resolveIntegrationAlias(
        [
          binding(),
          bindingB({
            alias: 'Lamp',
            room: 'Bedroom',
            state: 'revoked',
            revokedAtMs: NOW - 1,
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          alias: 'Lamp',
          room: null,
        },
      );

    assert.equal(
      revokedIgnored.status,
      'resolved',
    );
    assert.equal(
      revokedIgnored.target.deviceId,
      DEVICE,
    );

    assert.equal(
      parseIntegrationCommand(
        command({
          deviceId: 'Lamp',
        }),
      ),
      null,
    );
  },
);

test(
  'room projection returns bounded exact targets without command authority',
  () => {
    const projected =
      listIntegrationRoomMembers(
        [
          binding(),
          bindingB({
            room: 'Living Room',
          }),
        ],
        {
          accountId: ACCOUNT,
          workspaceId: WORKSPACE,
          room: 'Living Room',
        },
      );

    assert.equal(
      projected.status,
      'resolved',
    );
    assert.equal(
      projected.targets.length,
      2,
    );
    assert.equal(
      projected.grantsAuthority,
      false,
    );
    assert.deepEqual(
      projected.targets
        .map((target) => target.deviceId)
        .sort(),
      [DEVICE, DEVICE_B].sort(),
    );
  },
);

test(
  'adapter invocation lifetime is bounded and expired invocation cannot be replayed',
  () => {
    const registry =
      new IntegrationRegistry();

    registry.setPolicy(
      policy(),
      NOW,
    );
    registry.registerAdapter(
      adapter({
        expiresAtMs:
          NOW + 600_000,
      }),
      NOW,
    );
    registry.ingestDiscovery(
      discovery({
        expiresAtMs:
          NOW + 300_000,
      }),
      NOW,
    );
    registry.admitBinding(
      binding(),
      DISCOVERY,
      NOW,
    );

    const longGrant = {
      ...grant(),
      expiresAtMs:
        NOW + 600_000,
    };

    const first =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [longGrant],
        NOW,
      );

    assert.equal(
      first.accepted,
      true,
    );
    assert.ok(first.value);
    assert.equal(
      first.value.expiresAtMs,
      NOW + 120_000,
    );

    const expiredRetry =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [longGrant],
        NOW + 120_000,
      );

    assert.equal(
      expiredRetry.accepted,
      false,
    );
    assert.equal(
      expiredRetry.reason,
      'invocation_expired',
    );
  },
);

test(
  'adapter result arriving after invocation lifetime is rejected',
  () => {
    const registry =
      readyRegistry();

    const invocation =
      registry.prepareAdapterInvocation(
        command(),
        null,
        [grant()],
        NOW,
      ).value;

    assert.ok(invocation);

    const late =
      registry.acceptAdapterResult(
        {
          protocolVersion: '1.0',
          commandId: COMMAND,
          bindingId: BINDING,
          deviceId: DEVICE,
          adapterId: ADAPTER,
          integrationId: INTEGRATION,
          status: 'succeeded',
          reasonCode: 'ok',
          resultRef: null,
          completedAtMs:
            invocation.expiresAtMs + 1,
          grantsExecutionAuthority: false,
          grantsSensorAuthority: false,
          grantsApprovalAuthority: false,
          grantsCapabilityAuthority: false,
        },
        invocation.expiresAtMs + 1,
      );

    assert.equal(
      late.accepted,
      false,
    );
    assert.equal(
      late.reason,
      'result_expired',
    );
  },
);

test(
  'approved invocation cannot outlive its recorded approval',
  () => {
    const registry =
      readyRegistry();

    const unlock =
      command({
        capability: 'access.unlock',
        value: null,
        mode: 'approved',
      });
    const approved =
      approval();

    assert.equal(
      registry.recordApproval(
        approved,
        NOW,
      ).accepted,
      true,
    );

    const issued =
      registry.prepareAdapterInvocation(
        unlock,
        approved,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW,
      );

    assert.equal(
      issued.accepted,
      true,
    );
    assert.ok(issued.value);
    assert.equal(
      issued.value.expiresAtMs,
      approved.expiresAtMs,
    );
  },
);

test(
  'high-risk approval is bound to the exact current policy revision',
  () => {
    const registry =
      configuredRegistry();

    const updatedPolicy =
      policy({
        revision: 2,
        updatedAtMs: NOW + 1,
      });

    assert.equal(
      registry.setPolicy(
        updatedPolicy,
        NOW + 1,
      ).accepted,
      true,
    );

    const stale =
      registry.recordApproval(
        approval(),
        NOW + 1,
      );

    assert.equal(
      stale.accepted,
      false,
    );
    assert.equal(
      stale.reason,
      'approval_policy_denied',
    );

    const currentApproval =
      approval({
        approvalId:
          'iapproval_3333333333333333',
        commandId:
          'icommand_3333333333333333',
        policyRevision: 2,
        approvedAtMs: NOW + 1,
        expiresAtMs: NOW + 10_000,
      });

    assert.equal(
      registry.recordApproval(
        currentApproval,
        NOW + 1,
      ).accepted,
      true,
    );

    const authorized =
      registry.authorizeCommand(
        command({
          commandId:
            'icommand_3333333333333333',
          policyRevision: 2,
          capability: 'access.unlock',
          value: null,
          mode: 'approved',
        }),
        currentApproval,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW + 1,
      );

    assert.equal(
      authorized.authorized,
      true,
      authorized.reason,
    );
  },
);

test(
  'revoked binding routine and automation identities cannot be resurrected by a later revision',
  () => {
    const bindingRegistry =
      configuredRegistry();

    const revokedBinding =
      bindingRegistry.revokeBinding(
        BINDING,
        NOW + 1,
      );

    assert.equal(
      revokedBinding.accepted,
      true,
      revokedBinding.reason,
    );

    const bindingResurrection =
      bindingRegistry.admitBinding(
        binding({
          revision: 3,
          state: 'active',
          admittedAtMs: NOW + 2,
          revokedAtMs: null,
        }),
        DISCOVERY,
        NOW + 2,
      );

    assert.equal(
      bindingResurrection.accepted,
      false,
    );
    assert.equal(
      bindingResurrection.reason,
      'binding_revoked',
    );

    const routineRegistry =
      configuredRegistry();

    assert.equal(
      routineRegistry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      routineRegistry.setRoutine(
        routine({
          revision: 2,
          state: 'revoked',
          updatedAtMs: NOW + 1,
          revokedAtMs: NOW + 1,
        }),
        NOW + 1,
      ).accepted,
      true,
    );

    const routineResurrection =
      routineRegistry.setRoutine(
        routine({
          revision: 3,
          state: 'active',
          updatedAtMs: NOW + 2,
          revokedAtMs: null,
        }),
        NOW + 2,
      );

    assert.equal(
      routineResurrection.accepted,
      false,
    );
    assert.equal(
      routineResurrection.reason,
      'routine_revoked',
    );

    const automationRegistry =
      configuredRegistry();

    assert.equal(
      automationRegistry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      automationRegistry.setAutomation(
        automation(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      automationRegistry.setAutomation(
        automation({
          revision: 2,
          state: 'revoked',
          updatedAtMs: NOW + 1,
        }),
        NOW + 1,
      ).accepted,
      true,
    );

    const automationResurrection =
      automationRegistry.setAutomation(
        automation({
          revision: 3,
          state: 'enabled',
          updatedAtMs: NOW + 2,
        }),
        NOW + 2,
      );

    assert.equal(
      automationResurrection.accepted,
      false,
    );
    assert.equal(
      automationResurrection.reason,
      'automation_revoked',
    );
  },
);

test(
  'recorded high-risk approval cannot cross an integration policy revision',
  () => {
    const registry =
      configuredRegistry();
    const oldApproval =
      approval();

    assert.equal(
      registry.recordApproval(
        oldApproval,
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 2,
          updatedAtMs: NOW + 1,
        }),
        NOW + 1,
      ).accepted,
      true,
    );

    const revisedCommand =
      command({
        policyRevision: 2,
        capability: 'access.unlock',
        value: null,
        mode: 'approved',
        requestedAtMs: NOW + 1,
      });

    const denied =
      registry.authorizeCommand(
        revisedCommand,
        oldApproval,
        [
          grant(
            'home.access.control',
            false,
          ),
        ],
        NOW + 1,
      );

    assert.equal(
      denied.authorized,
      false,
    );
    assert.equal(
      denied.reason,
      'approval_invalid',
    );

    const rerecord =
      registry.recordApproval(
        oldApproval,
        NOW + 1,
      );

    assert.equal(
      rerecord.accepted,
      false,
    );
    assert.equal(
      rerecord.reason,
      'approval_policy_denied',
    );
  },
);

test(
  'disabling integration policy immediately blocks adapter credential resolution',
  () => {
    const registry =
      configuredRegistry();

    assert.ok(
      registry.resolveAdapterCredential(
        BINDING,
        NOW,
      ),
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 2,
          enabled: false,
          updatedAtMs: NOW + 1,
        }),
        NOW + 1,
      ).accepted,
      true,
    );

    assert.equal(
      registry.resolveAdapterCredential(
        BINDING,
        NOW + 1,
      ),
      null,
    );
  },
);

test(
  'vendor-only unsupported capability remains descriptive and cannot be admitted as a known action',
  () => {
    const registry =
      new IntegrationRegistry();

    assert.equal(
      registry.setPolicy(
        policy(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.registerAdapter(
        adapter(),
        NOW,
      ).accepted,
      true,
    );

    const unsupportedDiscovery =
      discovery({
        vendorCapabilities: [
          'vendor_magic_action',
        ],
        mappedCapabilities: [],
      });

    assert.ok(
      parseIntegrationDiscoveryRecord(
        unsupportedDiscovery,
      ),
    );

    assert.equal(
      registry.ingestDiscovery(
        unsupportedDiscovery,
        NOW,
      ).accepted,
      true,
    );

    const admission =
      registry.admitBinding(
        binding({
          capabilities: [
            'power.set',
          ],
        }),
        DISCOVERY,
        NOW,
      );

    assert.equal(
      admission.accepted,
      false,
    );
    assert.equal(
      admission.reason,
      'discovery_binding_mismatch',
    );
  },
);

test(
  'discovery cannot be admitted into another account even with matching device metadata',
  () => {
    const registry =
      new IntegrationRegistry();

    assert.equal(
      registry.setPolicy(
        policy(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.registerAdapter(
        adapter(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.ingestDiscovery(
        discovery(),
        NOW,
      ).accepted,
      true,
    );

    const crossAccount =
      registry.admitBinding(
        binding({
          accountId:
            'acct_2222222222222222',
        }),
        DISCOVERY,
        NOW,
      );

    assert.equal(
      crossAccount.accepted,
      false,
    );
    assert.equal(
      crossAccount.reason,
      'discovery_binding_mismatch',
    );
  },
);

test(
  'security disarm requires dedicated security capability and exact approval',
  () => {
    const securityPolicy =
      policy({
        allowedCapabilities: [
          'state.read',
          'power.set',
          'security.disarm',
        ],
      });
    const securityBinding =
      binding({
        capabilities: [
          'power.set',
          'security.disarm',
        ],
      });
    const disarm =
      command({
        capability: 'security.disarm',
        value: null,
        mode: 'approved',
      });
    const securityApproval =
      approval({
        capability: 'security.disarm',
      });

    const genericGrant =
      authorizeIntegrationCommand(
        {
          policy: securityPolicy,
          binding: securityBinding,
          command: disarm,
          approval: securityApproval,
          capabilityGrants: [
            grant(
              'home.device.control',
              false,
            ),
          ],
        },
        NOW,
        false,
        true,
      );

    assert.equal(
      genericGrant.authorized,
      false,
    );
    assert.equal(
      genericGrant.reason,
      'capability_denied',
    );

    const dedicatedGrant =
      authorizeIntegrationCommand(
        {
          policy: securityPolicy,
          binding: securityBinding,
          command: disarm,
          approval: securityApproval,
          capabilityGrants: [
            grant(
              'home.security.control',
              false,
            ),
          ],
        },
        NOW,
        false,
        true,
      );

    assert.equal(
      dedicatedGrant.authorized,
      true,
      dedicatedGrant.reason,
    );
  },
);

test(
  'automation trigger fails closed after its validity window',
  () => {
    const registry =
      configuredRegistry();

    assert.equal(
      registry.setRoutine(
        routine(),
        NOW,
      ).accepted,
      true,
    );
    assert.equal(
      registry.setAutomation(
        automation({
          validUntilMs: NOW + 5,
        }),
        NOW,
      ).accepted,
      true,
    );

    const trigger =
      registry.authorizeAutomationTrigger(
        {
          eventId: TRIGGER,
          automationId: AUTOMATION,
          automationRevision: 1,
          routineId: ROUTINE,
          routineRevision: 1,
          triggerKind: 'schedule',
          triggerRef: 'schedule-evening',
        },
        NOW + 5,
      );

    assert.equal(
      trigger.accepted,
      false,
    );
    assert.equal(
      trigger.reason,
      'automation_window_closed',
    );
  },
);

test(
  'result contract rejects secret-shaped references',
  () => {
    assert.equal(
      parseIntegrationResultEnvelope({
        protocolVersion: '1.0',
        commandId: COMMAND,
        bindingId: BINDING,
        deviceId: DEVICE,
        adapterId: ADAPTER,
        integrationId: INTEGRATION,
        status: 'failed',
        reasonCode: 'provider_error',
        resultRef:
          'secret:credentialmaterial',
        completedAtMs: NOW,
        grantsExecutionAuthority: false,
        grantsSensorAuthority: false,
        grantsApprovalAuthority: false,
        grantsCapabilityAuthority: false,
      }),
      null,
    );
  },
);
