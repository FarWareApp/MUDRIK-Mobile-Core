import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  ToolConcurrencyGate,
} = loadTypeScriptModule(
  'src/core/tools/toolConcurrencyGate.ts',
);

const NOW = 4_100_000_000;
const TOOL_A = 'tool_alpha_1111111111111111';
const TOOL_B = 'tool_beta_2222222222222222';

function gate() {
  return new ToolConcurrencyGate(
    [
      {
        toolRef: TOOL_A,
        maxConcurrent: 2,
      },
      {
        toolRef: TOOL_B,
        maxConcurrent: 1,
      },
    ],
    2,
  );
}

test('tool and global concurrency limits are enforced', () => {
  const runtime = gate();

  assert.equal(
    runtime.acquire(
      TOOL_A,
      'operation_ref_1111111111111111',
      NOW,
      NOW + 10_000,
    ).allowed,
    true,
  );

  assert.equal(
    runtime.acquire(
      TOOL_A,
      'operation_ref_2222222222222222',
      NOW,
      NOW + 10_000,
    ).allowed,
    true,
  );

  assert.equal(
    runtime.acquire(
      TOOL_B,
      'operation_ref_3333333333333333',
      NOW,
      NOW + 10_000,
    ).reason,
    'global_saturated',
  );
});

test('per-tool saturation is enforced before global capacity is consumed', () => {
  const runtime = new ToolConcurrencyGate(
    [
      {
        toolRef: TOOL_B,
        maxConcurrent: 1,
      },
    ],
    10,
  );

  runtime.acquire(
    TOOL_B,
    'operation_ref_1111111111111111',
    NOW,
    NOW + 10_000,
  );

  assert.equal(
    runtime.acquire(
      TOOL_B,
      'operation_ref_2222222222222222',
      NOW,
      NOW + 10_000,
    ).reason,
    'tool_saturated',
  );
});

test('acquire is idempotent but rebinding an operation fails closed', () => {
  const runtime = gate();

  const first =
    runtime.acquire(
      TOOL_A,
      'operation_ref_1111111111111111',
      NOW,
      NOW + 10_000,
    );

  const second =
    runtime.acquire(
      TOOL_A,
      'operation_ref_1111111111111111',
      NOW + 1,
      NOW + 10_000,
    );

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(second.idempotent, true);

  assert.equal(
    runtime.acquire(
      TOOL_B,
      'operation_ref_1111111111111111',
      NOW + 1,
      NOW + 10_000,
    ).reason,
    'operation_conflict',
  );
});

test('expired permits are automatically reaped', () => {
  const runtime = new ToolConcurrencyGate(
    [
      {
        toolRef: TOOL_B,
        maxConcurrent: 1,
      },
    ],
    1,
  );

  runtime.acquire(
    TOOL_B,
    'operation_ref_1111111111111111',
    NOW,
    NOW + 1000,
  );

  const next =
    runtime.acquire(
      TOOL_B,
      'operation_ref_2222222222222222',
      NOW + 1000,
      NOW + 5000,
    );

  assert.equal(next.allowed, true);
  assert.equal(next.reason, 'acquired');
  assert.equal(runtime.snapshot(NOW + 1000).length, 1);
});

test('release is idempotent and wrong-tool release is rejected', () => {
  const runtime = gate();

  runtime.acquire(
    TOOL_A,
    'operation_ref_1111111111111111',
    NOW,
    NOW + 10_000,
  );

  assert.equal(
    runtime.release(
      'operation_ref_1111111111111111',
      TOOL_B,
      NOW + 1,
    ).reason,
    'operation_conflict',
  );

  assert.equal(
    runtime.release(
      'operation_ref_1111111111111111',
      TOOL_A,
      NOW + 1,
    ).reason,
    'released',
  );

  assert.equal(
    runtime.release(
      'operation_ref_1111111111111111',
      TOOL_A,
      NOW + 2,
    ).reason,
    'idempotent',
  );
});
