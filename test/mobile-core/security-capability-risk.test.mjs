import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  MUDRIK_CAPABILITIES,
} = loadTypeScriptModule(
  'src/core/security/capabilities.ts',
);

const {
  CAPABILITY_RISK,
  getCapabilityRisk,
} = loadTypeScriptModule(
  'src/core/security/capabilityRisk.ts',
);

test('every canonical capability has exactly one risk classification', () => {
  const capabilitySet = new Set(MUDRIK_CAPABILITIES);
  const classifiedSet = new Set(Object.keys(CAPABILITY_RISK));

  assert.equal(classifiedSet.size, capabilitySet.size);
  assert.deepEqual(
    [...classifiedSet].sort(),
    [...capabilitySet].sort(),
  );

  for (const capability of MUDRIK_CAPABILITIES) {
    assert.ok(['low', 'medium', 'high', 'critical'].includes(getCapabilityRisk(capability)));
  }
});

test('irreversible or security-root actions are never low risk', () => {
  for (const capability of [
    'emergency.call.initiate',
    'secret.use',
    'security.session.revoke',
    'security.device.revoke',
    'security.capability.revoke',
  ]) {
    assert.equal(getCapabilityRisk(capability), 'critical');
  }
});

test('privacy-sensitive sensors are classified high risk', () => {
  for (const capability of [
    'camera.observe',
    'microphone.listen',
    'location.read',
    'health.read.heart_rate',
  ]) {
    assert.equal(getCapabilityRisk(capability), 'high');
  }
});
