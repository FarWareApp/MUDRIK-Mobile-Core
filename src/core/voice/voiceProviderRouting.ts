import type { VoiceProviderStatus } from './voiceProviderContracts';

export type VoiceServiceKind = 'stt' | 'tts';

export type VoiceProviderDescriptor = Readonly<{
  providerRef: string;
  service: VoiceServiceKind;
  status: VoiceProviderStatus;
  supportsStreaming: boolean;
  languageTags: readonly string[];
  priority: number;
  estimatedFirstResultMs: number | null;
}>;

export type VoiceProviderSelection = Readonly<{
  selected: VoiceProviderDescriptor | null;
  reason:
    | 'selected'
    | 'invalid_input'
    | 'no_eligible_provider';
}>;

const PROVIDER_REF = /^vp_[A-Za-z0-9_-]{8,80}$/;
const LANGUAGE_TAG = /^(?:mul|[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3})$/;
const STATUSES: readonly VoiceProviderStatus[] = [
  'ready',
  'degraded',
  'unavailable',
];

function normalizeLanguage(tag: string): string {
  return tag.toLowerCase();
}

function parseDescriptor(value: unknown): VoiceProviderDescriptor | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'providerRef',
    'service',
    'status',
    'supportsStreaming',
    'languageTags',
    'priority',
    'estimatedFirstResultMs',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.providerRef !== 'string' ||
    !PROVIDER_REF.test(record.providerRef) ||
    (record.service !== 'stt' && record.service !== 'tts') ||
    typeof record.status !== 'string' ||
    !STATUSES.includes(record.status as VoiceProviderStatus) ||
    typeof record.supportsStreaming !== 'boolean' ||
    !Array.isArray(record.languageTags) ||
    record.languageTags.length > 32 ||
    typeof record.priority !== 'number' ||
    !Number.isSafeInteger(record.priority) ||
    record.priority < 0 ||
    record.priority > 1000 ||
    (
      record.estimatedFirstResultMs !== null &&
      (
        typeof record.estimatedFirstResultMs !== 'number' ||
        !Number.isFinite(record.estimatedFirstResultMs) ||
        record.estimatedFirstResultMs < 0
      )
    )
  ) {
    return null;
  }

  const languageTags: string[] = [];
  const seen = new Set<string>();
  for (const item of record.languageTags) {
    if (typeof item !== 'string' || !LANGUAGE_TAG.test(item)) {
      return null;
    }

    const normalized = normalizeLanguage(item);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      languageTags.push(normalized);
    }
  }

  return Object.freeze({
    providerRef: record.providerRef,
    service: record.service,
    status: record.status as VoiceProviderStatus,
    supportsStreaming: record.supportsStreaming,
    languageTags: Object.freeze(languageTags),
    priority: record.priority,
    estimatedFirstResultMs: record.estimatedFirstResultMs as number | null,
  });
}

function supportsLanguages(
  provider: VoiceProviderDescriptor,
  requestedLanguages: readonly string[],
): boolean {
  if (requestedLanguages.length === 0) {
    return true;
  }

  const supported = new Set(provider.languageTags);
  if (supported.has('mul')) {
    return true;
  }

  return requestedLanguages.every((requested) => {
    const normalized = normalizeLanguage(requested);
    const primary = normalized.split('-')[0];
    return (
      supported.has(normalized) ||
      supported.has(primary)
    );
  });
}

function statusRank(status: VoiceProviderStatus): number {
  if (status === 'ready') {
    return 0;
  }

  if (status === 'degraded') {
    return 1;
  }

  return 2;
}

export function selectVoiceProvider(input: unknown): VoiceProviderSelection {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return { selected: null, reason: 'invalid_input' };
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'service',
    'languageHints',
    'candidates',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    (record.service !== 'stt' && record.service !== 'tts') ||
    !Array.isArray(record.languageHints) ||
    record.languageHints.length > 8 ||
    !Array.isArray(record.candidates) ||
    record.candidates.length > 32
  ) {
    return { selected: null, reason: 'invalid_input' };
  }

  const languageHints: string[] = [];
  for (const item of record.languageHints) {
    if (typeof item !== 'string' || !LANGUAGE_TAG.test(item)) {
      return { selected: null, reason: 'invalid_input' };
    }
    languageHints.push(normalizeLanguage(item));
  }

  const candidates: VoiceProviderDescriptor[] = [];
  const refs = new Set<string>();
  for (const item of record.candidates) {
    const parsed = parseDescriptor(item);
    if (!parsed || refs.has(parsed.providerRef)) {
      return { selected: null, reason: 'invalid_input' };
    }
    refs.add(parsed.providerRef);
    candidates.push(parsed);
  }

  const eligible = candidates.filter((candidate) => (
    candidate.service === record.service &&
    candidate.status !== 'unavailable' &&
    candidate.supportsStreaming &&
    supportsLanguages(candidate, languageHints)
  ));

  eligible.sort((a, b) => {
    const statusDifference = statusRank(a.status) - statusRank(b.status);
    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    const aLatency = a.estimatedFirstResultMs ?? Number.POSITIVE_INFINITY;
    const bLatency = b.estimatedFirstResultMs ?? Number.POSITIVE_INFINITY;
    if (aLatency !== bLatency) {
      return aLatency - bLatency;
    }

    return a.providerRef.localeCompare(b.providerRef);
  });

  return eligible.length > 0
    ? {
        selected: eligible[0],
        reason: 'selected',
      }
    : {
        selected: null,
        reason: 'no_eligible_provider',
      };
}
