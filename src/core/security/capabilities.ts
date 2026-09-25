export const MUDRIK_CAPABILITIES = [
  'camera.observe',
  'microphone.listen',
  'location.read',
  'presence.read',
  'health.read.heart_rate',
  'health.read.ecg',
  'health.read.oxygen',
  'health.read.motion',
  'health.read.respiratory',
  'emergency.location.read',
  'emergency.medical_profile.read',
  'emergency.contact.notify',
  'emergency.call.initiate',
  'filesystem.read',
  'filesystem.write',
  'terminal.execute',
  'git.read',
  'git.write',
  'network.request',
  'browser.control',
  'screen.capture',
  'clipboard.read',
  'clipboard.write',
  'device.control',
  'device.locate',
  'device.ring',
  'app.open',
  'app.close',
  'media.control',
  'media.search',
  'media.transfer',
  'game.launch',
  'display.render',
  'display.companion.move',
  'home.light.control',
  'home.device.control',
  'secret.use',
  'security.session.revoke',
  'security.device.revoke',
  'security.capability.revoke',
] as const;

export type CapabilityId = (typeof MUDRIK_CAPABILITIES)[number];

const CAPABILITY_SET: ReadonlySet<string> = new Set(MUDRIK_CAPABILITIES);

export function isCapabilityId(value: unknown): value is CapabilityId {
  return typeof value === 'string' && CAPABILITY_SET.has(value);
}
