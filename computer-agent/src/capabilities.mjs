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

const CAPABILITY_SET = new Set(CAPABILITIES);

export function isKnownCapability(value) {
  return typeof value === 'string' && CAPABILITY_SET.has(value);
}

export function assertKnownCapabilities(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('At least one capability is required.');
  }

  for (const value of values) {
    if (!isKnownCapability(value)) {
      throw new Error(`Unknown capability: ${String(value)}`);
    }
  }
}
