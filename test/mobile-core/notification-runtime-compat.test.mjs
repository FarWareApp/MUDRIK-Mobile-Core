import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return fs.readFileSync(
    new URL(relativePath, import.meta.url),
    'utf8',
  );
}

const presentationSource =
  read(
    '../../src/features/notifications/services/configureNotificationPresentation.ts',
  );

const serviceSource =
  read(
    '../../src/features/notifications/services/ExpoNotificationService.ts',
  );

const permissionSource =
  read(
    '../../src/features/permissions/services/NativePermissionService.ts',
  );

const supportSource =
  read(
    '../../src/features/notifications/services/notificationRuntimeSupport.ts',
  );

const notificationBootstrapSources = [
  presentationSource,
  serviceSource,
  permissionSource,
];

test('notification bootstrap never statically evaluates expo-notifications', () => {
  for (const source of notificationBootstrapSources) {
    assert.doesNotMatch(
      source,
      /import\s+\*\s+as\s+\w+\s+from\s+['"]expo-notifications['"];/,
    );

    assert.doesNotMatch(
      source,
      /import\s+\{[^}]*\}\s+from\s+['"]expo-notifications['"];/s,
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

  const permissionGuards =
    permissionSource.match(
      /if\s*\(!supportsNativeNotificationModule\(\)\)\s*\{/g,
    ) ?? [];

  assert.equal(
    permissionGuards.length,
    2,
  );
});

test('unsupported notification permission state is truthful and non-requestable', () => {
  assert.match(
    permissionSource,
    /status:\s*['"]unavailable['"]/,
  );

  assert.match(
    permissionSource,
    /canAskAgain:\s*false/,
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
