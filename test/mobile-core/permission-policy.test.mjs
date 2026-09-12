import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  normalizePermissionRecord,
} = loadTypeScriptModule(
  'src/features/permissions/normalizePermissionRecord.ts',
);

test(
  'denied native permissions stay denied and never escalate',
  () => {
    assert.deepEqual(
      normalizePermissionRecord(
        'microphone',
        {
          granted: false,
          status: 'denied',
          canAskAgain: false,
        },
      ),
      {
        id: 'microphone',
        status: 'denied',
        canAskAgain: false,
      },
    );
  },
);

test(
  'only explicit native granted state maps to granted',
  () => {
    assert.deepEqual(
      normalizePermissionRecord(
        'camera',
        {
          granted: true,
          status: 'granted',
          canAskAgain: true,
        },
      ),
      {
        id: 'camera',
        status: 'granted',
        canAskAgain: true,
      },
    );

    assert.deepEqual(
      normalizePermissionRecord(
        'camera',
        {
          granted: false,
          status: 'limited',
        },
      ),
      {
        id: 'camera',
        status: 'unknown',
        canAskAgain: true,
      },
    );
  },
);
