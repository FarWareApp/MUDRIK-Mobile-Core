import type {
  CapabilityId,
} from '../security/capabilities';

import type {
  DeviceFindingRequestKind,
} from './deviceFindingRequest';

const REQUEST_CAPABILITY:
  Readonly<Record<DeviceFindingRequestKind, CapabilityId>> =
  Object.freeze({
    'device.locate': 'device.locate',
    'device.ring': 'device.ring',
    'device.guidance': 'device.locate',
  });

export function capabilityForDeviceFindingRequest(
  kind: DeviceFindingRequestKind,
): CapabilityId {
  return REQUEST_CAPABILITY[kind];
}
