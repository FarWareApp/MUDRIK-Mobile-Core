import {
  isSafeReference,
  safeInteger,
} from './knowledgeSecurity';

import type {
  KnowledgeConsensusDecision,
} from './knowledgeConsensus';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const CLAIM_ID =
  new RegExp('^knowledge_claim_' + BODY + '$');

export type GroundedClaim =
  Readonly<{
    claimId: string;
    material: boolean;
    consensus: KnowledgeConsensusDecision;
    citationRefs: readonly string[];
  }>;

export type KnowledgeGroundingPolicy =
  Readonly<{
    requireCitationForMaterialClaims: boolean;
    maxUnsupportedNonMaterialClaims: number;
    allowUncertaintyDisclosure: boolean;
    researchExhausted: boolean;
  }>;

export type KnowledgeGroundingDecision =
  Readonly<{
    action:
      | 'answer'
      | 'answer_with_uncertainty'
      | 'research_more'
      | 'block';
    reason:
      | 'fully_grounded'
      | 'uncertainty_disclosed'
      | 'material_claim_unsupported'
      | 'material_claim_contradicted'
      | 'citation_missing'
      | 'too_many_unsupported_claims'
      | 'evidence_exhausted'
      | 'invalid_input';
    unsupportedClaimIds: readonly string[];
    contradictedClaimIds: readonly string[];
    missingCitationClaimIds: readonly string[];
  }>;

function uniqueReferences(
  value: readonly string[],
): boolean {
  return (
    Array.isArray(value)
    && value.length <= 64
    && new Set(value).size === value.length
    && value.every(
      (item) => isSafeReference(item, 240),
    )
  );
}

function validConsensus(
  value: KnowledgeConsensusDecision,
): boolean {
  return (
    typeof value === 'object'
    && value !== null
    && typeof value.accepted === 'boolean'
    && typeof value.reason === 'string'
    && typeof value.independentSupporters === 'number'
    && safeInteger(value.independentSupporters)
    && typeof value.weightedSupport === 'number'
    && safeInteger(value.weightedSupport)
    && typeof value.weightedOpposition === 'number'
    && safeInteger(value.weightedOpposition)
    && Array.isArray(value.conflictingValueDigests)
  );
}

function result(
  action: KnowledgeGroundingDecision['action'],
  reason: KnowledgeGroundingDecision['reason'],
  unsupported: readonly string[],
  contradicted: readonly string[],
  missingCitation: readonly string[],
): KnowledgeGroundingDecision {
  return Object.freeze({
    action,
    reason,
    unsupportedClaimIds:
      Object.freeze([...unsupported]),
    contradictedClaimIds:
      Object.freeze([...contradicted]),
    missingCitationClaimIds:
      Object.freeze([...missingCitation]),
  });
}

export function evaluateKnowledgeGrounding(
  claims: readonly GroundedClaim[],
  policy: KnowledgeGroundingPolicy,
): KnowledgeGroundingDecision {
  if (
    !Array.isArray(claims)
    || claims.length > 512
    || typeof policy.requireCitationForMaterialClaims
      !== 'boolean'
    || !safeInteger(
      policy.maxUnsupportedNonMaterialClaims,
    )
    || policy.maxUnsupportedNonMaterialClaims > 128
    || typeof policy.allowUncertaintyDisclosure
      !== 'boolean'
    || typeof policy.researchExhausted !== 'boolean'
  ) {
    return result(
      'block',
      'invalid_input',
      [],
      [],
      [],
    );
  }

  const seen = new Set<string>();
  const unsupported: string[] = [];
  const contradicted: string[] = [];
  const missingCitation: string[] = [];
  const unsupportedOptional: string[] = [];

  for (const claim of claims) {
    if (
      !CLAIM_ID.test(claim.claimId)
      || seen.has(claim.claimId)
      || typeof claim.material !== 'boolean'
      || !validConsensus(claim.consensus)
      || !uniqueReferences(claim.citationRefs)
    ) {
      return result(
        'block',
        'invalid_input',
        [],
        [],
        [],
      );
    }

    seen.add(claim.claimId);

    if (!claim.consensus.accepted) {
      unsupported.push(claim.claimId);

      if (
        claim.consensus.reason === 'contradicted'
      ) {
        contradicted.push(claim.claimId);
      }

      if (!claim.material) {
        unsupportedOptional.push(claim.claimId);
      }
    }

    if (
      claim.material
      && claim.consensus.accepted
      && policy.requireCitationForMaterialClaims
      && claim.citationRefs.length === 0
    ) {
      missingCitation.push(claim.claimId);
    }
  }

  const materialContradiction =
    claims.some(
      (claim) =>
        claim.material
        && contradicted.includes(claim.claimId),
    );

  if (materialContradiction) {
    return result(
      policy.researchExhausted
        ? 'block'
        : 'research_more',
      policy.researchExhausted
        ? 'evidence_exhausted'
        : 'material_claim_contradicted',
      unsupported,
      contradicted,
      missingCitation,
    );
  }

  const materialUnsupported =
    claims.some(
      (claim) =>
        claim.material
        && unsupported.includes(claim.claimId),
    );

  if (materialUnsupported) {
    return result(
      policy.researchExhausted
        ? 'block'
        : 'research_more',
      policy.researchExhausted
        ? 'evidence_exhausted'
        : 'material_claim_unsupported',
      unsupported,
      contradicted,
      missingCitation,
    );
  }

  if (missingCitation.length > 0) {
    return result(
      policy.researchExhausted
        ? 'block'
        : 'research_more',
      policy.researchExhausted
        ? 'evidence_exhausted'
        : 'citation_missing',
      unsupported,
      contradicted,
      missingCitation,
    );
  }

  if (
    unsupportedOptional.length
      > policy.maxUnsupportedNonMaterialClaims
  ) {
    return result(
      policy.researchExhausted
        ? 'block'
        : 'research_more',
      policy.researchExhausted
        ? 'evidence_exhausted'
        : 'too_many_unsupported_claims',
      unsupported,
      contradicted,
      missingCitation,
    );
  }

  if (unsupportedOptional.length > 0) {
    return policy.allowUncertaintyDisclosure
      ? result(
          'answer_with_uncertainty',
          'uncertainty_disclosed',
          unsupported,
          contradicted,
          missingCitation,
        )
      : result(
          policy.researchExhausted
            ? 'block'
            : 'research_more',
          policy.researchExhausted
            ? 'evidence_exhausted'
            : 'too_many_unsupported_claims',
          unsupported,
          contradicted,
          missingCitation,
        );
  }

  return result(
    'answer',
    'fully_grounded',
    [],
    [],
    [],
  );
}
