import type {
  CapabilityId,
} from '../security/capabilities';

import type {
  DeviceMediaIntentKind,
} from './deviceMediaIntent';

const INTENT_CAPABILITY:
  Readonly<Record<DeviceMediaIntentKind, CapabilityId>> =
  Object.freeze({
    'media.play': 'media.control',
    'media.pause': 'media.control',
    'media.next': 'media.control',
    'media.previous': 'media.control',
    'media.seek': 'media.control',
    'media.set_volume': 'media.control',
    'media.transfer_session': 'media.transfer',
    'tv.channel.next': 'media.control',
    'tv.channel.set': 'media.control',
    'app.open': 'app.open',
    'app.close': 'app.close',
    'content.search': 'media.search',
    'content.play': 'media.control',
    'game.launch': 'game.launch',
    'device.focus': 'device.control',
    'display.companion.move':
      'display.companion.move',
  });

export function capabilityForDeviceMediaIntent(
  kind: DeviceMediaIntentKind,
): CapabilityId {
  return INTENT_CAPABILITY[kind];
}
