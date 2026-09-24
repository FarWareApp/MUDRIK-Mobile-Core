import type { CapabilityId } from './capabilities';

export type CapabilityRisk = 'low' | 'medium' | 'high' | 'critical';

export const CAPABILITY_RISK: Readonly<Record<CapabilityId, CapabilityRisk>> = {
  'camera.observe': 'high',
  'microphone.listen': 'high',
  'location.read': 'high',
  'presence.read': 'high',
  'health.read.heart_rate': 'high',
  'health.read.ecg': 'high',
  'health.read.oxygen': 'high',
  'health.read.motion': 'high',
  'health.read.respiratory': 'high',
  'emergency.location.read': 'high',
  'emergency.contact.notify': 'high',
  'emergency.call.initiate': 'critical',
  'filesystem.read': 'medium',
  'filesystem.write': 'high',
  'terminal.execute': 'high',
  'git.read': 'medium',
  'git.write': 'high',
  'network.request': 'medium',
  'browser.control': 'high',
  'screen.capture': 'high',
  'clipboard.read': 'high',
  'clipboard.write': 'medium',
  'device.control': 'high',
  'device.locate': 'high',
  'device.ring': 'medium',
  'app.open': 'low',
  'app.close': 'medium',
  'media.control': 'low',
  'media.search': 'low',
  'media.transfer': 'medium',
  'game.launch': 'low',
  'display.render': 'low',
  'display.companion.move': 'low',
  'home.light.control': 'medium',
  'home.device.control': 'high',
  'secret.use': 'critical',
  'security.session.revoke': 'critical',
  'security.device.revoke': 'critical',
  'security.capability.revoke': 'critical',
};

export function getCapabilityRisk(capability: CapabilityId): CapabilityRisk {
  return CAPABILITY_RISK[capability];
}
