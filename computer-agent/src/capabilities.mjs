export const CAPABILITIES = Object.freeze([
  'terminal.read',
  'terminal.execute',
  'filesystem.read',
  'filesystem.write',
  'filesystem.delete',
  'git.read',
  'git.write',
  'process.read',
  'process.start',
  'process.stop',
  'browser.read',
  'browser.control',
  'screen.capture',
  'network.outbound',
  'clipboard.read',
  'clipboard.write',
  'secrets.use',
  'system.settings',
  'system.admin',
]);

const CAPABILITY_SET =
  new Set(CAPABILITIES);

export const CAPABILITY_MIN_RISK =
  Object.freeze({
    'terminal.read': 'low',
    'terminal.execute': 'medium',
    'filesystem.read': 'low',
    'filesystem.write': 'medium',
    'filesystem.delete': 'high',
    'git.read': 'low',
    'git.write': 'medium',
    'process.read': 'low',
    'process.start': 'medium',
    'process.stop': 'high',
    'browser.read': 'low',
    'browser.control': 'medium',
    'screen.capture': 'high',
    'network.outbound': 'medium',
    'clipboard.read': 'high',
    'clipboard.write': 'medium',
    'secrets.use': 'high',
    'system.settings': 'high',
    'system.admin': 'critical',
  });

export function isKnownCapability(value) {
  return (
    typeof value === 'string'
    && CAPABILITY_SET.has(value)
  );
}

export function capabilityMinimumRisk(
  capability,
) {
  return (
    isKnownCapability(capability)
      ? CAPABILITY_MIN_RISK[
          capability
        ]
      : null
  );
}

export function assertKnownCapabilities(
  values,
) {
  if (
    !Array.isArray(values)
    || values.length === 0
  ) {
    throw new Error(
      'At least one capability is required.',
    );
  }

  for (const value of values) {
    if (!isKnownCapability(value)) {
      throw new Error(
        `Unknown capability: ${String(value)}`,
      );
    }
  }
}
