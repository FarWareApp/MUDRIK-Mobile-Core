import {
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  CREDENTIAL_REF,
} from '../intelligence/intelligenceSecurity';

import {
  authorizeCapability,
  type CapabilityGrant,
} from './capabilityPolicy';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const CREDENTIAL_LEASE_ID =
  new RegExp(
    '^credential_lease_' + BODY + '$',
  );

export type CredentialLeaseRequest =
  Readonly<{
    leaseId: string;
    subjectId: string;
    credentialRef: string;
    operationRef: string;
    domain: string | null;
    background: boolean;
    requestedTtlMs: number;
    maxUses: number;
  }>;

export type CredentialUseLease =
  Readonly<{
    leaseId: string;
    subjectId: string;
    credentialRef: string;
    operationRef: string;
    domain: string | null;
    background: boolean;
    issuedAtMs: number;
    expiresAtMs: number;
    requestedTtlMs: number;
    maxUses: number;
    uses: number;
    secretGrantId: string;
    networkGrantId: string | null;
    revokedAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type CredentialBrokerDecision =
  Readonly<{
    accepted: boolean;
    reason:
      | 'issued'
      | 'consumed'
      | 'revoked'
      | 'invalid_input'
      | 'runtime_untrusted'
      | 'secret_capability_denied'
      | 'secret_scope_too_broad'
      | 'network_capability_denied'
      | 'lease_conflict'
      | 'lease_not_found'
      | 'lease_expired'
      | 'lease_revoked'
      | 'lease_exhausted'
      | 'binding_mismatch';
    lease: CredentialUseLease | null;
    credentialRef: string | null;
  }>;

function validDomain(
  value: string,
): boolean {
  return (
    value.length >= 1
    && value.length <= 253
    && !value.includes('/')
    && !value.includes('\\')
    && !value.includes('@')
    && !value.includes(':')
    && !value.includes('..')
    && value
      .split('.')
      .every(
        (label) =>
          label.length >= 1
          && label.length <= 63
          && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i
            .test(label),
      )
  );
}

function normalizeDomain(
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(/\.+$/, '');

  return validDomain(normalized)
    ? normalized
    : null;
}

function validRequest(
  request: CredentialLeaseRequest,
): boolean {
  const domain =
    normalizeDomain(request.domain);

  return (
    CREDENTIAL_LEASE_ID.test(
      request.leaseId,
    )
    && safeReference(
      request.subjectId,
      240,
    )
    && CREDENTIAL_REF.test(
      request.credentialRef,
    )
    && safeReference(
      request.operationRef,
      240,
    )
    && (
      request.domain === null
      || domain !== null
    )
    && typeof request.background
      === 'boolean'
    && safeInteger(
      request.requestedTtlMs,
    )
    && request.requestedTtlMs
      >= 1_000
    && request.requestedTtlMs
      <= 5 * 60 * 1000
    && safeInteger(request.maxUses)
    && request.maxUses >= 1
    && request.maxUses <= 8
  );
}

function decision(
  accepted: boolean,
  reason: CredentialBrokerDecision['reason'],
  lease: CredentialUseLease | null = null,
  credentialRef: string | null = null,
): CredentialBrokerDecision {
  return Object.freeze({
    accepted,
    reason,
    lease,
    credentialRef,
  });
}

function sameRequest(
  lease: CredentialUseLease,
  request: CredentialLeaseRequest,
  domain: string | null,
): boolean {
  return (
    lease.leaseId === request.leaseId
    && lease.subjectId === request.subjectId
    && lease.credentialRef
      === request.credentialRef
    && lease.operationRef
      === request.operationRef
    && lease.domain === domain
    && lease.background
      === request.background
    && lease.requestedTtlMs
      === request.requestedTtlMs
    && lease.maxUses === request.maxUses
  );
}

function findGrant(
  grants: readonly unknown[],
  grantId: string | undefined,
): CapabilityGrant | null {
  if (!grantId) {
    return null;
  }

  const value =
    grants.find(
      (candidate) =>
        typeof candidate === 'object'
        && candidate !== null
        && !Array.isArray(candidate)
        && (
          candidate as {
            grantId?: unknown;
          }
        ).grantId === grantId,
    );

  return (
    value
    && typeof value === 'object'
  )
    ? value as CapabilityGrant
    : null;
}

function grantExpiry(
  grant: CapabilityGrant | null,
): number | null {
  return (
    grant
    && typeof grant.expiresAtMs
      === 'number'
  )
    ? grant.expiresAtMs
    : null;
}

export class CredentialBroker {
  private readonly leases =
    new Map<string, CredentialUseLease>();

  issue(
    request: CredentialLeaseRequest,
    grants: readonly unknown[],
    runtimeTrusted: boolean,
    trustedNowMs: number,
  ): CredentialBrokerDecision {
    if (
      !validRequest(request)
      || !Array.isArray(grants)
      || grants.length > 4096
      || typeof runtimeTrusted !== 'boolean'
      || !safeInteger(trustedNowMs)
    ) {
      return decision(
        false,
        'invalid_input',
      );
    }

    if (!runtimeTrusted) {
      return decision(
        false,
        'runtime_untrusted',
      );
    }

    const domain =
      normalizeDomain(request.domain);
    const current =
      this.leases.get(request.leaseId);

    if (current) {
      return sameRequest(
        current,
        request,
        domain,
      )
        ? decision(
            true,
            'issued',
            current,
          )
        : decision(
            false,
            'lease_conflict',
            current,
          );
    }

    const secretDecision =
      authorizeCapability(
        {
          subjectId:
            request.subjectId,
          capability: 'secret.use',
          nowMs: trustedNowMs,
          resourceId:
            request.credentialRef,
          background:
            request.background,
          elevation: 'none',
        },
        grants,
        trustedNowMs,
      );

    if (!secretDecision.allowed) {
      return decision(
        false,
        'secret_capability_denied',
      );
    }

    const secretGrant =
      findGrant(
        grants,
        secretDecision.grantId,
      );

    if (
      !secretGrant
      || secretGrant.capability
        !== 'secret.use'
      || secretGrant.subjectId
        !== request.subjectId
      || secretGrant.scope?.resourceId
        !== request.credentialRef
    ) {
      return decision(
        false,
        'secret_scope_too_broad',
      );
    }

    let networkGrant:
      CapabilityGrant | null = null;

    if (domain !== null) {
      const networkDecision =
        authorizeCapability(
          {
            subjectId:
              request.subjectId,
            capability:
              'network.request',
            nowMs: trustedNowMs,
            domain,
            background:
              request.background,
            elevation: 'none',
          },
          grants,
          trustedNowMs,
        );

      if (!networkDecision.allowed) {
        return decision(
          false,
          'network_capability_denied',
        );
      }

      networkGrant =
        findGrant(
          grants,
          networkDecision.grantId,
        );

      if (
        !networkGrant
        || networkGrant.capability
          !== 'network.request'
        || networkGrant.subjectId
          !== request.subjectId
      ) {
        return decision(
          false,
          'network_capability_denied',
        );
      }
    }

    const expiries =
      [
        trustedNowMs
          + request.requestedTtlMs,
        grantExpiry(secretGrant),
        grantExpiry(networkGrant),
      ]
        .filter(
          (value): value is number =>
            value !== null,
        );

    const expiresAtMs =
      Math.min(...expiries);

    if (expiresAtMs <= trustedNowMs) {
      return decision(
        false,
        'secret_capability_denied',
      );
    }

    const lease =
      Object.freeze({
        leaseId: request.leaseId,
        subjectId: request.subjectId,
        credentialRef:
          request.credentialRef,
        operationRef:
          request.operationRef,
        domain,
        background:
          request.background,
        issuedAtMs: trustedNowMs,
        expiresAtMs,
        requestedTtlMs:
          request.requestedTtlMs,
        maxUses: request.maxUses,
        uses: 0,
        secretGrantId:
          secretGrant.grantId,
        networkGrantId:
          networkGrant?.grantId
          ?? null,
        revokedAtMs: null,
        grantsExecutionAuthority:
          false as const,
        grantsSensorAuthority:
          false as const,
        grantsApprovalAuthority:
          false as const,
        grantsCapabilityAuthority:
          false as const,
      });

    this.leases.set(
      lease.leaseId,
      lease,
    );

    return decision(
      true,
      'issued',
      lease,
    );
  }

  consume(
    leaseId: string,
    subjectId: string,
    operationRef: string,
    domainInput: string | null,
    grants: readonly unknown[],
    runtimeTrusted: boolean,
    trustedNowMs: number,
  ): CredentialBrokerDecision {
    const domain =
      normalizeDomain(domainInput);

    if (
      !CREDENTIAL_LEASE_ID.test(
        leaseId,
      )
      || !safeReference(
        subjectId,
        240,
      )
      || !safeReference(
        operationRef,
        240,
      )
      || (
        domainInput !== null
        && domain === null
      )
      || !Array.isArray(grants)
      || grants.length > 4096
      || typeof runtimeTrusted
        !== 'boolean'
      || !safeInteger(trustedNowMs)
    ) {
      return decision(
        false,
        'invalid_input',
      );
    }

    if (!runtimeTrusted) {
      return decision(
        false,
        'runtime_untrusted',
      );
    }

    const current =
      this.leases.get(leaseId);

    if (!current) {
      return decision(
        false,
        'lease_not_found',
      );
    }

    if (
      current.revokedAtMs !== null
    ) {
      return decision(
        false,
        'lease_revoked',
        current,
      );
    }

    if (
      current.expiresAtMs
        <= trustedNowMs
    ) {
      return decision(
        false,
        'lease_expired',
        current,
      );
    }

    if (
      current.subjectId !== subjectId
      || current.operationRef
        !== operationRef
      || current.domain !== domain
    ) {
      return decision(
        false,
        'binding_mismatch',
        current,
      );
    }

    const secretGrant =
      findGrant(
        grants,
        current.secretGrantId,
      );

    if (
      !secretGrant
      || secretGrant.scope?.resourceId
        !== current.credentialRef
      || !authorizeCapability(
        {
          subjectId:
            current.subjectId,
          capability: 'secret.use',
          nowMs: trustedNowMs,
          resourceId:
            current.credentialRef,
          background:
            current.background,
          elevation: 'none',
        },
        [secretGrant],
        trustedNowMs,
      ).allowed
    ) {
      return decision(
        false,
        'secret_capability_denied',
        current,
      );
    }

    if (
      current.domain !== null
    ) {
      const networkGrant =
        findGrant(
          grants,
          current.networkGrantId
            ?? undefined,
        );

      if (
        !networkGrant
        || !authorizeCapability(
          {
            subjectId:
              current.subjectId,
            capability:
              'network.request',
            nowMs: trustedNowMs,
            domain:
              current.domain,
            background:
              current.background,
            elevation: 'none',
          },
          [networkGrant],
          trustedNowMs,
        ).allowed
      ) {
        return decision(
          false,
          'network_capability_denied',
          current,
        );
      }
    }

    if (
      current.uses >= current.maxUses
    ) {
      return decision(
        false,
        'lease_exhausted',
        current,
      );
    }

    const next =
      Object.freeze({
        ...current,
        uses: current.uses + 1,
      });

    this.leases.set(
      leaseId,
      next,
    );

    return decision(
      true,
      'consumed',
      next,
      next.credentialRef,
    );
  }

  revoke(
    leaseId: string,
    trustedNowMs: number,
  ): CredentialBrokerDecision {
    if (
      !CREDENTIAL_LEASE_ID.test(
        leaseId,
      )
      || !safeInteger(trustedNowMs)
    ) {
      return decision(
        false,
        'invalid_input',
      );
    }

    const current =
      this.leases.get(leaseId);

    if (!current) {
      return decision(
        false,
        'lease_not_found',
      );
    }

    if (
      current.revokedAtMs !== null
    ) {
      return decision(
        true,
        'revoked',
        current,
      );
    }

    const revoked =
      Object.freeze({
        ...current,
        revokedAtMs:
          trustedNowMs,
      });

    this.leases.set(
      leaseId,
      revoked,
    );

    return decision(
      true,
      'revoked',
      revoked,
    );
  }
}
