import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const policy = loadTypeScriptModule(
  'src/core/voice/bargeInPolicy.ts',
);

function evidence(overrides = {}) {
  return {
    assistantSpeaking: true,
    inputAuthorized: true,
    speechActive: true,
    speechDurationMs: 260,
    vadConfidence: 0.95,
    echoState: 'clear',
    hasLexicalEvidence: true,
    hypothesisStability: 0.9,
    ...overrides,
  };
}

test('clear authorized user speech can qualify as barge-in', () => {
  const decision = policy.qualifyBargeIn(evidence());
  assert.equal(decision.interrupt, true);
  assert.equal(decision.reason, 'interrupt');
});

test('barge-in refuses inactive unauthorized short or low-confidence speech', () => {
  const cases = [
    [
      { assistantSpeaking: false },
      'assistant_not_speaking',
    ],
    [
      { inputAuthorized: false },
      'input_not_authorized',
    ],
    [
      { speechActive: false },
      'speech_inactive',
    ],
    [
      { speechDurationMs: 50 },
      'insufficient_speech',
    ],
    [
      { vadConfidence: 0.2 },
      'insufficient_confidence',
    ],
  ];

  for (const [overrides, reason] of cases) {
    const decision = policy.qualifyBargeIn(evidence(overrides));
    assert.equal(decision.interrupt, false);
    assert.equal(decision.reason, reason);
  }
});

test('possible or unknown echo requires stronger lexical and stability evidence', () => {
  for (const echoState of ['possible_echo', 'unknown']) {
    const weak = policy.qualifyBargeIn(
      evidence({
        echoState,
        hasLexicalEvidence: false,
      }),
    );
    assert.equal(weak.interrupt, false);
    assert.equal(weak.reason, 'echo_not_disambiguated');

    const unstable = policy.qualifyBargeIn(
      evidence({
        echoState,
        hypothesisStability: 0.2,
      }),
    );
    assert.equal(unstable.interrupt, false);
    assert.equal(unstable.reason, 'echo_not_disambiguated');

    const qualified = policy.qualifyBargeIn(
      evidence({
        echoState,
        speechDurationMs: 300,
        vadConfidence: 0.9,
        hasLexicalEvidence: true,
        hypothesisStability: 0.9,
      }),
    );
    assert.equal(qualified.interrupt, true);
  }
});

test('barge-in input is strict and rejects hostile or malformed evidence', () => {
  for (const value of [
    null,
    evidence({ vadConfidence: Number.NaN }),
    evidence({ hypothesisStability: 2 }),
    evidence({ echoState: 'disabled' }),
    { ...evidence(), rawAudio: 'forbidden' },
  ]) {
    const decision = policy.qualifyBargeIn(value);
    assert.equal(decision.interrupt, false);
    assert.equal(decision.reason, 'invalid_input');
  }
});
