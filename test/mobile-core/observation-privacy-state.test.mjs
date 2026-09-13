import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  transitionObservationPrivacy,
} = loadTypeScriptModule('src/core/privacy/observationPrivacyState.ts');

const {
  detectPrivacyIntent,
} = loadTypeScriptModule('src/core/privacy/privacyIntent.ts');

const GOOD_CHECKS = Object.freeze({
  explicitUserRequest: true,
  osPermissionGranted: true,
  deviceTrusted: true,
  runtimeAvailable: true,
});

test('visual stop moves active policy to visual_off immediately', () => {
  assert.deepEqual(
    transitionObservationPrivacy({
      state: 'active',
      event: 'stop_visual',
    }),
    {
      previousState: 'active',
      nextState: 'visual_off',
      changed: true,
      allowed: true,
      reason: 'applied',
    },
  );
});

test('broad privacy stop creates privacy_lock and cannot be weakened by narrower stop', () => {
  const locked = transitionObservationPrivacy({
    state: 'active',
    event: 'lock_privacy',
  });

  assert.equal(locked.nextState, 'privacy_lock');

  assert.deepEqual(
    transitionObservationPrivacy({
      state: 'privacy_lock',
      event: 'stop_visual',
    }),
    {
      previousState: 'privacy_lock',
      nextState: 'privacy_lock',
      changed: false,
      allowed: true,
      reason: 'preserved_restriction',
    },
  );
});

test('restart model restart handoff room change new conversation and ordinary activity preserve restrictive state', () => {
  for (const state of ['visual_off', 'ambient_off', 'privacy_lock']) {
    for (const event of [
      'app_restart',
      'model_restart',
      'device_handoff',
      'room_change',
      'new_conversation',
      'ordinary_activity',
    ]) {
      const result = transitionObservationPrivacy({ state, event });
      assert.equal(result.nextState, state);
      assert.equal(result.changed, false);
      assert.equal(result.allowed, true);
      assert.equal(result.reason, 'preserved_restriction');
    }
  }
});

test('visual resume cannot unlock broader privacy restrictions', () => {
  for (const state of ['ambient_off', 'privacy_lock']) {
    assert.deepEqual(
      transitionObservationPrivacy({
        state,
        event: 'resume_visual',
        reactivationChecks: GOOD_CHECKS,
      }),
      {
        previousState: state,
        nextState: state,
        changed: false,
        allowed: false,
        reason: 'broader_unlock_required',
      },
    );
  }
});

test('reactivation requires explicit request permission trusted device and available runtime', () => {
  const cases = [
    ['explicitUserRequest', 'explicit_user_request_required'],
    ['osPermissionGranted', 'os_permission_required'],
    ['deviceTrusted', 'trusted_device_required'],
    ['runtimeAvailable', 'runtime_unavailable'],
  ];

  for (const [field, reason] of cases) {
    const checks = { ...GOOD_CHECKS, [field]: false };
    const result = transitionObservationPrivacy({
      state: 'visual_off',
      event: 'resume_visual',
      reactivationChecks: checks,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.nextState, 'visual_off');
    assert.equal(result.reason, reason);
  }
});

test('explicit valid visual resume can restore active only from visual_off', () => {
  assert.deepEqual(
    transitionObservationPrivacy({
      state: 'visual_off',
      event: 'resume_visual',
      reactivationChecks: GOOD_CHECKS,
    }),
    {
      previousState: 'visual_off',
      nextState: 'active',
      changed: true,
      allowed: true,
      reason: 'applied',
    },
  );
});

test('privacy_lock unlock requires all explicit reactivation checks', () => {
  assert.equal(
    transitionObservationPrivacy({
      state: 'privacy_lock',
      event: 'unlock_privacy',
      reactivationChecks: GOOD_CHECKS,
    }).nextState,
    'active',
  );

  assert.equal(
    transitionObservationPrivacy({
      state: 'privacy_lock',
      event: 'unlock_privacy',
      reactivationChecks: {
        ...GOOD_CHECKS,
        explicitUserRequest: false,
      },
    }).nextState,
    'privacy_lock',
  );
});

test('malformed state machine input fails closed to privacy_lock', () => {
  for (const input of [
    null,
    [],
    {},
    { state: 'active', event: 'root_override' },
    { state: 'unknown', event: 'ordinary_activity' },
    { state: 'active', event: 'resume_visual', reactivationChecks: { root: true } },
    { state: 'active', event: 'ordinary_activity', bypass: true },
  ]) {
    const result = transitionObservationPrivacy(input);
    assert.equal(result.allowed, false);
    assert.equal(result.nextState, 'privacy_lock');
    assert.equal(result.reason, 'invalid_input_fail_closed');
  }
});

test('privacy command fast path recognizes canonical Arabic English and German phrases', () => {
  assert.equal(detectPrivacyIntent('لا تراقبني')?.event, 'lock_privacy');
  assert.equal(detectPrivacyIntent('غَمِّض عيونك!')?.event, 'stop_visual');
  assert.equal(detectPrivacyIntent('افتح عيونك')?.event, 'resume_visual');
  assert.equal(detectPrivacyIntent('Stop monitoring me.')?.event, 'lock_privacy');
  assert.equal(detectPrivacyIntent('KAMERA AUS!')?.event, 'stop_visual');
  assert.equal(detectPrivacyIntent('Augen auf')?.event, 'resume_visual');
});

test('privacy fast path uses exact phrase matching to avoid accidental state changes', () => {
  for (const text of [
    'صديقي قال لا تراقبني أمس',
    'هل يمكنك شرح معنى افتح عيونك؟',
    'camera off is a setting name',
    'ich sagte gestern kamera aus',
    '',
    'x'.repeat(513),
  ]) {
    assert.equal(detectPrivacyIntent(text), null);
  }
});
