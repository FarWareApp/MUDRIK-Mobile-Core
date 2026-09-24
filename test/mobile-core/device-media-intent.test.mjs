import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const intentModule = loadTypeScriptModule(
  'src/core/orchestration/deviceMediaIntent.ts',
);

const capabilityModule = loadTypeScriptModule(
  'src/core/orchestration/deviceMediaCapability.ts',
);

const registryModule = loadTypeScriptModule(
  'src/core/orchestration/deviceMediaIntentRegistry.ts',
);

const SESSION =
  'orch_aaaaaaaaaaaaaaaa';
const DEVICE_A =
  'dev_aaaaaaaaaaaaaaaa';
const DEVICE_B =
  'dev_bbbbbbbbbbbbbbbb';

function base(
  kind,
  overrides = {},
) {
  return {
    orchestrationSessionId: SESSION,
    intentId:
      'dmi_aaaaaaaaaaaaaaaa',
    sequence: 0,
    kind,
    targetDeviceId: DEVICE_A,
    ...overrides,
  };
}

const validCases = [
  [base('media.play'), 'media.control'],
  [base('media.pause'), 'media.control'],
  [base('media.next'), 'media.control'],
  [base('media.previous'), 'media.control'],
  [
    base('media.seek', {
      positionMs: 42_000,
    }),
    'media.control',
  ],
  [
    base('media.set_volume', {
      volumePercent: 45,
    }),
    'media.control',
  ],
  [
    base('media.transfer_session', {
      sourceDeviceId: DEVICE_B,
      mediaSessionRef:
        'media_session_01',
    }),
    'media.transfer',
  ],
  [
    base('tv.channel.next'),
    'media.control',
  ],
  [
    base('tv.channel.set', {
      channelRef: 'channel_news_01',
    }),
    'media.control',
  ],
  [
    base('app.open', {
      appRef: 'app_youtube_01',
    }),
    'app.open',
  ],
  [
    base('app.close', {
      appRef: 'app_youtube_01',
    }),
    'app.close',
  ],
  [
    base('content.search', {
      queryText: 'فيروز live',
    }),
    'media.search',
  ],
  [
    base('content.play', {
      contentRef:
        'content_track_01',
    }),
    'media.control',
  ],
  [
    base('game.launch', {
      gameRef: 'game_racing_01',
    }),
    'game.launch',
  ],
  [
    base('device.focus'),
    'device.control',
  ],
  [
    base(
      'display.companion.move',
      {
        placement: 'bottom_right',
      },
    ),
    'display.companion.move',
  ],
];

test(
  'every Section 08 normalized intent parses and maps to one least-privilege capability',
  () => {
    for (
      const [raw, expectedCapability]
      of validCases
    ) {
      const parsed =
        intentModule
          .parseDeviceMediaIntent(raw);

      assert.ok(
        parsed,
        raw.kind,
      );
      assert.equal(
        Object.isFrozen(parsed),
        true,
      );
      assert.equal(
        capabilityModule
          .capabilityForDeviceMediaIntent(
            parsed.kind,
          ),
        expectedCapability,
      );
    }
  },
);

test(
  'intent parsing rejects unknown kinds hidden authority fields and malformed device identity',
  () => {
    for (const raw of [
      base('system.shell'),
      {
        ...base('media.play'),
        permissions: ['all'],
      },
      {
        ...base('media.play'),
        toolScopes: ['*'],
      },
      {
        ...base('media.play'),
        command: 'rm -rf /',
      },
      base('media.play', {
        targetDeviceId:
          'device-not-canonical',
      }),
      base('media.play', {
        sequence: Number.NaN,
      }),
      base('media.play', {
        sequence:
          Number.MAX_SAFE_INTEGER + 1,
      }),
    ]) {
      assert.equal(
        intentModule
          .parseDeviceMediaIntent(raw),
        null,
      );
    }
  },
);

test(
  'opaque execution references reject credentials urls and script-shaped values',
  () => {
    const invalid = [
      base('app.open', {
        appRef:
          'app_token_secret',
      }),
      base('app.open', {
        appRef:
          'https://example.com',
      }),
      base('content.play', {
        contentRef:
          'content_api_key_secret',
      }),
      base('game.launch', {
        gameRef:
          'game_bash-c_payload',
      }),
      base('tv.channel.set', {
        channelRef:
          'channel_secret_value',
      }),
      base('media.transfer_session', {
        sourceDeviceId: DEVICE_B,
        mediaSessionRef:
          'media_token_value',
      }),
    ];

    for (const raw of invalid) {
      assert.equal(
        intentModule
          .parseDeviceMediaIntent(raw),
        null,
      );
    }
  },
);

test(
  'media search text is bounded natural text and rejects command or url payloads',
  () => {
    assert.equal(
      intentModule
        .parseDeviceMediaIntent(
          base('content.search', {
            queryText:
              '  موسيقى هادئة  ',
          }),
        )?.queryText,
      'موسيقى هادئة',
    );

    for (const queryText of [
      'bash -c whoami',
      'powershell -EncodedCommand abc',
      'hello && shutdown',
      'https://example.com/watch',
      'x'.repeat(513),
      'line\nbreak',
    ]) {
      assert.equal(
        intentModule
          .parseDeviceMediaIntent(
            base('content.search', {
              queryText,
            }),
          ),
        null,
      );
    }
  },
);

test(
  'volume seek transfer and placement bounds fail closed',
  () => {
    for (const raw of [
      base('media.set_volume', {
        volumePercent: -1,
      }),
      base('media.set_volume', {
        volumePercent: 101,
      }),
      base('media.set_volume', {
        volumePercent: 0.5,
      }),
      base('media.seek', {
        positionMs: Number.POSITIVE_INFINITY,
      }),
      base('media.seek', {
        positionMs:
          7 * 24 * 60 * 60 * 1000 + 1,
      }),
      base('media.transfer_session', {
        sourceDeviceId: DEVICE_A,
        mediaSessionRef:
          'media_session_01',
      }),
      base(
        'display.companion.move',
        {
          placement: 'offscreen',
        },
      ),
    ]) {
      assert.equal(
        intentModule
          .parseDeviceMediaIntent(raw),
        null,
      );
    }
  },
);

test(
  'intent registry enforces exact monotonic sequencing idempotence and replay rejection',
  () => {
    const registry =
      new registryModule
        .DeviceMediaIntentRegistry();

    const first = base('media.play');

    assert.equal(
      registry.apply(first).reason,
      'accepted',
    );
    assert.equal(
      registry.apply(first).reason,
      'duplicate',
    );

    assert.equal(
      registry.apply(
        base('media.pause', {
          intentId:
            'dmi_bbbbbbbbbbbbbbbb',
          sequence: 0,
        }),
      ).reason,
      'sequence_conflict',
    );

    assert.equal(
      registry.apply(
        base('media.pause', {
          intentId:
            'dmi_bbbbbbbbbbbbbbbb',
          sequence: 2,
        }),
      ).reason,
      'sequence_gap',
    );

    assert.equal(
      registry.apply(
        base('media.pause', {
          intentId:
            'dmi_bbbbbbbbbbbbbbbb',
          sequence: 1,
        }),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        base('media.next', {
          intentId:
            'dmi_aaaaaaaaaaaaaaaa',
          sequence: 2,
        }),
      ).reason,
      'intent_replay',
    );

    assert.equal(
      registry.apply(
        base('media.next', {
          intentId:
            'dmi_cccccccccccccccc',
          sequence: 2,
        }),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        base('media.previous', {
          intentId:
            'dmi_dddddddddddddddd',
          sequence: 1,
        }),
      ).reason,
      'stale_sequence',
    );
  },
);

test(
  'orchestration sessions maintain independent sequence state',
  () => {
    const registry =
      new registryModule
        .DeviceMediaIntentRegistry();

    assert.equal(
      registry.apply(
        base('media.play'),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        base('media.pause', {
          orchestrationSessionId:
            'orch_bbbbbbbbbbbbbbbb',
          intentId:
            'dmi_bbbbbbbbbbbbbbbb',
          sequence: 0,
        }),
      ).reason,
      'accepted',
    );
  },
);
