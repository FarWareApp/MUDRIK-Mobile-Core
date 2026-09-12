const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      '.expo/**',
    ],
    rules: {
      // MUDRIK providers intentionally hydrate React state from SQLite,
      // OS permissions and native service repositories inside effects.
      // Those effects synchronize external systems with React state and
      // are reviewed separately for cancellation/stale-result handling.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
