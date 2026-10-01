import {
  INTEGRATION_CAPABILITIES,
  integrationCapabilityDefinition,
} from '../../core/integrations/integrationCapability';
import type {
  IntegrationApprovalMode,
  IntegrationRisk,
} from '../../core/integrations/integrationCapability';
import {
  INTELLIGENCE_SERVICE_KINDS,
} from '../../core/intelligence/intelligenceProvider';
import {
  MEMORY_CATEGORIES,
} from '../../core/memory/memoryCategories';
import {
  MUDRIK_CAPABILITIES,
} from '../../core/security/capabilities';

export type CapabilityDomainSummary =
  Readonly<{
    domain: string;
    count: number;
  }>;

export type IntegrationCapabilitySummary =
  Readonly<{
    capability: string;
    risk: IntegrationRisk;
    approvalMode:
      IntegrationApprovalMode;
    instantEligible: boolean;
  }>;

function buildSecurityDomains():
  readonly CapabilityDomainSummary[] {
  const counts =
    new Map<string, number>();

  for (
    const capability
    of MUDRIK_CAPABILITIES
  ) {
    const [domain] =
      capability.split('.');

    counts.set(
      domain,
      (counts.get(domain) ?? 0)
        + 1,
    );
  }

  return Object.freeze(
    Array.from(
      counts.entries(),
    )
      .sort(([left], [right]) =>
        left.localeCompare(right),
      )
      .map(
        ([domain, count]) =>
          Object.freeze({
            domain,
            count,
          }),
      ),
  );
}

function buildIntegrationSummaries():
  readonly IntegrationCapabilitySummary[] {
  return Object.freeze(
    INTEGRATION_CAPABILITIES.map(
      (capability) => {
        const definition =
          integrationCapabilityDefinition(
            capability,
          );

        return Object.freeze({
          capability,
          risk: definition.risk,
          approvalMode:
            definition.approvalMode,
          instantEligible:
            definition.instantEligible,
        });
      },
    ),
  );
}

export const capabilityOverview =
  Object.freeze({
    securityCapabilities:
      MUDRIK_CAPABILITIES,
    securityDomains:
      buildSecurityDomains(),
    memoryCategories:
      MEMORY_CATEGORIES,
    intelligenceServices:
      INTELLIGENCE_SERVICE_KINDS,
    integrationCapabilities:
      buildIntegrationSummaries(),
  });
