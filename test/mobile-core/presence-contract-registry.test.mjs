import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseSurfaceDescriptor,
} = loadTypeScriptModule(
  'src/core/presence/surfaceContract.ts',
);

const {
  PresenceRegistry,
} = loadTypeScriptModule(
  'src/core/presence/presenceRegistry.ts',
);

const SURFACE =
  'surf_aaaaaaaaaaaaaaaa';
const SESSION =
  'psess_aaaaaaaaaaaaaaaa';
const SESSION_B =
  'psess_bbbbbbbbbbbbbbbb';
const DEVICE =
  'dev_aaaaaaaaaaaaaaaa';

function surface(overrides = {}) {
  return {
    surfaceId: SURFACE,
    deviceId: DEVICE,
    kind: 'phone',
    privacyClass: 'personal_private',
    capabilities: [
      'text',
      'audio_output',
      'microphone',
      'private_audio',
    ],
    sharedSpace: false,
    ...overrides,
  };
}

function observation(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    surfaceId: SURFACE,
    sequence: 1,
    observedAt: 1_000,
    expiresAt: 61_000,
    availability: 'online',
    confidence: 90,
    deviceActive: true,
    recentDirectInteraction: false,
    explicitRoomMatch: false,
    estimatedLatencyMs: 50,
    ...overrides,
  };
}

test(
  'surface descriptor accepts strict presentation metadata',
  () => {
    assert.ok(
      parseSurfaceDescriptor(
        surface(),
      ),
    );

    assert.equal(
      parseSurfaceDescriptor({
        ...surface(),
        unexpected: true,
      }),
      null,
    );

    assert.equal(
      parseSurfaceDescriptor(
        surface({
          capabilities: [
            'text',
            'text',
          ],
        }),
      ),
      null,
    );

    assert.equal(
      parseSurfaceDescriptor(
        surface({
          privacyClass:
            'personal_private',
          sharedSpace: true,
        }),
      ),
      null,
    );
  },
);

test(
  'private audio requires audio output capability',
  () => {
    assert.equal(
      parseSurfaceDescriptor(
        surface({
          capabilities: [
            'text',
            'private_audio',
          ],
        }),
      ),
      null,
    );
  },
);

test(
  'presence registry accepts monotonic updates and exact duplicates',
  () => {
    const registry =
      new PresenceRegistry();

    const first = observation();

    assert.equal(
      registry.update(first).reason,
      'accepted',
    );
    assert.equal(
      registry.update(first).reason,
      'duplicate',
    );
    assert.equal(
      registry.update(
        observation({
          sequence: 0,
        }),
      ).reason,
      'stale_sequence',
    );
    assert.equal(
      registry.update(
        observation({
          confidence: 1,
        }),
      ).reason,
      'sequence_conflict',
    );
    assert.equal(
      registry.update(
        observation({
          sequence: 2,
          observedAt: 999,
          expiresAt: 60_999,
        }),
      ).reason,
      'non_monotonic_time',
    );

    assert.equal(
      registry.update(
        observation({
          sequence: 2,
        }),
      ).reason,
      'accepted',
    );
  },
);

test(
  'presence registry rejects malformed confidence ttl and extra fields',
  () => {
    const registry =
      new PresenceRegistry();

    assert.equal(
      registry.update(
        observation({
          confidence: Number.NaN,
        }),
      ).reason,
      'invalid_observation',
    );

    assert.equal(
      registry.update(
        observation({
          confidence: 101,
        }),
      ).reason,
      'invalid_observation',
    );

    assert.equal(
      registry.update(
        observation({
          expiresAt: 200_000,
        }),
      ).reason,
      'invalid_observation',
    );

    assert.equal(
      registry.update(
        observation({
          expiresAt: 1_000,
        }),
      ).reason,
      'invalid_observation',
    );

    assert.equal(
      registry.update({
        ...observation(),
        extraSignal: 1,
      }).reason,
      'invalid_observation',
    );
  },
);


test(
  'presence registry isolates monotonic ordering by logical session',
  () => {
    const registry =
      new PresenceRegistry();

    assert.equal(
      registry.update(
        observation({
          sequence: 5,
        }),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.update(
        observation({
          presenceSessionId: SESSION_B,
          sequence: 0,
        }),
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.get(
        SESSION,
        SURFACE,
      )?.sequence,
      5,
    );

    assert.equal(
      registry.get(
        SESSION_B,
        SURFACE,
      )?.sequence,
      0,
    );
  },
);
