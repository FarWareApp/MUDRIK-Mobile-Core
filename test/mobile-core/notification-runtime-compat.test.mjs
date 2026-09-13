import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const presentationSource =
  fs.readFileSync(
    new URL(
      '../../src/features/notifications/services/configureNotificationPresentation.ts',
      import.meta.url,
    ),
    'utf8',
  );

const serviceSource =
  fs.readFileSync(
    new URL(
      '../../src/features/notifications/services/ExpoNotificationService.ts',
      import.meta.url,
    ),
    'utf8',
  );

const supportSource =
  fs.readFileSync(
    new URL(
      '../../src/features/notifications/services/notificationRuntimeSupport.ts',
      import.meta.url,
    ),
    'utf8',
  );

test('notification bootstrap never statically evaluates expo-notifications', () => {
  for (const source of [
    presentationSource,
    serviceSource,
  ]) {
    assert.doesNotMatch(
      source,
      /import\s+\*\s+as\s+\w+\s+from\s+['"]expo-notifications['"];/,
    );

    assert.match(
      source,
      /import\(['"]expo-notifications['"]\)/,
    );
  }
});

test('Expo Go and web are rejected before native notification module loading', () => {
  assert.match(
    supportSource,
    /Platform\.OS\s*===\s*['"]web['"]/,
  );

  assert.match(
    supportSource,
    /ExecutionEnvironment\.StoreClient/,
  );

  assert.match(
    presentationSource,
    /if\s*\(!supportsNativeNotificationModule\(\)\)\s*\{\s*return;/s,
  );

  assert.match(
    serviceSource,
    /if\s*\(!supportsNativeNotificationModule\(\)\)\s*\{\s*return null;/s,
  );
});

test('unsupported runtimes fail truthful notification creation instead of faking success', () => {
  assert.match(
    serviceSource,
    /Native notifications are unavailable in this runtime/,
  );

  assert.match(
    serviceSource,
    /await this\.requireNotifications\(\)/,
  );
});
