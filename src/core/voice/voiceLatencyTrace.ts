export type VoiceLatencyMilestone =
  | 'session_started'
  | 'speech_started'
  | 'speech_ended'
  | 'stt_first_partial'
  | 'stt_final'
  | 'lane_decided'
  | 'execution_started'
  | 'execution_completed'
  | 'tts_first_audio'
  | 'response_completed';

export type VoiceLatencyPoint = Readonly<{
  milestone: VoiceLatencyMilestone;
  atMs: number;
}>;

export type VoiceLatencyTrace = Readonly<{
  points: readonly VoiceLatencyPoint[];
  durationMs: number;
}>;

const MILESTONES: readonly VoiceLatencyMilestone[] = [
  'session_started',
  'speech_started',
  'speech_ended',
  'stt_first_partial',
  'stt_final',
  'lane_decided',
  'execution_started',
  'execution_completed',
  'tts_first_audio',
  'response_completed',
];

export function buildVoiceLatencyTrace(
  input: unknown,
): VoiceLatencyTrace | null {
  if (!Array.isArray(input) || input.length < 2 || input.length > MILESTONES.length) {
    return null;
  }

  const seen = new Set<VoiceLatencyMilestone>();
  const points: VoiceLatencyPoint[] = [];
  let previousAtMs = -1;

  for (const item of input) {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item)
    ) {
      return null;
    }

    const record = item as Record<string, unknown>;
    if (
      Object.keys(record).some(
        (key) => key !== 'milestone' && key !== 'atMs',
      ) ||
      typeof record.milestone !== 'string' ||
      !MILESTONES.includes(record.milestone as VoiceLatencyMilestone) ||
      typeof record.atMs !== 'number' ||
      !Number.isSafeInteger(record.atMs) ||
      record.atMs < 0 ||
      record.atMs < previousAtMs ||
      seen.has(record.milestone as VoiceLatencyMilestone)
    ) {
      return null;
    }

    seen.add(record.milestone as VoiceLatencyMilestone);
    previousAtMs = record.atMs;
    points.push(Object.freeze({
      milestone: record.milestone as VoiceLatencyMilestone,
      atMs: record.atMs,
    }));
  }

  return Object.freeze({
    points: Object.freeze(points),
    durationMs:
      points[points.length - 1].atMs -
      points[0].atMs,
  });
}

export function latencyBetween(
  trace: VoiceLatencyTrace,
  from: VoiceLatencyMilestone,
  to: VoiceLatencyMilestone,
): number | null {
  const start = trace.points.find(
    (point) => point.milestone === from,
  );
  const end = trace.points.find(
    (point) => point.milestone === to,
  );

  if (!start || !end || end.atMs < start.atMs) {
    return null;
  }

  return end.atMs - start.atMs;
}
