import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const profileController = fs.readFileSync(
  'src/features/companion/hooks/useCompanionProfileController.ts',
  'utf8',
);
const sessionController = fs.readFileSync(
  'src/features/companion/hooks/useCompanionSessionController.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);

const {
  getCompanionPhaseTranslationKey,
} = loadTypeScriptModule(
  'src/features/companion/getCompanionPhaseTranslationKey.ts',
);

test(
  'companion profile controller exposes typed failures and synchronous mutation exclusion',
  () => {
    assert.match(
      profileController,
      /useState<CompanionProfileErrorCode \| null>/,
    );
    assert.match(profileController, /mutationInFlightRef/);
    assert.match(profileController, /if \(mutationInFlightRef\.current\)/);
    assert.match(profileController, /Promise<boolean>/);
    assert.match(profileController, /setLoadFailed\(true\)/);
    assert.match(profileController, /diagnosticsService\.record/);

    for (const code of [
      'load-failed',
      'name-required',
      'save-failed',
      'reset-failed',
    ]) {
      assert.match(
        profileController,
        new RegExp(`setError\\('${code}'\\)`),
      );
    }

    assert.doesNotMatch(profileController, /Unable to /);
    assert.doesNotMatch(profileController, /Companion name cannot be empty/);
    assert.doesNotMatch(profileController, /await Promise\.resolve/);
  },
);

test(
  'companion profile controller discards stale async results across reload source changes and unmount',
  () => {
    assert.match(profileController, /mountedRef/);
    assert.match(profileController, /sourceRevisionRef/);
    assert.match(profileController, /loadRequestIdRef/);
    assert.match(profileController, /mutationIdRef/);
    assert.match(
      profileController,
      /sourceRevisionRef\.current === sourceRevision/,
    );
    assert.match(
      profileController,
      /loadRequestIdRef\.current === requestId/,
    );
    assert.match(
      profileController,
      /mutationIdRef\.current === mutationId/,
    );
    assert.match(
      profileController,
      /loadRequestIdRef\.current \+= 1;/,
    );
    assert.match(
      profileController,
      /mountedRef\.current = false;/,
    );
    assert.match(
      profileController,
      /if \(!isCurrent\(\)\) \{\s*return(?: false)?;/s,
    );
  },
);

test(
  'companion session controller keeps provider details out of UI state',
  () => {
    assert.match(
      sessionController,
      /useState<CompanionSessionErrorCode \| null>/,
    );
    assert.match(sessionController, /setError\('session-failed'\)/);
    assert.match(sessionController, /diagnosticsService\.record/);
    assert.doesNotMatch(sessionController, /useState<string \| null>/);
  },
);

test(
  'every companion session phase resolves to a localization key',
  () => {
    assert.deepEqual(
      [
        'idle',
        'listening',
        'processing',
        'speaking',
        'paused',
        'interrupted',
        'error',
      ].map(getCompanionPhaseTranslationKey),
      [
        'companionPhaseIdle',
        'companionPhaseListening',
        'companionPhaseProcessing',
        'companionPhaseSpeaking',
        'companionPhasePaused',
        'companionPhaseInterrupted',
        'companionPhaseError',
      ],
    );
  },
);

test(
  'companion modular translations are part of the shared translation catalog',
  () => {
    assert.match(
      translationCatalog,
      /CompanionTranslationKey/,
    );
    assert.equal(
      translationCatalog.match(/\.\.\.companionTranslations\./g)?.length,
      3,
    );
  },
);
