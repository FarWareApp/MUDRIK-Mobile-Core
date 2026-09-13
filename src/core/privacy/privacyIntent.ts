import type { ObservationPrivacyEvent } from './observationPrivacyState';

export type PrivacyIntent = Readonly<{
  event: ObservationPrivacyEvent;
  matchedPhrase: string;
}>;

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const PUNCTUATION = /[!?؟.,،;؛:'"“”‘’()\[\]{}]/g;

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(PUNCTUATION, ' ')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const PHRASES: ReadonlyArray<readonly [string, ObservationPrivacyEvent]> = [
  ['غمض عيونك', 'stop_visual'],
  ['سكر عيونك', 'stop_visual'],
  ['لا تشوفني', 'stop_visual'],
  ['وقف الكاميرا', 'stop_visual'],
  ['لا تراقبني', 'lock_privacy'],
  ['وقف المراقبة', 'lock_privacy'],
  ['بدي خصوصية', 'lock_privacy'],
  ['خليني لحالي', 'lock_privacy'],
  ['افتح عيونك', 'resume_visual'],
  ['فيك تشوف هلق', 'resume_visual'],
  ['شغل الكاميرا', 'resume_visual'],
  ['راقب من جديد', 'unlock_privacy'],
  ['رجع المراقبة', 'unlock_privacy'],
  ['يمكنك المراقبة من جديد', 'unlock_privacy'],
  ['stop watching me', 'lock_privacy'],
  ['stop monitoring me', 'lock_privacy'],
  ['privacy mode', 'lock_privacy'],
  ['turn off the camera', 'stop_visual'],
  ['open your eyes', 'resume_visual'],
  ['resume monitoring', 'unlock_privacy'],
  ['beobachte mich nicht', 'lock_privacy'],
  ['überwache mich nicht', 'lock_privacy'],
  ['kamera aus', 'stop_visual'],
  ['augen zu', 'stop_visual'],
  ['augen auf', 'resume_visual'],
  ['überwachung wieder aktivieren', 'unlock_privacy'],
].map(([phrase, event]) => [normalizeText(phrase), event] as const);

export function detectPrivacyIntent(value: unknown): PrivacyIntent | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }

  const normalized = normalizeText(value);
  if (normalized.length === 0) {
    return null;
  }

  for (const [phrase, event] of PHRASES) {
    if (normalized === phrase) {
      return Object.freeze({ event, matchedPhrase: phrase });
    }
  }

  return null;
}
