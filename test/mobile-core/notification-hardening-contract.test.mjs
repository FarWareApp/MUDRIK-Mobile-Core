import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const provider = fs.readFileSync(
  'src/features/notifications/NotificationProvider.tsx',
  'utf8',
);
const bridge = fs.readFileSync(
  'src/features/notifications/components/NotificationNavigationBridge.tsx',
  'utf8',
);
const errorContract = fs.readFileSync(
  'src/features/notifications/NotificationErrorCode.ts',
  'utf8',
);
const routeResolver = fs.readFileSync(
  'src/features/notifications/resolveNotificationRoute.ts',
  'utf8',
);

test(
  'notification provider exposes typed failures and serializes response consumption',
  () => {
    assert.match(
      errorContract,
      /'initialize'[\s\S]*?'consume'/,
    );
    assert.match(provider, /NotificationErrorCode/);
    assert.match(
      provider,
      /const consumeLockRef = useRef\(false\)/,
    );
    assert.match(
      provider,
      /if \(!response \|\| consumeLockRef\.current\)/,
    );
    assert.match(provider, /setError\('initialize'\)/);
    assert.match(provider, /setError\('consume'\)/);
    assert.doesNotMatch(
      provider,
      /Unable to initialize notifications/,
    );
  },
);

test(
  'notification response remains in memory until native clearing succeeds',
  () => {
    assert.match(
      provider,
      /await service\.clearLastResponse\(\);[\s\S]*?setLastResponse/,
    );
    assert.doesNotMatch(
      provider,
      /setLastResponse\(null\);[\s\S]*?await service\.clearLastResponse\(\)/,
    );
    assert.match(
      provider,
      /if \(current !== response\) \{[\s\S]*?return current;/,
    );
    assert.match(
      provider,
      /if \(lastResponseRef\.current === response\)/,
    );
  },
);

test(
  'notification diagnostics avoid recording notification identifiers or raw failures',
  () => {
    assert.doesNotMatch(
      provider,
      /received:\$\{event\.id\}/,
    );
    assert.doesNotMatch(
      provider,
      /response:\$\{event\.notification\.id\}/,
    );
    assert.doesNotMatch(bridge, /caught\.message/);
    assert.match(provider, /'response-consume-failed'/);
    assert.match(bridge, /'navigation-failed'/);
  },
);

test(
  'navigation failures preserve the pending notification response for recovery',
  () => {
    assert.doesNotMatch(bridge, /finally\s*\{/);
    assert.match(
      bridge,
      /catch \{[\s\S]*?'navigation-failed'[\s\S]*?return;[\s\S]*?\}[\s\S]*?consume\(\);/,
    );
    assert.match(
      bridge,
      /if \(!route\) \{[\s\S]*?'ignored-invalid-route'[\s\S]*?consume\(\);[\s\S]*?return;/,
    );
  },
);

test(
  'notification routes remain a strict allowlist and project ids are normalized',
  () => {
    assert.match(
      routeResolver,
      /Array\.isArray\(data\)/,
    );
    assert.match(
      routeResolver,
      /normalizeProjectId\([\s\S]*?record\.projectId/,
    );
    assert.match(routeResolver, /target === 'home'/);
    assert.match(routeResolver, /target === 'conversations'/);
    assert.match(routeResolver, /target === 'projects'/);
    assert.match(routeResolver, /target === 'settings'/);
    assert.match(routeResolver, /target === 'companion'/);
    assert.match(routeResolver, /target === 'voice'/);
    assert.match(routeResolver, /return null;/);
  },
);
