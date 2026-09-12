import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  assertSecureStorageKey,
  isSecureStorageKey,
} = loadTypeScriptModule(
  'src/core/security/secureStorageContract.ts',
);

test('secure storage keys accept only approved security classes', () => {
  assert.equal(
    isSecureStorageKey('device_private_key:primary'),
    true,
  );
  assert.equal(
    isSecureStorageKey('session_refresh_credential:account-1'),
    true,
  );
  assert.equal(
    isSecureStorageKey('conversation:all-messages'),
    false,
  );
  assert.equal(
    isSecureStorageKey('password:root'),
    false,
  );
});

test('secure storage key validation rejects path-like and malformed names', () => {
  assert.equal(
    isSecureStorageKey('device_private_key:../other'),
    false,
  );
  assert.equal(
    isSecureStorageKey('device_private_key:/absolute/path'),
    false,
  );
  assert.equal(
    isSecureStorageKey('device_private_key:'),
    false,
  );

  assert.equal(
    assertSecureStorageKey('local_encryption_key:database-v1'),
    'local_encryption_key:database-v1',
  );

  assert.throws(
    () => assertSecureStorageKey('unclassified:key'),
  );
});
