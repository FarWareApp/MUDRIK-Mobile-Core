import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/settings/SettingsScreen.tsx',
  'utf8',
);
const provider = fs.readFileSync(
  'src/core/settings/AppSettingsProvider.tsx',
  'utf8',
);
const permissionController = fs.readFileSync(
  'src/features/permissions/hooks/usePermissionController.ts',
  'utf8',
);
const permissionMapper = fs.readFileSync(
  'src/features/permissions/getPermissionErrorTranslationKey.ts',
  'utf8',
);
const permissionTranslations = fs.readFileSync(
  'src/core/localization/permissionTranslations.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/settings/components/SettingsScreenHeader.tsx',
  'utf8',
);
const backIcon = fs.readFileSync(
  'src/features/settings/components/SettingsBackIcon.tsx',
  'utf8',
);
const optionGroup = fs.readFileSync(
  'src/features/settings/components/SettingOptionGroup.tsx',
  'utf8',
);
const toggleRow = fs.readFileSync(
  'src/features/settings/components/SettingToggleRow.tsx',
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
const state = fs.readFileSync(
  'src/features/settings/components/SettingsScreenState.tsx',
  'utf8',
);

function countKey(source, key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return source.match(pattern)?.length ?? 0;
}

test(
  'settings persistence blocks overlapping mutations and commits durable state before presentation',
  () => {
    assert.match(provider, /const \[busy, setBusy\] = useState\(false\)/);
    assert.match(provider, /const mutationLockRef = useRef\(false\)/);
    assert.match(provider, /const loadLockRef = useRef\(false\)/);
    assert.match(provider, /mutationLockRef\.current = true/);
    assert.match(provider, /await repository\.set\(key, value\);[\s\S]*?setSettings/);
    assert.doesNotMatch(
      provider,
      /const previous =\s*settings\[key\]/,
    );
    assert.match(provider, /busy,/);
  },
);

test(
  'permission controller exposes typed failures and request locking without raw UI copy',
  () => {
    assert.match(permissionController, /export type PermissionErrorCode/);
    assert.match(permissionController, /requestLockRef = useRef\(false\)/);
    assert.match(permissionController, /refreshLockRef = useRef\(false\)/);
    assert.match(permissionController, /setErrorCode\('load'\)/);
    assert.match(permissionController, /setErrorCode\('request'\)/);
    assert.match(permissionController, /requestingId/);
    assert.doesNotMatch(permissionController, /Unable to /);
    assert.match(permissionMapper, /PermissionTranslationKey/);
  },
);

test(
  'settings screen keeps the header stable, surfaces permission failures and locks mutable controls',
  () => {
    assert.match(screen, /<SettingsScreenHeader \/>/);
    assert.match(screen, /settings\.loading \?/);
    assert.match(screen, /getPermissionErrorTranslationKey/);
    assert.match(screen, /permissions\.errorCode === 'load'/);
    assert.match(screen, /const mutableDisabled/);
    assert.match(screen, /disabled=\{mutableDisabled\}/);
    assert.match(screen, /requestingId=\{permissions\.requestingId\}/);
    assert.match(screen, /showsVerticalScrollIndicator=\{false\}/);
  },
);

test(
  'settings header and controls use premium stable primitives, semantic roles and design motion',
  () => {
    assert.match(header, /SettingsBackIcon/);
    assert.match(header, /isRTL/);
    assert.match(header, /motion\.press\.subtleScale/);
    assert.match(header, /typeScale\.heading/);
    assert.doesNotMatch(header, /[‹›]/u);
    assert.doesNotMatch(backIcon, /\bText\b/);
    assert.match(backIcon, /scaleX:\s*-1/);

    assert.match(optionGroup, /accessibilityRole="radiogroup"/);
    assert.match(optionGroup, /accessibilityRole="radio"/);
    assert.match(optionGroup, /motion\.press\.subtleScale/);
    assert.match(optionGroup, /writingDirection:\s*'auto'/);

    assert.match(toggleRow, /paddingEnd:\s*spacing\.lg/);
    assert.doesNotMatch(toggleRow, /paddingRight/);
    assert.match(toggleRow, /typeScale\.caption/);
  },
);

test(
  'permission presentation exposes progress, busy state and status hierarchy accessibly',
  () => {
    assert.match(permissionList, /accessibilityRole="progressbar"/);
    assert.match(permissionList, /accessibilityLiveRegion="polite"/);
    assert.match(permissionList, /loadingPermissions/);
    assert.match(permissionRow, /accessibilityState=\{\{/);
    assert.match(permissionRow, /busy:\s*requesting/);
    assert.match(permissionRow, /ActivityIndicator/);
    assert.match(permissionRow, /statusBadge/);
    assert.match(permissionRow, /paddingEnd:\s*spacing\.md/);
    assert.match(state, /accessibilityRole="progressbar"/);
  },
);

test(
  'permission localization is modular and composed into all locales',
  () => {
    for (const key of [
      'permissionsLoadFailed',
      'permissionRequestFailed',
      'loadingPermissions',
    ]) {
      assert.equal(
        countKey(permissionTranslations, key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }

    for (const locale of ['ar', 'de', 'en']) {
      assert.match(
        translationCatalog,
        new RegExp(
          `${locale}: \\{[\\s\\S]*?\\.\\.\\.permissionTranslations\\.${locale}`,
        ),
      );
    }
  },
);
