import {
  compileContext,
  type ContextCandidate,
  type ContextCompilerPolicy,
} from '../context/contextCompiler';

import type {
  MessageTransportContextEvidence,
} from '../../contracts/MessageTransport';

const ALLOWED_SOURCES =
  new Set([
    'memory',
    'knowledge',
    'project_state',
    'tool_evidence',
  ]);

export type GatewayContextAssembly =
  Readonly<{
    accepted: boolean;
    reason:
      | 'assembled'
      | 'invalid_source'
      | 'compile_failed';
    evidence:
      readonly MessageTransportContextEvidence[];
    omittedCount: number;
    truncated: boolean;
  }>;

export function assembleGatewayContextEvidence(
  candidates:
    readonly ContextCandidate[],
  policy:
    ContextCompilerPolicy,
  compiledAtMs: number,
): GatewayContextAssembly {
  if (
    !Array.isArray(candidates)
    || candidates.some(
      (candidate) =>
        candidate.authority !== 'none'
        || !ALLOWED_SOURCES.has(
          candidate.sourceKind,
        ),
    )
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'invalid_source',
      evidence: Object.freeze([]),
      omittedCount: 0,
      truncated: false,
    });
  }

  const decision =
    compileContext(
      candidates,
      {
        ...policy,
        maxEntries:
          Math.min(
            policy.maxEntries,
            24,
          ),
        maxTokens:
          Math.min(
            policy.maxTokens,
            16_000,
          ),
      },
      compiledAtMs,
    );

  if (
    !decision.accepted
    || !decision.value
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'compile_failed',
      evidence: Object.freeze([]),
      omittedCount:
        candidates.length,
      truncated:
        candidates.length > 0,
    });
  }

  const evidence =
    decision.value.evidence
      .slice(0, 24)
      .map(
        (candidate) =>
          Object.freeze({
            sourceKind:
              candidate.sourceKind as
                MessageTransportContextEvidence[
                  'sourceKind'
                ],
            content:
              candidate.content,
            provenanceRef:
              candidate.provenanceRef,
            observedAtMs:
              candidate.observedAtMs,
            confidenceScore:
              candidate.confidenceScore,
          }),
      );

  return Object.freeze({
    accepted: true,
    reason: 'assembled',
    evidence:
      Object.freeze(evidence),
    omittedCount:
      decision.value.omittedCount,
    truncated:
      decision.value.truncated,
  });
}
