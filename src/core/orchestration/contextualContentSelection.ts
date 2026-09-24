import {
  parseOpaqueOrchestrationReference,
} from './orchestrationReference';

export type ContentSelectionReason =
  | 'explicit_selected'
  | 'context_selected'
  | 'clarification_required'
  | 'explicit_content_unavailable'
  | 'explicit_content_blocked'
  | 'no_eligible_content'
  | 'invalid_input';

export type ContentSelectionDecision = Readonly<{
  selectedContentRef: string | null;
  reason: ContentSelectionReason;
  grantsAuthority: false;
  updatesLongTermPreference: false;
  assertsEmotion: false;
}>;

type Candidate = Readonly<{
  contentRef: string;
  available: boolean;
  requiresPurchase: boolean;
  requiresAccountChange: boolean;
  categoryAllowed: boolean;
  currentSessionMatch: boolean;
  temporaryModeMatch: boolean;
  savedFavorite: boolean;
  recentPositiveChoice: boolean;
  ambientContextMatch: boolean;
}>;

const INPUT_KEYS = new Set([
  'explicitContentRef',
  'allowAutomaticSelection',
  'favoritesOnly',
  'candidates',
]);

const CANDIDATE_KEYS = new Set([
  'contentRef',
  'available',
  'requiresPurchase',
  'requiresAccountChange',
  'categoryAllowed',
  'currentSessionMatch',
  'temporaryModeMatch',
  'savedFavorite',
  'recentPositiveChoice',
  'ambientContextMatch',
]);

function result(
  selectedContentRef: string | null,
  reason: ContentSelectionReason,
): ContentSelectionDecision {
  return Object.freeze({
    selectedContentRef,
    reason,
    grantsAuthority: false,
    updatesLongTermPreference: false,
    assertsEmotion: false,
  });
}

function parseCandidate(
  input: unknown,
): Candidate | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== CANDIDATE_KEYS.size
    || Object.keys(record).some(
      (key) => !CANDIDATE_KEYS.has(key),
    )
  ) {
    return null;
  }

  const contentRef =
    parseOpaqueOrchestrationReference(
      record.contentRef,
      'content',
    );

  if (
    !contentRef
    || typeof record.available
      !== 'boolean'
    || typeof record.requiresPurchase
      !== 'boolean'
    || typeof record.requiresAccountChange
      !== 'boolean'
    || typeof record.categoryAllowed
      !== 'boolean'
    || typeof record.currentSessionMatch
      !== 'boolean'
    || typeof record.temporaryModeMatch
      !== 'boolean'
    || typeof record.savedFavorite
      !== 'boolean'
    || typeof record.recentPositiveChoice
      !== 'boolean'
    || typeof record.ambientContextMatch
      !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    contentRef,
    available: record.available,
    requiresPurchase:
      record.requiresPurchase,
    requiresAccountChange:
      record.requiresAccountChange,
    categoryAllowed:
      record.categoryAllowed,
    currentSessionMatch:
      record.currentSessionMatch,
    temporaryModeMatch:
      record.temporaryModeMatch,
    savedFavorite:
      record.savedFavorite,
    recentPositiveChoice:
      record.recentPositiveChoice,
    ambientContextMatch:
      record.ambientContextMatch,
  });
}

function score(
  candidate: Candidate,
): number {
  let value = 0;

  if (candidate.currentSessionMatch) {
    value += 100;
  }

  if (candidate.temporaryModeMatch) {
    value += 80;
  }

  if (candidate.savedFavorite) {
    value += 60;
  }

  if (candidate.recentPositiveChoice) {
    value += 40;
  }

  if (candidate.ambientContextMatch) {
    value += 20;
  }

  return value;
}

export function selectContextualContent(
  input: unknown,
): ContentSelectionDecision {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || typeof record.allowAutomaticSelection
      !== 'boolean'
    || typeof record.favoritesOnly
      !== 'boolean'
    || !Array.isArray(record.candidates)
    || record.candidates.length === 0
    || record.candidates.length > 64
  ) {
    return result(
      null,
      'invalid_input',
    );
  }

  let explicitContentRef:
    string | null = null;

  if (record.explicitContentRef !== null) {
    explicitContentRef =
      parseOpaqueOrchestrationReference(
        record.explicitContentRef,
        'content',
      );

    if (!explicitContentRef) {
      return result(
        null,
        'invalid_input',
      );
    }
  }

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const raw of record.candidates) {
    const candidate =
      parseCandidate(raw);

    if (
      !candidate
      || seen.has(candidate.contentRef)
    ) {
      return result(
        null,
        'invalid_input',
      );
    }

    seen.add(candidate.contentRef);
    candidates.push(candidate);
  }

  if (explicitContentRef) {
    const explicit =
      candidates.find(
        (candidate) =>
          candidate.contentRef
            === explicitContentRef,
      );

    if (!explicit) {
      return result(
        null,
        'explicit_content_unavailable',
      );
    }

    if (
      !explicit.available
      || explicit.requiresPurchase
      || explicit.requiresAccountChange
      || !explicit.categoryAllowed
      || (
        record.favoritesOnly
        && !explicit.savedFavorite
      )
    ) {
      return result(
        null,
        'explicit_content_blocked',
      );
    }

    return result(
      explicit.contentRef,
      'explicit_selected',
    );
  }

  if (!record.allowAutomaticSelection) {
    return result(
      null,
      'clarification_required',
    );
  }

  const eligible =
    candidates
      .filter(
        (candidate) =>
          candidate.available
          && !candidate.requiresPurchase
          && !candidate.requiresAccountChange
          && candidate.categoryAllowed
          && (
            !record.favoritesOnly
            || candidate.savedFavorite
          ),
      )
      .map(
        (candidate) => ({
          candidate,
          score:
            score(candidate),
        }),
      )
      .sort((left, right) => {
        if (
          left.score !== right.score
        ) {
          return (
            right.score
            - left.score
          );
        }

        return left.candidate
          .contentRef
          .localeCompare(
            right.candidate
              .contentRef,
          );
      });

  if (eligible.length === 0) {
    return result(
      null,
      'no_eligible_content',
    );
  }

  if (
    eligible.length > 1
    && eligible[0].score
      === eligible[1].score
  ) {
    return result(
      null,
      'clarification_required',
    );
  }

  return result(
    eligible[0].candidate
      .contentRef,
    'context_selected',
  );
}
