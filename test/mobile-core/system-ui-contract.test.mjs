import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rootProviders = fs.readFileSync(
  'src/core/composition/RootProviders.tsx',
  'utf8',
);
const chatScreen = fs.readFileSync(
  'src/features/chat/ChatScreen.tsx',
  'utf8',
);
const rootLayout = fs.readFileSync(
  'src/app/_layout.tsx',
  'utf8',
);
const appConfig = JSON.parse(
  fs.readFileSync('app.json', 'utf8'),
);

test(
  'root composition provides safe-area context before application providers',
  () => {
    assert.match(
      rootProviders,
      /react-native-safe-area-context/,
    );
    assert.match(
      rootProviders,
      /<SafeAreaProvider>/,
    );

    const safeAreaIndex = rootProviders.indexOf(
      '<SafeAreaProvider>',
    );
    const storageIndex = rootProviders.indexOf(
      '<StorageBootstrapProvider>',
    );

    assert.ok(safeAreaIndex >= 0);
    assert.ok(storageIndex > safeAreaIndex);
  },
);

test(
  'chat screen keeps safe-area and keyboard avoidance responsibilities explicit',
  () => {
    assert.match(chatScreen, /\bSafeAreaView\b/);
    assert.match(chatScreen, /\bKeyboardAvoidingView\b/);
    assert.match(chatScreen, /Platform\.OS\s*===\s*'ios'/);
    assert.match(chatScreen, /\?\s*'padding'/);
    assert.match(chatScreen, /:\s*'height'/);
  },
);

test(
  'Android keyboard and back-navigation config stays on the reviewed stable path',
  () => {
    assert.equal(
      appConfig.expo.android.softwareKeyboardLayoutMode,
      'resize',
    );
    assert.equal(
      appConfig.expo.android.predictiveBackGestureEnabled,
      false,
    );
  },
);

test(
  'root navigation follows system status-bar appearance and reduced motion',
  () => {
    assert.match(
      rootLayout,
      /<StatusBar\s+style="auto"\s*\/>/,
    );
    assert.match(
      rootLayout,
      /animation:\s*reducedMotion/,
    );
    assert.match(
      rootLayout,
      /\?\s*'none'/,
    );
    assert.match(
      rootLayout,
      /:\s*'fade'/,
    );
  },
);

test(
  'app config avoids legacy static status-bar overrides that fight edge-to-edge',
  () => {
    const serialized = JSON.stringify(appConfig);

    for (const legacyKey of [
      'statusBarBackgroundColor',
      'statusBarTranslucent',
    ]) {
      assert.equal(
        serialized.includes(legacyKey),
        false,
      );
    }
  },
);
