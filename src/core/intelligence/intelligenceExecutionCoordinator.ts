import {
  parseIntelligenceAdapterInvocation,
  type IntelligenceAdapterSession,
  type IntelligenceProviderAdapter,
} from './intelligenceAdapter';

import {
  normalizeIntelligenceProviderFailure,
  type IntelligenceProviderFailure,
} from './intelligenceFailure';

import type {
  IntelligenceFailureCode,
} from './intelligenceFailover';

import type {
  IntelligenceCircuitBreakerRegistry,
} from './intelligenceCircuitBreaker';

import type {
  IntelligenceProviderRegistry,
  IntelligenceAdapterBinding,
} from './intelligenceRegistry';

import {
  parseIntelligenceRoutePlan,
  type IntelligenceRouteCandidate,
  type IntelligenceRoutePlan,
} from './intelligenceRouting';

import {
  isSafePublicReference,
  safeInteger,
} from './intelligenceSecurity';

export interface IntelligenceAdapterResolver {
  resolve(
    binding: IntelligenceAdapterBinding,
  ): IntelligenceProviderAdapter | null;
}

export type IntelligenceExecutionInput =
  Readonly<{
    plan: IntelligenceRoutePlan;
    inputRef: string;
    streaming: boolean;
    deadlineAtMs: number | null;
    initialGeneration: number;
    maxAttempts: number;
    bufferedInputReplayAvailable: boolean;
  }>;

export type IntelligenceExecutionOutcome =
  Readonly<{
    status:
      | 'succeeded'
      | 'failed'
      | 'cancelled';
    requestId: string;
    planId: string;
    providerRef: string | null;
    modelRef: string | null;
    generation: number;
    resultRef: string | null;
    completedAtMs: number | null;
    failureCode:
      IntelligenceFailureCode | null;
    attempts: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligenceExecutionTask =
  Readonly<{
    result: Promise<IntelligenceExecutionOutcome>;
    cancel(): void;
  }>;

type AttemptResolution =
  | Readonly<{
      kind: 'success';
      resultRef: string;
      completedAtMs: number;
      outputObserved: boolean;
    }>
  | Readonly<{
      kind: 'failure';
      failure: IntelligenceProviderFailure;
      outputObserved: boolean;
    }>
  | Readonly<{
      kind: 'cancelled';
      outputObserved: boolean;
    }>;

function outcome(
  input: {
    status:
      IntelligenceExecutionOutcome['status'];
    plan: IntelligenceRoutePlan;
    providerRef: string | null;
    modelRef: string | null;
    generation: number;
    resultRef?: string | null;
    completedAtMs?: number | null;
    failureCode?:
      IntelligenceFailureCode | null;
    attempts: number;
  },
): IntelligenceExecutionOutcome {
  return Object.freeze({
    status: input.status,
    requestId: input.plan.requestId,
    planId: input.plan.planId,
    providerRef: input.providerRef,
    modelRef: input.modelRef,
    generation: input.generation,
    resultRef: input.resultRef ?? null,
    completedAtMs:
      input.completedAtMs ?? null,
    failureCode:
      input.failureCode ?? null,
    attempts: input.attempts,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function candidates(
  plan: IntelligenceRoutePlan,
): readonly IntelligenceRouteCandidate[] {
  return Object.freeze([
    ...(plan.primary ? [plan.primary] : []),
    ...plan.fallbacks,
  ]);
}

function validInput(
  registry: IntelligenceProviderRegistry,
  input: IntelligenceExecutionInput,
): boolean {
  const plan =
    parseIntelligenceRoutePlan(input.plan);

  return Boolean(
    plan
    && registry.isIssuedPlan(input.plan)
    && isSafePublicReference(
      input.inputRef,
      240,
    )
    && typeof input.streaming === 'boolean'
    && (
      input.deadlineAtMs === null
      || safeInteger(input.deadlineAtMs)
    )
    && safeInteger(input.initialGeneration)
    && safeInteger(input.maxAttempts)
    && input.maxAttempts >= 1
    && input.maxAttempts <= 8
    && typeof input.bufferedInputReplayAvailable
      === 'boolean',
  );
}

function retryableFailure(
  code: IntelligenceFailureCode,
): IntelligenceProviderFailure {
  return Object.freeze({
    code,
    retryable: ![
      'unsupported_input',
      'permission_denied',
      'cancelled',
      'policy_denied',
    ].includes(code),
    providerSafeMessage: null,
  });
}

export class IntelligenceExecutionCoordinator {
  constructor(
    private readonly registry:
      IntelligenceProviderRegistry,
    private readonly resolver:
      IntelligenceAdapterResolver,
    private readonly clock:
      () => number = () => Date.now(),
    private readonly circuitBreaker:
      IntelligenceCircuitBreakerRegistry | null = null,
  ) {}

  execute(
    input: IntelligenceExecutionInput,
  ): IntelligenceExecutionTask {
    let cancelled = false;
    let activeSession:
      IntelligenceAdapterSession | null = null;
    let activeSessionCancelRequested = false;
    let resolveCancellation:
      (value: AttemptResolution) => void =
        () => {};

    const cancellationSignal =
      new Promise<AttemptResolution>(
        (resolve) => {
          resolveCancellation = resolve;
        },
      );

    const cancel = () => {
      if (cancelled) {
        return;
      }

      cancelled = true;
      resolveCancellation({
        kind: 'cancelled',
        outputObserved: false,
      });

      if (
        activeSession
        && !activeSessionCancelRequested
      ) {
        activeSessionCancelRequested = true;
        void activeSession
          .cancel()
          .catch(() => {});
      }
    };

    const result =
      (async (): Promise<
        IntelligenceExecutionOutcome
      > => {
        if (!validInput(
          this.registry,
          input,
        )) {
          const parsed =
            parseIntelligenceRoutePlan(
              input.plan,
            );

          if (!parsed) {
            throw new TypeError(
              'Invalid intelligence execution input.',
            );
          }

          return outcome({
            status: 'failed',
            plan: parsed,
            providerRef: null,
            modelRef: null,
            generation:
              safeInteger(input.initialGeneration)
                ? input.initialGeneration
                : 0,
            failureCode: 'policy_denied',
            attempts: 0,
          });
        }

        const plan = input.plan;
        const routeCandidates =
          candidates(plan);

        if (routeCandidates.length === 0) {
          return outcome({
            status: 'failed',
            plan,
            providerRef: null,
            modelRef: null,
            generation:
              input.initialGeneration,
            failureCode:
              'provider_unavailable',
            attempts: 0,
          });
        }

        let generation =
          input.initialGeneration;
        let attempts = 0;
        let lastFailure:
          IntelligenceFailureCode =
            'provider_unavailable';

        for (
          let index = 0;
          index < routeCandidates.length
          && attempts < input.maxAttempts;
          index += 1
        ) {
          const candidate =
            routeCandidates[index];

          if (cancelled) {
            return outcome({
              status: 'cancelled',
              plan,
              providerRef:
                candidate.providerRef,
              modelRef:
                candidate.modelRef,
              generation,
              failureCode: 'cancelled',
              attempts,
            });
          }

          const now = this.clock();

          if (
            !safeInteger(now)
            || (
              input.deadlineAtMs !== null
              && now > input.deadlineAtMs
            )
          ) {
            return outcome({
              status: 'failed',
              plan,
              providerRef:
                candidate.providerRef,
              modelRef:
                candidate.modelRef,
              generation,
              failureCode: 'timeout',
              attempts,
            });
          }

          const circuitAdmission =
            this.circuitBreaker?.admit(
              candidate.providerRef,
              candidate.modelRef,
              now,
            ) ?? null;

          if (
            circuitAdmission
            && !circuitAdmission.allowed
          ) {
            lastFailure =
              'provider_unavailable';

            const next =
              routeCandidates[index + 1];

            if (!next) {
              break;
            }

            const decision =
              this.registry
                .evaluateIssuedFailover(
                  {
                    plan,
                    currentProviderRef:
                      candidate.providerRef,
                    currentModelRef:
                      candidate.modelRef,
                    nextProviderRef:
                      next.providerRef,
                    nextModelRef:
                      next.modelRef,
                    attemptPhase: 'selected',
                    failureCode:
                      lastFailure,
                    retryable: true,
                    explicitRestart: false,
                    generationWillRotate: false,
                    bufferedInputReplayAvailable:
                      input.bufferedInputReplayAvailable,
                  },
                  now,
                );

            if (!decision.allowed) {
              break;
            }

            continue;
          }

          this.circuitBreaker
            ?.recordAttemptStarted(
              candidate.providerRef,
              candidate.modelRef,
              now,
            );

          attempts += 1;

          const binding =
            this.registry
              .resolveAdapterBinding(
                plan,
                candidate.providerRef,
                candidate.modelRef,
                now,
              );

          if (!binding) {
            lastFailure =
              'provider_unavailable';
            this.circuitBreaker
              ?.recordFailure(
                candidate.providerRef,
                candidate.modelRef,
                lastFailure,
                now,
              );

            const next =
              routeCandidates[index + 1];

            if (!next) {
              break;
            }

            const decision =
              this.registry
                .evaluateIssuedFailover(
                  {
                    plan,
                    currentProviderRef:
                      candidate.providerRef,
                    currentModelRef:
                      candidate.modelRef,
                    nextProviderRef:
                      next.providerRef,
                    nextModelRef:
                      next.modelRef,
                    attemptPhase:
                      'selected',
                    failureCode:
                      lastFailure,
                    retryable: true,
                    explicitRestart: false,
                    generationWillRotate:
                      false,
                    bufferedInputReplayAvailable:
                      input.bufferedInputReplayAvailable,
                  },
                  now,
                );

            if (!decision.allowed) {
              break;
            }

            continue;
          }

          const adapter =
            this.resolver.resolve(binding);

          if (
            !adapter
            || adapter.providerRef
              !== binding.providerRef
            || adapter.modelRef
              !== binding.modelRef
            || adapter.service
              !== binding.service
          ) {
            lastFailure =
              'provider_unavailable';

            const next =
              routeCandidates[index + 1];

            if (!next) {
              break;
            }

            const decision =
              this.registry
                .evaluateIssuedFailover(
                  {
                    plan,
                    currentProviderRef:
                      candidate.providerRef,
                    currentModelRef:
                      candidate.modelRef,
                    nextProviderRef:
                      next.providerRef,
                    nextModelRef:
                      next.modelRef,
                    attemptPhase:
                      'selected',
                    failureCode:
                      lastFailure,
                    retryable: true,
                    explicitRestart: false,
                    generationWillRotate:
                      false,
                    bufferedInputReplayAvailable:
                      input.bufferedInputReplayAvailable,
                  },
                  now,
                );

            if (!decision.allowed) {
              break;
            }

            continue;
          }

          const invocation =
            parseIntelligenceAdapterInvocation({
              protocolVersion: '1.0',
              requestId: plan.requestId,
              planId: plan.planId,
              providerRef:
                candidate.providerRef,
              modelRef:
                candidate.modelRef,
              service: plan.service,
              generation,
              inputRef: input.inputRef,
              streaming: input.streaming,
              deadlineAtMs:
                input.deadlineAtMs,
              grantsExecutionAuthority: false,
              grantsSensorAuthority: false,
              grantsApprovalAuthority: false,
              grantsCapabilityAuthority: false,
            });

          if (!invocation) {
            lastFailure =
              'invalid_response';
            this.circuitBreaker
              ?.recordFailure(
                candidate.providerRef,
                candidate.modelRef,
                lastFailure,
                now,
              );
            break;
          }

          const tracker =
            this.registry
              .createAttemptTracker(
                plan,
                candidate.providerRef,
                candidate.modelRef,
                generation,
                now,
              );

          if (!tracker) {
            lastFailure =
              'provider_unavailable';
            this.circuitBreaker
              ?.recordFailure(
                candidate.providerRef,
                candidate.modelRef,
                lastFailure,
                now,
              );
            break;
          }

          let attemptSettled = false;
          let resolveAttempt:
            (value: AttemptResolution) => void =
              () => {};

          const attemptResult =
            new Promise<AttemptResolution>(
              (resolve) => {
                resolveAttempt = resolve;
              },
            );

          const settleAttempt =
            (value: AttemptResolution) => {
              if (attemptSettled) {
                return;
              }
              attemptSettled = true;
              resolveAttempt(value);
            };

          const onOutput =
            (event: unknown) => {
              if (
                cancelled
                || attemptSettled
              ) {
                return;
              }

              const accepted =
                tracker.acceptOutput(event);

              if (!accepted.accepted) {
                tracker.fail();
                settleAttempt({
                  kind: 'failure',
                  failure:
                    retryableFailure(
                      'invalid_response',
                    ),
                  outputObserved:
                    accepted.state
                      .outputObserved,
                });
                return;
              }

              if (
                accepted.idempotent
                || !accepted.state.finalObserved
              ) {
                return;
              }

              const record =
                event as {
                  resultRef?: unknown;
                  observedAtMs?: unknown;
                };

              if (
                !isSafePublicReference(
                  record.resultRef,
                  240,
                )
                || !safeInteger(
                  record.observedAtMs,
                )
              ) {
                settleAttempt({
                  kind: 'failure',
                  failure:
                    retryableFailure(
                      'invalid_response',
                    ),
                  outputObserved: true,
                });
                return;
              }

              settleAttempt({
                kind: 'success',
                resultRef:
                  record.resultRef,
                completedAtMs:
                  record.observedAtMs,
                outputObserved: true,
              });
            };

          const onFailure =
            (failure: unknown) => {
              if (
                cancelled
                || attemptSettled
              ) {
                return;
              }

              const state =
                tracker.getState();
              tracker.fail();

              settleAttempt({
                kind: 'failure',
                failure:
                  normalizeIntelligenceProviderFailure(
                    failure,
                  ),
                outputObserved:
                  state.outputObserved,
              });
            };

          const effectiveDeadline =
            input.deadlineAtMs === null
              ? now + 120_000
              : Math.min(
                  input.deadlineAtMs,
                  now + 120_000,
                );
          const delay =
            Math.max(
              1,
              effectiveDeadline - now,
            );

          const timer =
            setTimeout(
              () => {
                if (
                  cancelled
                  || attemptSettled
                ) {
                  return;
                }

                const state =
                  tracker.getState();
                tracker.fail();

                settleAttempt({
                  kind: 'failure',
                  failure:
                    retryableFailure('timeout'),
                  outputObserved:
                    state.outputObserved,
                });
              },
              delay,
            );

          activeSessionCancelRequested = false;

          void adapter
            .invoke(
              invocation,
              onOutput,
              onFailure,
            )
            .then(
              (session) => {
                activeSession = session;

                if (
                  (cancelled || attemptSettled)
                  && !activeSessionCancelRequested
                ) {
                  activeSessionCancelRequested = true;
                  void session
                    .cancel()
                    .catch(() => {});
                }
              },
              () => {
                if (
                  cancelled
                  || attemptSettled
                ) {
                  return;
                }

                const state =
                  tracker.getState();
                tracker.fail();

                settleAttempt({
                  kind: 'failure',
                  failure:
                    retryableFailure(
                      'provider_unavailable',
                    ),
                  outputObserved:
                    state.outputObserved,
                });
              },
            );

          if (cancelled) {
            settleAttempt({
              kind: 'cancelled',
              outputObserved:
                tracker.getState()
                  .outputObserved,
            });
          }

          const resolution =
            await Promise.race([
              attemptResult,
              cancellationSignal,
            ]);

          clearTimeout(timer);

          const sessionAfterAttempt =
            activeSession as
              IntelligenceAdapterSession | null;

          if (sessionAfterAttempt) {
            if (
              resolution.kind !== 'success'
              && !activeSessionCancelRequested
            ) {
              activeSessionCancelRequested = true;
              await sessionAfterAttempt
                .cancel()
                .catch(() => {});
            }
            activeSession = null;
            activeSessionCancelRequested = false;
          }

          if (
            cancelled
            || resolution.kind
              === 'cancelled'
          ) {
            tracker.cancel();

            return outcome({
              status: 'cancelled',
              plan,
              providerRef:
                candidate.providerRef,
              modelRef:
                candidate.modelRef,
              generation,
              failureCode: 'cancelled',
              attempts,
            });
          }

          if (
            resolution.kind === 'success'
          ) {
            this.circuitBreaker
              ?.recordSuccess(
                candidate.providerRef,
                candidate.modelRef,
                Math.max(
                  now,
                  resolution.completedAtMs,
                ),
              );

            return outcome({
              status: 'succeeded',
              plan,
              providerRef:
                candidate.providerRef,
              modelRef:
                candidate.modelRef,
              generation,
              resultRef:
                resolution.resultRef,
              completedAtMs:
                resolution.completedAtMs,
              attempts,
            });
          }

          lastFailure =
            resolution.failure.code;
          this.circuitBreaker
            ?.recordFailure(
              candidate.providerRef,
              candidate.modelRef,
              lastFailure,
              Math.max(now, this.clock()),
            );

          const next =
            routeCandidates[index + 1];

          if (
            !next
            || !resolution.failure.retryable
          ) {
            break;
          }

          const phase =
            resolution.outputObserved
              ? 'output_observed'
              : 'started';

          const decision =
            this.registry
              .evaluateIssuedFailover(
                {
                  plan,
                  currentProviderRef:
                    candidate.providerRef,
                  currentModelRef:
                    candidate.modelRef,
                  nextProviderRef:
                    next.providerRef,
                  nextModelRef:
                    next.modelRef,
                  attemptPhase: phase,
                  failureCode:
                    resolution.failure.code,
                  retryable:
                    resolution.failure.retryable,
                  explicitRestart:
                    resolution.outputObserved,
                  generationWillRotate:
                    resolution.outputObserved,
                  bufferedInputReplayAvailable:
                    input.bufferedInputReplayAvailable,
                },
                this.clock(),
              );

          if (!decision.allowed) {
            break;
          }

          if (
            decision
              .requiresGenerationRotation
          ) {
            generation += 1;
          }
        }

        const lastCandidate =
          routeCandidates[
            Math.min(
              Math.max(attempts - 1, 0),
              routeCandidates.length - 1,
            )
          ] ?? null;

        return outcome({
          status:
            cancelled
              ? 'cancelled'
              : 'failed',
          plan,
          providerRef:
            lastCandidate?.providerRef
            ?? null,
          modelRef:
            lastCandidate?.modelRef
            ?? null,
          generation,
          failureCode:
            cancelled
              ? 'cancelled'
              : lastFailure,
          attempts,
        });
      })();

    return Object.freeze({
      result,
      cancel,
    });
  }
}
