import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  authorizeRuntimeOperation,
} = loadTypeScriptModule(
  'src/core/security/runtimeTrustGate.ts',
);

function integrity(overrides = {}) {
  return {
    accepted: true,
    reason: 'trusted',
    mismatchedArtifactRef: null,
    enterRestrictedMode: false,
    ...overrides,
  };
}

test('trusted runtime can perform all operation classes', () => {
  for (const operationClass of [
    'read',
    'diagnostic',
    'repair',
    'write',
    'execute',
    'network',
    'credential',
    'update',
  ]) {
    assert.equal(
      authorizeRuntimeOperation(
        integrity(),
        operationClass,
        false,
      ).allowed,
      true,
    );
  }
});

test('critical integrity failure blocks side effects but preserves diagnosis', () => {
  const compromised = integrity({
    accepted: false,
    reason: 'digest_mismatch',
    mismatchedArtifactRef:
      'artifact_ref_brain_000000000000001',
    enterRestrictedMode: true,
  });

  assert.deepEqual(
    authorizeRuntimeOperation(
      compromised,
      'diagnostic',
      false,
    ),
    {
      allowed: true,
      reason: 'restricted_read_only',
    },
  );

  for (const operationClass of [
    'write',
    'execute',
    'network',
    'credential',
  ]) {
    assert.equal(
      authorizeRuntimeOperation(
        compromised,
        operationClass,
        false,
      ).allowed,
      false,
    );
  }
});

test('restricted runtime permits only explicitly designated recovery repair/update', () => {
  const compromised = integrity({
    accepted: false,
    reason: 'artifact_missing',
    mismatchedArtifactRef:
      'artifact_ref_policy_00000000000001',
    enterRestrictedMode: true,
  });

  assert.deepEqual(
    authorizeRuntimeOperation(
      compromised,
      'repair',
      true,
    ),
    {
      allowed: true,
      reason: 'restricted_recovery_only',
    },
  );

  assert.equal(
    authorizeRuntimeOperation(
      compromised,
      'repair',
      false,
    ).allowed,
    false,
  );

  assert.equal(
    authorizeRuntimeOperation(
      compromised,
      'update',
      true,
    ).allowed,
    true,
  );
});

test('non-critical mismatch remains read-only until reconciled', () => {
  const mismatch = integrity({
    accepted: false,
    reason: 'digest_mismatch',
    mismatchedArtifactRef:
      'artifact_ref_optional_00000000001',
    enterRestrictedMode: false,
  });

  assert.equal(
    authorizeRuntimeOperation(
      mismatch,
      'read',
      false,
    ).allowed,
    true,
  );

  assert.equal(
    authorizeRuntimeOperation(
      mismatch,
      'execute',
      false,
    ).allowed,
    false,
  );
});
