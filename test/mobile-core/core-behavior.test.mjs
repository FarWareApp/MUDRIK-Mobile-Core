import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  connectivitySnapshotSignature,
  shouldApplyConnectivitySnapshot,
} = loadTypeScriptModule(
  'src/features/connectivity/ConnectivitySnapshotPolicy.ts',
);

const {
  resolveTextDirection,
} = loadTypeScriptModule(
  'src/core/localization/TextDirectionResolver.ts',
);

const {
  deriveConversationTitle,
} = loadTypeScriptModule(
  'src/features/conversations/deriveConversationTitle.ts',
);

test(
  'connectivity ordering rejects stale snapshots and accepts equal/newer snapshots',
  () => {
    assert.equal(
      shouldApplyConnectivitySnapshot(200, 199),
      false,
    );
    assert.equal(
      shouldApplyConnectivitySnapshot(200, 200),
      true,
    );
    assert.equal(
      shouldApplyConnectivitySnapshot(200, 201),
      true,
    );
  },
);

test(
  'connectivity signature distinguishes transport, reachability and cost',
  () => {
    assert.equal(
      connectivitySnapshotSignature({
        kind: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        isExpensive: false,
        changedAt: 10,
      }),
      'wifi:connected:reachable:normal-cost',
    );

    assert.equal(
      connectivitySnapshotSignature({
        kind: 'cellular',
        isConnected: true,
        isInternetReachable: null,
        isExpensive: true,
        changedAt: 11,
      }),
      'cellular:connected:reachability-unknown:expensive',
    );
  },
);

test(
  'mixed text direction follows the first strong script character',
  () => {
    assert.equal(
      resolveTextDirection('مرحبا MUDRIK'),
      'rtl',
    );
    assert.equal(
      resolveTextDirection('MUDRIK مرحبا'),
      'ltr',
    );
    assert.equal(
      resolveTextDirection('123 مرحبا'),
      'rtl',
    );
    assert.equal(
      resolveTextDirection('123 Deutsch'),
      'ltr',
    );
    assert.equal(
      resolveTextDirection('123 !!!', 'rtl'),
      'rtl',
    );
  },
);

test(
  'conversation titles normalize whitespace and cap length without exceeding 52 characters',
  () => {
    assert.equal(
      deriveConversationTitle(
        '  Hello\n\n   world   from MUDRIK  ',
      ),
      'Hello world from MUDRIK',
    );

    const longTitle =
      deriveConversationTitle(
        'A'.repeat(80),
      );

    assert.equal(longTitle.length, 52);
    assert.equal(longTitle.endsWith('…'), true);
  },
);
