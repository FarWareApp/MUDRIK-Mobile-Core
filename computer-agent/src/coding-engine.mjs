import {
  evaluateCodingCompletion,
} from './coding-completion.mjs';

import {
  CodingDecisionRegistry,
} from './coding-model-decision.mjs';

import {
  CodingEvidenceRegistry,
  issueCodingEvidence,
} from './coding-evidence.mjs';

import {
  parseCodingJob,
} from './coding-job.mjs';

import {
  codingStepCanMutate,
  normalizeCodingToolExecutionResult,
} from './coding-tool-executor.mjs';

import {
  containsStrongSecretSignature,
} from './coding-secret-guard.mjs';

import {
  createCodingWorkflowState,
  transitionCodingWorkflow,
} from './coding-workflow.mjs';

import {
  invokeModelAdapter,
  isModelAdapter,
} from './model-adapter.mjs';

const READ_ONLY =
  new Set([
    'filesystem.read',
    'git.read',
    'process.read',
    'browser.read',
    'network.outbound',
    'screen.capture',
    'clipboard.read',
  ]);

function validExecutor(value) {
  return (
    value
    && typeof value === 'object'
    && typeof value.execute
      === 'function'
  );
}

function safeClock(clock) {
  const value = clock();

  if (
    !Number.isSafeInteger(value)
    || value < 0
  ) {
    throw new TypeError(
      'Invalid coding engine clock.',
    );
  }

  return value;
}

function verificationStep(step) {
  return (
    step.tool === 'terminal'
    && typeof step.input
      ?.executionProfile
      === 'string'
  );
}

function defaultEvidenceId(
  counter,
) {
  return (
    'cevidence_'
    + String(counter)
      .padStart(16, '0')
  );
}

export class CodingEngine {
  constructor({
    job,
    workerAdapter,
    reviewerAdapter,
    toolExecutor,
    clock = () => Date.now(),
    getOuterLifecycleState =
      () => 'running',
    modelTimeoutMs = 30_000,
    evidenceIdFactory =
      defaultEvidenceId,
    onEvent = () => {},
  } = {}) {
    const parsed =
      parseCodingJob(job);

    if (
      !parsed
      || !isModelAdapter(
        workerAdapter,
      )
      || !isModelAdapter(
        reviewerAdapter,
      )
      || !validExecutor(
        toolExecutor,
      )
      || typeof clock
        !== 'function'
      || typeof getOuterLifecycleState
        !== 'function'
      || !Number.isInteger(
        modelTimeoutMs,
      )
      || modelTimeoutMs < 100
      || modelTimeoutMs
        > 300_000
      || typeof evidenceIdFactory
        !== 'function'
      || typeof onEvent
        !== 'function'
    ) {
      throw new TypeError(
        'Invalid coding engine configuration.',
      );
    }

    this.job = parsed;
    this.workerAdapter =
      workerAdapter;
    this.reviewerAdapter =
      reviewerAdapter;
    this.toolExecutor =
      toolExecutor;
    this.clock = clock;
    this.getOuterLifecycleState =
      getOuterLifecycleState;
    this.modelTimeoutMs =
      modelTimeoutMs;
    this.evidenceIdFactory =
      evidenceIdFactory;
    this.onEvent = onEvent;

    const now = safeClock(clock);

    this.state =
      createCodingWorkflowState(
        parsed,
        now,
      );
    this.decisions =
      new CodingDecisionRegistry({
        jobId: parsed.jobId,
        sessionId:
          parsed.sessionId,
      });
    this.evidence =
      new CodingEvidenceRegistry({
        jobId: parsed.jobId,
        sessionId:
          parsed.sessionId,
      });
    this.workerTurn = 0;
    this.reviewerTurn = 0;
    this.modelTurns = 0;
    this.toolRequests = 0;
    this.evidenceCounter = 0;
    this.lastToolObservation = '';
  }

  emit(type, data = {}) {
    try {
      this.onEvent(
        Object.freeze({
          type,
          jobId:
            this.job.jobId,
          sessionId:
            this.job.sessionId,
          phase:
            this.state.phase,
          revision:
            this.state.revision,
          ...data,
        }),
      );
    } catch {
      // Audit observers are non-authoritative.
    }
  }

  now() {
    return safeClock(this.clock);
  }

  move(event, reason = null) {
    let trustedNowMs;

    try {
      trustedNowMs = this.now();
    } catch {
      return false;
    }

    const next =
      transitionCodingWorkflow(
        this.state,
        event,
        {
          job: this.job,
          trustedNowMs,
          reason,
        },
      );

    if (!next) {
      return false;
    }

    this.state = next;
    this.emit(
      'coding.workflow_transition',
      { event },
    );

    return true;
  }

  block(reason) {
    if (
      this.state.phase === 'blocked'
      || this.state.phase
        === 'finished'
    ) {
      return this.snapshot();
    }

    let next = null;

    try {
      next =
        transitionCodingWorkflow(
          this.state,
          'block',
          {
            job: this.job,
            trustedNowMs:
              Math.max(
                this.state
                  .updatedAtMs,
                this.now(),
              ),
            reason,
          },
        );
    } catch {
      next = null;
    }

    this.state =
      next
      ?? Object.freeze({
        ...this.state,
        phase: 'blocked',
        inFlightTool: false,
        blockedReason: reason,
        grantsAuthority: false,
        performsExternalAction:
          false,
      });

    this.emit(
      'coding.workflow_transition',
      {
        event: 'block',
        reason,
      },
    );

    return this.snapshot();
  }

  advance(
    event,
    failureReason =
      'workflow_transition_invalid',
  ) {
    if (this.move(event)) {
      return true;
    }

    this.block(failureReason);
    return false;
  }

  snapshot() {
    return Object.freeze({
      state: this.state,
      modelTurns:
        this.modelTurns,
      toolRequests:
        this.toolRequests,
      evidence:
        this.evidence.current(
          this.state.revision,
        ),
    });
  }

  outerActive() {
    try {
      return (
        this.getOuterLifecycleState()
        === 'running'
      );
    } catch {
      return false;
    }
  }

  issueEvidence(
    kind,
    outcome,
    source,
    summaryCode,
  ) {
    this.evidenceCounter += 1;

    let evidenceId;

    try {
      evidenceId =
        this.evidenceIdFactory(
          this.evidenceCounter,
        );
    } catch {
      return false;
    }

    const evidence =
      issueCodingEvidence({
        evidenceId,
        jobId:
          this.job.jobId,
        sessionId:
          this.job.sessionId,
        revision:
          this.state.revision,
        kind,
        outcome,
        summaryCode,
        acceptedAtMs:
          (() => {
            try {
              return this.now();
            } catch {
              return -1;
            }
          })(),
        source,
      });

    if (
      !evidence
      || !this.evidence
        .add(evidence)
        .accepted
    ) {
      return false;
    }

    this.emit(
      'coding.evidence_accepted',
      {
        kind,
        outcome,
        evidenceId:
          evidence.evidenceId,
      },
    );

    return true;
  }

  hasEvidence(
    kind,
    outcome = 'passed',
  ) {
    return this.evidence
      .current(
        this.state.revision,
      )
      .some(
        (entry) =>
          entry.kind === kind
          && entry.outcome
            === outcome,
      );
  }

  async modelDecision(
    role,
    allowedKinds,
    signal,
  ) {
    if (
      this.modelTurns
        >= this.job.limits
          .maxModelTurns
    ) {
      this.block(
        'model_turn_limit',
      );
      return null;
    }

    const turn =
      role === 'worker'
        ? this.workerTurn + 1
        : this.reviewerTurn + 1;

    this.modelTurns += 1;

    if (role === 'worker') {
      this.workerTurn = turn;
    } else {
      this.reviewerTurn = turn;
    }

    const adapter =
      role === 'worker'
        ? this.workerAdapter
        : this.reviewerAdapter;

    const response =
      await invokeModelAdapter(
        adapter,
        Object.freeze({
          role,
          jobId:
            this.job.jobId,
          sessionId:
            this.job.sessionId,
          turn,
          revision:
            this.state.revision,
          phase:
            this.state.phase,
          goal:
            this.job.goal,
          workspaceRoot:
            this.job.workspaceRoot,
          requestedCapabilities:
            this.job
              .requestedCapabilities,
          research:
            this.job.research,
          buildRequired:
            this.job.buildRequired,
          testRequired:
            this.job.testRequired,
          reviewerVerdict:
            this.state
              .reviewerVerdict,
          toolObservation:
            this.lastToolObservation,
        }),
        {
          timeoutMs:
            this.modelTimeoutMs,
          signal,
        },
      );

    if (!response.ok) {
      this.block(
        response.reason,
      );
      return null;
    }

    const accepted =
      this.decisions.accept(
        response.value,
        {
          role,
          turn,
          revision:
            this.state.revision,
          maxBytes:
            this.job.limits
              .maxDecisionBytes,
        },
      );

    if (!accepted.accepted) {
      this.block(
        accepted.reason,
      );
      return null;
    }

    if (
      !allowedKinds.includes(
        accepted.decision.kind,
      )
    ) {
      this.block(
        'model_decision_kind_invalid',
      );
      return null;
    }

    return accepted.decision;
  }

  validateToolDecision(
    decision,
    {
      readOnly = false,
      verification = false,
      requireMutation = false,
    } = {},
  ) {
    const steps =
      decision.payload.steps;

    if (
      steps.length
        > this.job.limits
          .maxToolRequestsPerTurn
      || this.toolRequests
        + steps.length
        > this.job.limits
          .maxToolRequestsPerJob
    ) {
      this.block(
        'tool_request_limit',
      );
      return false;
    }

    const outer =
      new Set(
        this.job
          .requestedCapabilities,
      );

    if (
      steps.some(
        (step) =>
          step.requiredCapabilities
            .some(
              (capability) =>
                !outer.has(capability),
            ),
      )
    ) {
      this.block(
        'tool_capability_outside_job',
      );
      return false;
    }

    if (
      steps.some(
        (step) =>
          containsStrongSecretSignature(
            step.input,
          ),
      )
    ) {
      this.block(
        'model_secret_signature_detected',
      );
      return false;
    }

    if (
      readOnly
      && steps.some(
        (step) =>
          step.requiredCapabilities
            .some(
              (capability) =>
                !READ_ONLY.has(
                  capability,
                ),
            ),
      )
    ) {
      this.block(
        'tool_mutation_not_allowed',
      );
      return false;
    }

    if (
      verification
      && steps.some(
        (step) =>
          !verificationStep(step),
      )
    ) {
      this.block(
        'verification_tool_invalid',
      );
      return false;
    }

    if (
      requireMutation
      && !steps.some(
        codingStepCanMutate,
      )
    ) {
      this.block(
        'mutation_tool_missing',
      );
      return false;
    }

    return true;
  }

  async executeTools(
    decision,
    options,
    signal,
  ) {
    if (
      !this.validateToolDecision(
        decision,
        options,
      )
    ) {
      return null;
    }

    if (!this.outerActive()) {
      this.block(
        'outer_task_inactive',
      );
      return null;
    }

    this.toolRequests +=
      decision.payload
        .steps.length;

    if (!this.move('tool_started')) {
      this.block(
        'workflow_tool_state_invalid',
      );
      return null;
    }

    let raw;

    try {
      raw =
        await this.toolExecutor
          .execute({
            job: this.job,
            steps:
              decision.payload.steps,
            phase:
              this.state.phase,
            revision:
              this.state.revision,
            role:
              decision.role,
            signal,
          });
    } catch {
      this.move('tool_finished');
      this.block(
        'tool_executor_error',
      );
      return null;
    }

    if (!this.move('tool_finished')) {
      this.block(
        'workflow_tool_state_invalid',
      );
      return null;
    }

    const result =
      normalizeCodingToolExecutionResult(
        raw,
        decision.payload.steps,
      );

    if (!result) {
      this.block(
        'tool_result_invalid',
      );
      return null;
    }

    this.lastToolObservation =
      result.observation;

    return result;
  }

  verificationLimitReached() {
    return (
      this.state
        .verificationRetries
      >= this.job.limits
        .maxVerificationRetries
    );
  }

  async handleBuildOrTest(
    kind,
    signal,
    {
      retest = false,
    } = {},
  ) {
    const decision =
      await this.modelDecision(
        'worker',
        ['request_tools'],
        signal,
      );

    if (!decision) {
      return;
    }

    const result =
      await this.executeTools(
        decision,
        {
          verification: true,
        },
        signal,
      );

    if (!result) {
      return;
    }

    const passed =
      result.status
        === 'succeeded';

    if (
      !this.issueEvidence(
        kind,
        passed
          ? 'passed'
          : 'failed',
        'tool',
        kind
          + '.'
          + (
            passed
              ? 'passed'
              : 'failed'
          ),
      )
    ) {
      this.block(
        'evidence_issue_failed',
      );
      return;
    }

    if (passed) {
      if (retest) {
        return;
      }

      this.advance(
        kind === 'build'
          ? 'build_passed'
          : 'test_passed',
      );
      return;
    }

    if (
      this.verificationLimitReached()
    ) {
      this.block(
        'verification_retry_limit',
      );
      return;
    }

    this.advance(
      retest
        ? 'retest_failed'
        : kind === 'build'
          ? 'build_failed'
          : 'test_failed',
    );
  }

  async tick(signal) {
    if (
      signal?.aborted
      || !this.outerActive()
    ) {
      this.block(
        signal?.aborted
          ? 'coding_cancelled'
          : 'outer_task_inactive',
      );
      return;
    }

    const phase =
      this.state.phase;

    if (
      phase === 'finished'
      || phase === 'blocked'
    ) {
      return;
    }

    if (phase === 'understand') {
      const decision =
        await this.modelDecision(
          'worker',
          ['analysis'],
          signal,
        );

      if (decision) {
        this.advance('understood');
      }

      return;
    }

    if (phase === 'inspect') {
      const decision =
        await this.modelDecision(
          'worker',
          ['request_tools'],
          signal,
        );

      if (!decision) {
        return;
      }

      const result =
        await this.executeTools(
          decision,
          { readOnly: true },
          signal,
        );

      if (!result) {
        return;
      }

      if (
        result.status
          !== 'succeeded'
      ) {
        this.block(
          'inspection_tool_failed',
        );
        return;
      }

      if (
        !this.issueEvidence(
          'inspection',
          'passed',
          'tool',
          'inspection.passed',
        )
      ) {
        this.block(
          'evidence_issue_failed',
        );
        return;
      }

      this.advance('inspected');
      return;
    }

    if (phase === 'research') {
      if (
        this.job.research
          === 'not_required'
      ) {
        if (
          !this.issueEvidence(
            'research',
            'not_required',
            'system',
            'research.not_required',
          )
        ) {
          this.block(
            'evidence_issue_failed',
          );
          return;
        }

        this.advance(
          'research_not_required',
        );
        return;
      }

      const allowed =
        this.job.research
          === 'required'
          ? ['request_tools']
          : [
              'request_tools',
              'analysis',
            ];
      const decision =
        await this.modelDecision(
          'worker',
          allowed,
          signal,
        );

      if (!decision) {
        return;
      }

      if (
        decision.kind === 'analysis'
      ) {
        if (
          decision.payload
            .summaryCode
            !== 'research.not_required'
        ) {
          this.block(
            'research_resolution_invalid',
          );
          return;
        }

        if (
          !this.issueEvidence(
            'research',
            'not_required',
            'system',
            'research.not_required',
          )
        ) {
          this.block(
            'evidence_issue_failed',
          );
          return;
        }

        this.advance(
          'research_not_required',
        );
        return;
      }

      const result =
        await this.executeTools(
          decision,
          { readOnly: true },
          signal,
        );

      if (!result) {
        return;
      }

      if (
        result.status
          !== 'succeeded'
      ) {
        this.block(
          'research_tool_failed',
        );
        return;
      }

      if (
        !this.issueEvidence(
          'research',
          'passed',
          'tool',
          'research.passed',
        )
      ) {
        this.block(
          'evidence_issue_failed',
        );
        return;
      }

      this.advance(
        'research_completed',
      );
      return;
    }

    if (phase === 'plan') {
      const decision =
        await this.modelDecision(
          'worker',
          ['plan'],
          signal,
        );

      if (decision) {
        this.advance('planned');
      }

      return;
    }

    if (phase === 'implement') {
      const decision =
        await this.modelDecision(
          'worker',
          [
            'implementation_proposal',
          ],
          signal,
        );

      if (!decision) {
        return;
      }

      const result =
        await this.executeTools(
          decision,
          {
            requireMutation: true,
          },
          signal,
        );

      if (!result) {
        return;
      }

      if (
        result.status
          === 'succeeded'
      ) {
        if (
          !this.advance(
            'implementation_mutated',
          )
        ) {
          return;
        }

        if (
          !this.issueEvidence(
            'implementation',
            'passed',
            'tool',
            'implementation.passed',
          )
        ) {
          this.block(
            'evidence_issue_failed',
          );
        }
        return;
      }

      const event =
        result.mutationOccurred
          ? 'implementation_failed_after_mutation'
          : 'implementation_failed';

      if (!this.advance(event)) {
        return;
      }

      if (
        result.mutationOccurred
        && !this.issueEvidence(
          'implementation',
          'failed',
          'tool',
          'implementation.failed',
        )
      ) {
        this.block(
          'evidence_issue_failed',
        );
      }

      return;
    }

    if (phase === 'build') {
      await this.handleBuildOrTest(
        'build',
        signal,
      );
      return;
    }

    if (phase === 'test') {
      await this.handleBuildOrTest(
        'test',
        signal,
      );
      return;
    }

    if (phase === 'diagnose') {
      const decision =
        await this.modelDecision(
          'worker',
          ['diagnosis'],
          signal,
        );

      if (decision) {
        this.advance('diagnosed');
      }

      return;
    }

    if (phase === 'repair') {
      if (
        this.state.repairCycles
          >= this.job.limits
            .maxRepairCycles
      ) {
        this.block(
          'repair_cycle_limit',
        );
        return;
      }

      const decision =
        await this.modelDecision(
          'worker',
          ['repair_proposal'],
          signal,
        );

      if (!decision) {
        return;
      }

      const result =
        await this.executeTools(
          decision,
          {
            requireMutation: true,
          },
          signal,
        );

      if (!result) {
        return;
      }

      if (
        result.status
          === 'succeeded'
      ) {
        if (
          !this.advance(
            'repair_mutated',
          )
        ) {
          return;
        }

        if (
          !this.issueEvidence(
            'implementation',
            'passed',
            'tool',
            'repair.passed',
          )
        ) {
          this.block(
            'evidence_issue_failed',
          );
        }
        return;
      }

      if (
        !this.advance(
          result.mutationOccurred
            ? 'repair_failed_after_mutation'
            : 'repair_failed',
        )
      ) {
        return;
      }

      if (
        result.mutationOccurred
        && !this.issueEvidence(
          'implementation',
          'failed',
          'tool',
          'repair.failed',
        )
      ) {
        this.block(
          'evidence_issue_failed',
        );
      }

      return;
    }

    if (phase === 'retest') {
      if (
        this.job.buildRequired
        && !this.hasEvidence(
          'build',
          'passed',
        )
      ) {
        await this.handleBuildOrTest(
          'build',
          signal,
          { retest: true },
        );
        return;
      }

      if (
        this.job.testRequired
        && !this.hasEvidence(
          'test',
          'passed',
        )
      ) {
        await this.handleBuildOrTest(
          'test',
          signal,
          { retest: true },
        );

        if (
          this.state.phase
            !== 'retest'
        ) {
          return;
        }
      }

      if (
        (
          !this.job.buildRequired
          || this.hasEvidence(
            'build',
            'passed',
          )
        )
        && (
          !this.job.testRequired
          || this.hasEvidence(
            'test',
            'passed',
          )
        )
      ) {
        this.advance(
          'retest_passed',
        );
      }

      return;
    }

    if (phase === 'review') {
      if (
        this.state.reviewerVerdict
          !== 'accepted'
      ) {
        const decision =
          await this.modelDecision(
            'reviewer',
            [
              'review',
              'request_tools',
            ],
            signal,
          );

        if (!decision) {
          return;
        }

        if (
          decision.kind
            === 'request_tools'
        ) {
          const result =
            await this.executeTools(
              decision,
              { readOnly: true },
              signal,
            );

          if (!result) {
            return;
          }

          if (
            result.status
              !== 'succeeded'
          ) {
            this.block(
              'reviewer_tool_failed',
            );
          }

          return;
        }

        const accepted =
          decision.payload.verdict
            === 'accept';

        if (
          !this.issueEvidence(
            'review',
            accepted
              ? 'accepted'
              : 'rejected',
            'reviewer',
            accepted
              ? 'review.accepted'
              : 'review.rejected',
          )
        ) {
          this.block(
            'evidence_issue_failed',
          );
          return;
        }

        this.advance(
          accepted
            ? 'review_accepted'
            : 'review_rejected',
        );
        return;
      }

      const finish =
        await this.modelDecision(
          'worker',
          ['finish_claim'],
          signal,
        );

      if (!finish) {
        return;
      }

      if (!this.outerActive()) {
        this.block(
          'outer_task_inactive',
        );
        return;
      }

      const completion =
        evaluateCodingCompletion({
          job: this.job,
          state: this.state,
          evidence:
            this.evidence.current(
              this.state.revision,
            ),
          finishDecision:
            finish,
          outerLifecycleState:
            'running',
        });

      if (!completion.allowed) {
        this.block(
          completion.reason,
        );
        return;
      }

      this.advance(
        'finish_accepted',
      );
      return;
    }

    this.block(
      'workflow_phase_unhandled',
    );
  }

  async run({
    signal,
  } = {}) {
    while (
      this.state.phase
        !== 'finished'
      && this.state.phase
        !== 'blocked'
    ) {
      await this.tick(signal);
    }

    return this.snapshot();
  }
}
