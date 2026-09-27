import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const auditModule = loadTypeScriptModule(
  'src/core/emergency/emergencyAudit.ts',
);
const securityModule = loadTypeScriptModule(
  'src/core/security/securityEvent.ts',
);

const ACCOUNT =
  'acct_0123456789abcdef';
const DEVICE =
  'dev_0123456789abcdef';
const SESSION =
  'ems_0123456789abcdef';
const NOW = 100_000;

function input(overrides = {}) {
  return {
    eventId:
      'emaud_0123456789abcdef',    kind: 'state_transition',
    occurredAtMs: NOW,
    accountRef: ACCOUNT,
    deviceRef: DEVICE,
    emergencySessionId: SESSION,
    previousPhase: 'critical',
    phase: 'escalating',
    reason: 'accepted',
    simulated: false,
    ...overrides,
  };
}

test(
  'emergency audit creates bounded typed security events',
  () => {
    const event =
      auditModule.createEmergencyAuditEvent(
        input(),
      );

    assert.ok(event);
    assert.equal(
      event.type,
      'emergency.state_transition',
    );
    assert.equal(event.severity, 'info');
    assert.equal(
      event.actorRef,
      ACCOUNT,
    );
    assert.equal(
      event.deviceRef,
      DEVICE,
    );
    assert.equal(
      event.metadata.emergencySessionId,
      SESSION,
    );
    assert.equal(
      event.metadata.previousPhase,
      'critical',
    );
    assert.equal(
      event.metadata.phase,
      'escalating',
    );
  },
);

test(
  'all emergency audit kinds map to registered security event types',
  () => {
    const cases = [
      ['state_transition',
        'emergency.state_transition'],
      ['escalation_planned',
        'emergency.escalation_planned'],      ['action_authorized',
        'emergency.action_authorized'],
      ['action_denied',
        'emergency.action_denied'],
      ['route_rejected',
        'emergency.route_rejected'],
      ['simulation_blocked',
        'emergency.simulation_blocked'],
    ];

    for (const [kind, type] of cases) {
      const event =
        auditModule.createEmergencyAuditEvent(
          input({
            kind,
            eventId:
              'emaud_' + kind.padEnd(
                16,
                'x',
              ),
          }),
        );

      assert.ok(event);
      assert.equal(event.type, type);
      assert.equal(
        securityModule
          .SECURITY_EVENT_TYPES
          .includes(type),        true,
      );
    }
  },
);

test(
  'audit metadata accepts only stable references and reason codes',
  () => {
    const event =
      auditModule.createEmergencyAuditEvent(
        input({
          kind: 'action_denied',
          actionRef:
            'emact_0123456789abcdef',
          routeRef:
            'emroute_0123456789abcdef',
          reason: 'capability_denied',
        }),
      );

    assert.ok(event);
    assert.equal(
      event.metadata.actionRef,
      'emact_0123456789abcdef',
    );
    assert.equal(
      event.metadata.routeRef,
      'emroute_0123456789abcdef',
    );
    assert.equal(
      event.metadata.reason,      'capability_denied',
    );
  },
);

test(
  'raw health sensor credential and free-text fields cannot enter audit',
  () => {
    const hostile = [
      {
        ...input(),
        rawVitals: {
          heartRate: 180,
        },
      },
      {
        ...input(),
        sensorPayload: [1, 2, 3],
      },
      {
        ...input(),
        token: 'secret',
      },
      input({
        reason:
          'patient has chest pain',
      }),
      input({
        actionRef:
          'https://example.test',
      }),
    ];

    for (const value of hostile) {      assert.equal(
        auditModule
          .createEmergencyAuditEvent(
            value,
          ),
        null,
      );
    }
  },
);

test(
  'invalid identities timestamps phases and hidden authority fail closed',
  () => {
    for (const value of [
      input({
        emergencySessionId: 'ems_bad',
      }),
      input({
        accountRef: 'acct_bad',
      }),
      input({
        deviceRef: 'dev_bad',
      }),
      input({
        occurredAtMs: Number.NaN,
      }),
      input({
        phase: 'diagnosed',
      }),
      {
        ...input(),
        grantsAuthority: true,
      },    ]) {
      assert.equal(
        auditModule
          .createEmergencyAuditEvent(
            value,
          ),
        null,
      );
    }
  },
);
