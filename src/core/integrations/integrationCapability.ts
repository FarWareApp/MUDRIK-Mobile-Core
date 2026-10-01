import type {
  CapabilityId,
} from '../security/capabilities';

export type IntegrationCapabilityId =
  | 'state.read'
  | 'power.set'
  | 'level.set'
  | 'color.set'
  | 'thermostat.set'
  | 'media.control'
  | 'access.lock'
  | 'access.unlock'
  | 'access.open'
  | 'security.arm'
  | 'security.disarm'
  | 'camera.observe'
  | 'microphone.listen'
  | 'commerce.purchase';

export type IntegrationRisk =
  | 'read_only'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type IntegrationApprovalMode =
  | 'none'
  | 'explicit'
  | 'specialized';

export type IntegrationCapabilityDefinition =
  Readonly<{
    capability: IntegrationCapabilityId;
    risk: IntegrationRisk;
    approvalMode: IntegrationApprovalMode;
    requiredMudrikCapability:
      CapabilityId | null;
    instantEligible: boolean;
  }>;

const DEFINITIONS:
  Readonly<Record<
    IntegrationCapabilityId,
    IntegrationCapabilityDefinition
  >> = Object.freeze({
    'state.read': Object.freeze({
      capability: 'state.read',
      risk: 'read_only',
      approvalMode: 'none',
      requiredMudrikCapability:
        'home.device.read',
      instantEligible: true,
    }),
    'power.set': Object.freeze({
      capability: 'power.set',
      risk: 'low',
      approvalMode: 'none',
      requiredMudrikCapability:
        'home.device.control',
      instantEligible: true,
    }),
    'level.set': Object.freeze({
      capability: 'level.set',
      risk: 'low',
      approvalMode: 'none',
      requiredMudrikCapability:
        'home.light.control',
      instantEligible: true,
    }),
    'color.set': Object.freeze({
      capability: 'color.set',
      risk: 'low',
      approvalMode: 'none',
      requiredMudrikCapability:
        'home.light.control',
      instantEligible: true,
    }),
    'thermostat.set': Object.freeze({
      capability: 'thermostat.set',
      risk: 'medium',
      approvalMode: 'none',
      requiredMudrikCapability:
        'home.device.control',
      instantEligible: true,
    }),
    'media.control': Object.freeze({
      capability: 'media.control',
      risk: 'low',
      approvalMode: 'none',
      requiredMudrikCapability:
        'media.control',
      instantEligible: true,
    }),
    'access.lock': Object.freeze({
      capability: 'access.lock',
      risk: 'high',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'home.access.control',
      instantEligible: false,
    }),
    'access.unlock': Object.freeze({
      capability: 'access.unlock',
      risk: 'critical',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'home.access.control',
      instantEligible: false,
    }),
    'access.open': Object.freeze({
      capability: 'access.open',
      risk: 'critical',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'home.access.control',
      instantEligible: false,
    }),
    'security.arm': Object.freeze({
      capability: 'security.arm',
      risk: 'high',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'home.security.control',
      instantEligible: false,
    }),
    'security.disarm': Object.freeze({
      capability: 'security.disarm',
      risk: 'critical',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'home.security.control',
      instantEligible: false,
    }),
    'camera.observe': Object.freeze({
      capability: 'camera.observe',
      risk: 'high',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'camera.observe',
      instantEligible: false,
    }),
    'microphone.listen': Object.freeze({
      capability: 'microphone.listen',
      risk: 'high',
      approvalMode: 'explicit',
      requiredMudrikCapability:
        'microphone.listen',
      instantEligible: false,
    }),
    'commerce.purchase': Object.freeze({
      capability: 'commerce.purchase',
      risk: 'critical',
      approvalMode: 'specialized',
      requiredMudrikCapability: null,
      instantEligible: false,
    }),
  });

export const INTEGRATION_CAPABILITIES =
  Object.freeze(
    Object.keys(DEFINITIONS) as IntegrationCapabilityId[],
  );

const CAPABILITIES =
  new Set<string>(
    INTEGRATION_CAPABILITIES,
  );

export function isIntegrationCapabilityId(
  value: unknown,
): value is IntegrationCapabilityId {
  return (
    typeof value === 'string'
    && CAPABILITIES.has(value)
  );
}

export function integrationCapabilityDefinition(
  capability: IntegrationCapabilityId,
): IntegrationCapabilityDefinition {
  return DEFINITIONS[capability];
}
