import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const provider = fs.readFileSync(
  'src/features/connectivity/ConnectivityProvider.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/connectivity/hooks/useConnectivityController.ts',
  'utf8',
);
const errorContract = fs.readFileSync(
  'src/features/connectivity/ConnectivityErrorCode.ts',
  'utf8',
);
const refreshPolicy = fs.readFileSync(
  'src/features/connectivity/ConnectivityRefreshPolicy.ts',
  'utf8',
);

test(
  'connectivity failures use a typed public contract and sanitized diagnostics',
  () => {
    assert.match(errorContract, /'refresh'/);
    assert.match(provider, /ConnectivityErrorCode \| null/);
    assert.match(controller, /ConnectivityErrorCode \| null/);
    assert.match(controller, /setError\('refresh'\)/);
    assert.match(controller, /'refresh-failed'/);
    assert.doesNotMatch(controller, /caught\.message/);
    assert.doesNotMatch(
      controller,
      /Unable to read network state/,
    );
  },
);

test(
  'refresh commit policy rejects superseded requests and intervening snapshots',
  () => {
    assert.match(
      refreshPolicy,
      /requestId === latestRequestId/,
    );
    assert.match(
      refreshPolicy,
      /snapshotRevisionAtStart === currentSnapshotRevision/,
    );
    assert.match(
      controller,
      /const snapshotRevisionRef =\s*useRef\(0\)/,
    );
    assert.match(
      controller,
      /const refreshRequestRef =\s*useRef\(0\)/,
    );
    assert.match(
      controller,
      /snapshotRevisionRef\.current \+= 1/,
    );
  },
);

test(
  'both successful and failed refreshes must pass the same causal guard',
  () => {
    const guardCalls = controller.match(
      /shouldCommitConnectivityRefresh\(/g,
    ) ?? [];

    assert.equal(guardCalls.length, 3);
    assert.match(
      controller,
      /await service\.getCurrent\(\);[\s\S]*?shouldCommitConnectivityRefresh\(/,
    );
    assert.match(
      controller,
      /catch \{[\s\S]*?shouldCommitConnectivityRefresh\(/,
    );
  },
);

test(
  'subscription is established before the initial async refresh starts',
  () => {
    const subscribeIndex = controller.indexOf(
      'service.subscribe(',
    );
    const refreshIndex = controller.indexOf(
      "void refresh('initial')",
    );

    assert.notEqual(subscribeIndex, -1);
    assert.notEqual(refreshIndex, -1);
    assert.ok(subscribeIndex < refreshIndex);
  },
);
