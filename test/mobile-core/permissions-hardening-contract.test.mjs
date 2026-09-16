import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const controller = fs.readFileSync(
  'src/features/permissions/hooks/usePermissionController.ts',
  'utf8',
);
const foregroundRefresh = fs.readFileSync(
  'src/features/permissions/hooks/useRefreshPermissionsOnForeground.ts',
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
const nativeSettingsService = fs.readFileSync(
  'src/features/permissions/services/NativePermissionSettingsService.ts',
  'utf8',
);
const permissionRow = fs.readFileSync(
  'src/features/settings/components/PermissionRow.tsx',
  'utf8',
);
const permissionList = fs.readFileSync(
  'src/features/settings/components/SettingsPermissionList.tsx',
  'utf8',
);
const settingsScreen = fs.readFileSync(
  'src/features/settings/SettingsScreen.tsx',
  'utf8',
);
const appServices = fs.readFileSync(
  'src/core/composition/AppServices.ts',
  'utf8',
);
const settingsRoute = fs.readFileSync(
  'src/app/settings.tsx',
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
      ) ?? []).length >= 5,
    );
  },
);

test(
  'stale permission operations cannot release locks owned by a newer service revision',
  () => {
    assert.ok(
      (controller.match(
        /revision === serviceRevisionRef\.current/g,
      ) ?? []).length >= 3,
    );
    assert.match(
      controller,
      /refreshLockRef\.current = false/,
    );
    assert.match(
      controller,
      /requestLockRef\.current = false/,
    );
    assert.match(
      controller,
      /settingsLockRef\.current = false/,
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
  'permanent permission denial exposes a serialized app-settings recovery action',
  () => {
    assert.match(
      controller,
      /settingsService\.openAppSettings\(\)/,
    );
    assert.match(
      controller,
      /setOpeningSettingsId\(id\)/,
    );
    assert.match(
      controller,
      /setErrorCode\('settings'\)/,
    );
    assert.match(
      permissionRow,
      /permission\.status === 'denied'\s*&&\s*!permission\.canAskAgain/,
    );
    assert.match(
      permissionRow,
      /canRequest \|\| canOpenSettings/,
    );
    assert.match(
      nativeSettingsService,
      /await Linking\.openSettings\(\)/,
    );
  },
);

test(
  'permission settings recovery is composed without leaking native linking into UI',
  () => {
    assert.match(
      appServices,
      /permissionSettingsService:\s*PermissionSettingsService/,
    );
    assert.match(
      appServices,
      /new NativePermissionSettingsService\(\)/,
    );
    assert.match(
      settingsRoute,
      /appServices\.permissionSettingsService/,
    );
    assert.match(
      settingsScreen,
      /usePermissionController\(\s*permissionService,\s*permissionSettingsService,?\s*\)/,
    );
    assert.match(
      permissionList,
      /onOpenSettings=\{\(\) => onOpenSettings\(permission\.id\)\}/,
    );
    assert.doesNotMatch(permissionRow, /Linking\./);
    assert.doesNotMatch(settingsScreen, /Linking\./);
  },
);

test(
  'permission state refreshes through lifecycle composition after returning from system settings',
  () => {
    assert.match(
      foregroundRefresh,
      /useLifecycle\(\)/,
    );
    assert.match(
      foregroundRefresh,
      /phase !== 'active'/,
    );
    assert.match(
      foregroundRefresh,
      /lastChangedAt === 0/,
    );
    assert.match(
      foregroundRefresh,
      /void refresh\(\)/,
    );
    assert.match(
      settingsScreen,
      /useRefreshPermissionsOnForeground\(\s*permissions\.refresh,?\s*\)/,
    );
    assert.doesNotMatch(controller, /AppState/);
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

    const notificationBranchIndex =
      nativeService.indexOf(
        "if (id === 'notifications')",
      );
    const notificationRequestIndex =
      nativeService.lastIndexOf(
        'await requestNotificationPermission()',
      );
    const exhaustiveIndex =
      nativeService.indexOf(
        'const exhaustiveId: never = id',
      );

    assert.ok(notificationBranchIndex >= 0);
    assert.ok(notificationRequestIndex > notificationBranchIndex);
    assert.ok(exhaustiveIndex > notificationRequestIndex);
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
