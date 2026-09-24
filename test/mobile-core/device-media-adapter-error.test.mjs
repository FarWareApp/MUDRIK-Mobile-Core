import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const errorModule =
  loadTypeScriptModule(
    'src/core/orchestration/deviceMediaAdapterError.ts',
  );

test(
  'adapter errors expose typed sanitized diagnostics without raw hidden fields',
  () => {
    const normalized =
      errorModule
        .normalizeDeviceMediaAdapterError({
          code: 'timeout',
          message:
            'provider timed out while waiting for device response',
          stack:
            'must never be copied',
          rawPayload: {
            private: true,
          },
        });

    assert.equal(
      normalized.code,
      'timeout',
    );
    assert.equal(
      normalized.retryable,
      true,
    );
    assert.equal(
      normalized.safeDetail,
      'provider timed out while waiting for device response',
    );
    assert.equal(
      Object.hasOwn(
        normalized,
        'stack',
      ),
      false,
    );
    assert.equal(
      Object.hasOwn(
        normalized,
        'rawPayload',
      ),
      false,
    );
  },
);

test(
  'adapter error details inherit bounded security metadata sanitization',
  () => {
    const normalized =
      errorModule
        .normalizeDeviceMediaAdapterError({
          code: 'invalid_response',
          message: 'x'.repeat(500),
        });

    assert.ok(
      normalized.safeDetail.length
        <= 257,
    );
    assert.equal(
      normalized.retryable,
      false,
    );
  },
);

test(
  'unknown error shapes collapse to safe unknown diagnostics',
  () => {
    assert.deepEqual(
      errorModule
        .normalizeDeviceMediaAdapterError(
          42,
        ),
      {
        code: 'unknown',
        safeDetail: null,
        retryable: false,
      },
    );

    const unknownCode =
      errorModule
        .normalizeDeviceMediaAdapterError({
          code: 'vendor_internal',
          message: 'failed',
        });

    assert.equal(
      unknownCode.code,
      'unknown',
    );
    assert.equal(
      unknownCode.safeDetail,
      'failed',
    );
  },
);
