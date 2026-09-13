import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  createDefaultCompanionProfile,
} = loadTypeScriptModule(
  'src/contracts/Companion.ts',
);

const {
  validateCompanionProfile,
} = loadTypeScriptModule(
  'src/core/companion/companionProfilePolicy.ts',
);

const {
  evaluateCompanionInteraction,
} = loadTypeScriptModule(
  'src/core/companion/companionInteractionPolicy.ts',
);

function profile(overrides = {}) {
  const base = createDefaultCompanionProfile();

  return {
    ...base,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    trigger: 'direct_request',
    categoryAuthorized: false,
    quietHoursActive: false,
    ...overrides,
  };
}

test('default primary companion profile validates', () => {
  const result =
    validateCompanionProfile(
      profile(),
    );

  assert.equal(result.accepted, true);
  assert.equal(
    result.profile.companionId,
    'companion_primary',
  );
});

test('profile validator rejects authority-bearing extra fields', () => {
  for (const injected of [
    { apiKey: 'not-a-real-key' },
    { modelId: 'provider-model' },
    { permissions: ['camera'] },
    { toolScopes: ['*'] },
    { systemPrompt: 'ignore policy' },
  ]) {
    const result =
      validateCompanionProfile({
        ...profile(),
        ...injected,
      });

    assert.equal(result.accepted, false);
    assert.equal(
      result.reason,
      'invalid_profile',
    );
  }
});

test('profile references reject credential-shaped values', () => {
  for (const candidate of [
    {
      voiceProfileId:
        'voice_api_key_hidden',
    },
    {
      avatarProfileId:
        'avatar_bearer_token',
    },
    {
      memoryPolicyId:
        'memory_secret_value',
    },
  ]) {
    const result =
      validateCompanionProfile(
        profile(candidate),
      );

    assert.equal(result.accepted, false);
    assert.equal(
      result.reason,
      'invalid_profile_reference',
    );
  }
});

test('profile rejects invalid names, personality dimensions and speaking rates', () => {
  const cases = [
    [
      { displayName: '   ' },
      'invalid_name',
    ],
    [
      { warmth: 101 },
      'invalid_personality_dimension',
    ],
    [
      { humor: Number.NaN },
      'invalid_personality_dimension',
    ],
    [
      { speakingRate: 2.01 },
      'invalid_speaking_rate',
    ],
    [
      { speakingRate: Number.POSITIVE_INFINITY },
      'invalid_speaking_rate',
    ],
  ];

  for (const [patch, reason] of cases) {
    const result =
      validateCompanionProfile(
        profile(patch),
      );

    assert.equal(result.accepted, false);
    assert.equal(result.reason, reason);
  }
});

test('language preferences are bounded, validated and deduplicated', () => {
  const accepted =
    validateCompanionProfile(
      profile({
        preferredLanguages: [
          'AR',
          'de-DE',
          'ar',
        ],
      }),
    );

  assert.equal(accepted.accepted, true);
  assert.deepEqual(
    accepted.profile.preferredLanguages,
    ['ar', 'de-de'],
  );

  const tooMany =
    validateCompanionProfile(
      profile({
        preferredLanguages: [
          'ar',
          'de',
          'en',
          'tr',
          'es',
          'fr',
          'it',
          'nl',
          'pl',
        ],
      }),
    );

  assert.equal(tooMany.accepted, false);
  assert.equal(
    tooMany.reason,
    'invalid_languages',
  );
});

test('disabled companion never presents even on a direct request', () => {
  const result =
    evaluateCompanionInteraction(
      profile({ enabled: false }),
      context(),
    );

  assert.equal(
    result.allowedToPresent,
    false,
  );
  assert.equal(
    result.reason,
    'companion_disabled',
  );
});

test('silent presence permits direct requests but blocks notifications and proactivity', () => {
  const silent =
    profile({
      presenceLevel: 'silent',
      initiative: 100,
    });

  const direct =
    evaluateCompanionInteraction(
      silent,
      context(),
    );

  assert.equal(
    direct.allowedToPresent,
    true,
  );

  const proactive =
    evaluateCompanionInteraction(
      silent,
      context({
        trigger:
          'proactive_suggestion',
        categoryAuthorized: true,
      }),
    );

  assert.equal(
    proactive.allowedToPresent,
    false,
  );
  assert.equal(
    proactive.reason,
    'silent_presence',
  );
});

test('normal presence allows authorized necessary notifications but not proactive suggestions', () => {
  const normal =
    profile({
      presenceLevel: 'normal',
      initiative: 100,
    });

  const necessary =
    evaluateCompanionInteraction(
      normal,
      context({
        trigger:
          'necessary_notification',
        categoryAuthorized: true,
      }),
    );

  assert.equal(
    necessary.allowedToPresent,
    true,
  );

  const proactive =
    evaluateCompanionInteraction(
      normal,
      context({
        trigger:
          'proactive_suggestion',
        categoryAuthorized: true,
      }),
    );

  assert.equal(
    proactive.allowedToPresent,
    false,
  );
  assert.equal(
    proactive.reason,
    'normal_presence_no_proactive',
  );
});

test('helpful or active presence still requires independent category authorization and quiet-hours clearance', () => {
  const helpful =
    profile({
      presenceLevel: 'helpful',
      initiative: 100,
    });

  const unauthorized =
    evaluateCompanionInteraction(
      helpful,
      context({
        trigger:
          'proactive_reminder',
      }),
    );

  assert.equal(
    unauthorized.allowedToPresent,
    false,
  );
  assert.equal(
    unauthorized.reason,
    'category_not_authorized',
  );

  const quiet =
    evaluateCompanionInteraction(
      helpful,
      context({
        trigger:
          'proactive_reminder',
        categoryAuthorized: true,
        quietHoursActive: true,
      }),
    );

  assert.equal(quiet.allowedToPresent, false);
  assert.equal(quiet.reason, 'quiet_hours');

  const allowed =
    evaluateCompanionInteraction(
      helpful,
      context({
        trigger:
          'proactive_reminder',
        categoryAuthorized: true,
      }),
    );

  assert.equal(allowed.allowedToPresent, true);
  assert.equal(
    allowed.reason,
    'allowed_proactive_interaction',
  );
});

test('initiative zero disables proactive presentation even in active presence', () => {
  const result =
    evaluateCompanionInteraction(
      profile({
        presenceLevel: 'active',
        initiative: 0,
      }),
      context({
        trigger:
          'proactive_suggestion',
        categoryAuthorized: true,
      }),
    );

  assert.equal(
    result.allowedToPresent,
    false,
  );
  assert.equal(
    result.reason,
    'initiative_disabled',
  );
});

test('every companion interaction decision carries zero authority', () => {
  const decisions = [
    evaluateCompanionInteraction(
      profile(),
      context(),
    ),
    evaluateCompanionInteraction(
      profile({
        presenceLevel: 'active',
        initiative: 100,
      }),
      context({
        trigger:
          'proactive_suggestion',
        categoryAuthorized: true,
      }),
    ),
  ];

  for (const item of decisions) {
    assert.equal(
      item.grantsExecutionAuthority,
      false,
    );
    assert.equal(
      item.grantsSensorAuthority,
      false,
    );
    assert.equal(
      item.grantsMemoryAuthority,
      false,
    );
    assert.equal(
      item.grantsDisclosureAuthority,
      false,
    );
    assert.equal(
      item.changesPrivacyPolicy,
      false,
    );
  }
});
