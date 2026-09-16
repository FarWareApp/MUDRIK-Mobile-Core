import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const controller = fs.readFileSync(
  'src/features/permissions/hooks/usePermissionController.ts',
  'utf8',
);
const normalizer = fs.readFileSync(
  'src/features/permissions/normalizePermissionRecord.ts',
  'utf8',
);
const nativeService = fs.readFileSync(
  'src/features/permissions/services/NativePermissionService.ts',
  'utf8',
);

test(
  'permission controller invalidates stale async completions across service changes and unmount',
  () => {
    assert.match(controller, /mountedRef\s*=\s*useRef\(false\)/);
    assert.match(controller, /serviceRevisionRef\s*=\s*useRef\(0\)/);
    assert.match(controller, /mountedRef\.current\s*=\s*false/);
    assert.ok(
      (controller.match(/serviceRevisionRef\.current \+= 1/g) ?? [])
        .length >= 3,
    );
    assert.ok(
      (controller.match(
        /revision !== serviceRevisionRef\.current/g,
      ) ?? []).length >= 3,
    );
  },
);

test(
  'stale permission operations cannot release locks owned by a newer service revision',
  () => {
    assert.ok(
      (controller.match(
        /revision === serviceRevisionRef\.current/g,
      ) ?? []).length >= 2,
    );
    assert.match(
      controller,
      /refreshLockRef\.current = false/,
    );
    assert.match(
      controller,
      /requestLockRef\.current = false/,
    );
    assert.match(controller, /void refresh\(\)/);
  },
);

test(
  'permission request result must match the requested permission id',
  () => {
    assert.match(
      controller,
      /if \(result\.id !== id\)/,
    );
    assert.match(
      controller,
      /setErrorCode\('request'\)/,
    );
  },
);

test(
  'native permission re-prompt capability is explicit rather than optimistic',
  () => {
    assert.match(
      normalizer,
      /canAskAgain:\s*boolean/,
    );
    assert.match(
      normalizer,
      /canAskAgain:\s*result\.canAskAgain/,
    );
    assert.doesNotMatch(
      normalizer,
      /canAskAgain\s*\?\?\s*true/,
    );
    assert.doesNotMatch(
      normalizer,
      /canAskAgain\?:/,
    );
  },
);

test(
  'native permission request routing is exhaustive',
  () => {
    for (const id of [
      'microphone',
      'camera',
      'media-library',
      'notifications',
    ]) {
      assert.match(
        nativeService,
        new RegExp(`id === '${id}'`),
      );
    }

    assert.match(
      nativeService,
      /const exhaustiveId:\s*never = id/,
    );
    assert.doesNotMatch(
      nativeService,
      /return normalizePermissionRecord\(\s*id,\s*await requestNotificationPermission\(\),\s*\);\s*\}/,
    );
  },
);

test(
  'permission controller keeps caught native failures sanitized',
  () => {
    assert.doesNotMatch(controller, /console\./);
    assert.doesNotMatch(controller, /catch\s*\([^)]/);
    assert.doesNotMatch(controller, /String\(error\)|error\.message/);
  },
);
