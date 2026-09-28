import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';

import {
  parseCodingJob,
} from '../src/coding-job.mjs';

import {
  CodingDecisionRegistry,
  parseCodingModelDecision,
} from '../src/coding-model-decision.mjs';

import {
  createCodingWorkflowState,
  transitionCodingWorkflow,
} from '../src/coding-workflow.mjs';

import {
  CodingEvidenceRegistry,
  issueCodingEvidence,
} from '../src/coding-evidence.mjs';

import {
  evaluateCodingCompletion,
} from '../src/coding-completion.mjs';

import {
  invokeModelAdapter,
} from '../src/model-adapter.mjs';

const IDS = Object.freeze({
  jobId:
    'cjob_0123456789abcdef',
  sessionId:
    'csession_0123456789abcdef',
  accountId:
    'acct_0123456789abcdef',
  deviceId:
    'dev_0123456789abcdef',
  outerTaskId:
    'ctask_0123456789abcdef',
});

function job(
  overrides = {},
) {
  return parseCodingJob({
    ...IDS,
    goal:
      'Repair the deterministic test.',
    workspaceRoot:
      os.tmpdir(),
    requestedCapabilities: [
      'filesystem.read',
      'filesystem.write',
      'terminal.execute',
    ],
    research: 'optional',
    observationOnly: false,
    buildRequired: true,
    testRequired: true,
    limits: {
      maxModelTurns: 24,
      maxRepairCycles: 4,
      maxToolRequestsPerTurn: 4,
      maxToolRequestsPerJob: 32,
      maxVerificationRetries: 4,
      maxDecisionBytes:
        64 * 1024,
    },
    ...overrides,
  });
}

function decision({
  id = 'cdecision_0123456789abcdef',
  role = 'worker',
  turn = 1,
  revision = 0,
  kind = 'analysis',
  payload = {
    summaryCode:
      'analysis.complete',
  },
} = {}) {
  return {
    decisionId: id,
    jobId: IDS.jobId,
    sessionId: IDS.sessionId,
    role,
    turn,
    revision,
    kind,
    payload,
  };
}

function evidence({
  id,
  revision,
  kind,
  outcome,
  source = 'tool',
} = {}) {
  return issueCodingEvidence({
    evidenceId: id,
    jobId: IDS.jobId,
    sessionId: IDS.sessionId,
    revision,
    kind,
    outcome,
    summaryCode:
      kind + '.' + outcome,
    acceptedAtMs: 10_000,
    source,
  });
}

test(
  'coding job parser is exact bounded and rejects observation jobs with mutation verification',
  () => {
    assert.ok(job());

    assert.equal(
      job({
        hiddenAuthority: true,
      }),
      null,
    );

    assert.equal(
      job({
        requestedCapabilities: [
          'filesystem.read',
          'filesystem.read',
        ],
      }),
      null,
    );

    assert.equal(
      job({
        observationOnly: true,
        buildRequired: true,
      }),
      null,
    );
  },
);

test(
  'model decision parser rejects unknown authority fields role confusion and malformed tool requests',
  () => {
    assert.ok(
      parseCodingModelDecision(
        decision(),
      ),
    );

    assert.equal(
      parseCodingModelDecision({
        ...decision(),
        approval: true,
      }),
      null,
    );

    assert.equal(
      parseCodingModelDecision(
        decision({
          role: 'reviewer',
          kind:
            'implementation_proposal',
          payload: {
            purposeCode:
              'mutate.code',
            steps: [],
          },
        }),
      ),
      null,
    );

    assert.equal(
      parseCodingModelDecision(
        decision({
          role: 'reviewer',
          kind: 'request_tools',
          payload: {
            purposeCode:
              'review.mutate',
            steps: [{
              stepId:
                'cstep_3333333333333333',
              tool: 'filesystem',
              summary:
                'Mutate candidate',
              requiredCapabilities: [
                'filesystem.write',
              ],
              input: {
                operation: 'write',
                path:
                  os.tmpdir()
                  + '/candidate.txt',
                encoding: 'utf8',
                content: 'bad',
              },
              continueOnError: false,
            }],
          },
        }),
      ),
      null,
    );

    assert.equal(
      parseCodingModelDecision(
        decision({
          kind: 'request_tools',
          payload: {
            purposeCode:
              'inspect.repo',
            steps: [{
              stepId:
                'cstep_0123456789abcdef',
              tool:
                'terminal;system.admin',
              summary:
                'Injected tool',
              requiredCapabilities: [
                'terminal.execute',
              ],
              input: {
                executable:
                  process.execPath,
                cwd: os.tmpdir(),
              },
              continueOnError: false,
            }],
          },
        }),
      ),
      null,
    );
  },
);

test(
  'decision registry is exact-turn replay-safe and conflict-safe',
  () => {
    const registry =
      new CodingDecisionRegistry({
        jobId: IDS.jobId,
        sessionId:
          IDS.sessionId,
      });

    const first =
      registry.accept(
        decision(),
        {
          role: 'worker',
          turn: 1,
          revision: 0,
          maxBytes:
            64 * 1024,
        },
      );

    assert.equal(
      first.accepted,
      true,
    );
    assert.equal(
      first.duplicate,
      false,
    );

    const duplicate =
      registry.accept(
        decision(),
        {
          role: 'worker',
          turn: 1,
          revision: 0,
          maxBytes:
            64 * 1024,
        },
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const conflict =
      registry.accept(
        decision({
          id:
            'cdecision_1111111111111111',
          payload: {
            summaryCode:
              'analysis.changed',
          },
        }),
        {
          role: 'worker',
          turn: 1,
          revision: 0,
          maxBytes:
            64 * 1024,
        },
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'model_turn_conflict',
    );

    const stale =
      registry.accept(
        decision({
          id:
            'cdecision_2222222222222222',
          turn: 2,
        }),
        {
          role: 'worker',
          turn: 3,
          revision: 0,
          maxBytes:
            64 * 1024,
        },
      );

    assert.equal(
      stale.reason,
      'model_decision_stale',
    );
  },
);

test(
  'workflow revision increments on mutation and old review state is invalidated',
  () => {
    const value = job();
    let state =
      createCodingWorkflowState(
        value,
        1,
      );

    for (
      const [
        event,
        expected,
      ] of [
        [
          'understood',
          'inspect',
        ],
        [
          'inspected',
          'research',
        ],
        [
          'research_not_required',
          'plan',
        ],
        [
          'planned',
          'implement',
        ],
        [
          'implementation_mutated',
          'build',
        ],
        [
          'build_passed',
          'test',
        ],
        [
          'test_passed',
          'review',
        ],
        [
          'review_rejected',
          'diagnose',
        ],
        [
          'diagnosed',
          'repair',
        ],
        [
          'repair_mutated',
          'retest',
        ],
      ]
    ) {
      state =
        transitionCodingWorkflow(
          state,
          event,
          {
            job: value,
            trustedNowMs:
              state.updatedAtMs + 1,
          },
        );

      assert.equal(
        state.phase,
        expected,
      );
    }

    assert.equal(
      state.revision,
      2,
    );
    assert.equal(
      state.repairCycles,
      1,
    );
    assert.equal(
      state.reviewerVerdict,
      null,
    );
  },
);

test(
  'required research cannot be silently marked not required',
  () => {
    const value =
      job({
        research: 'required',
      });

    let state =
      createCodingWorkflowState(
        value,
        1,
      );

    state =
      transitionCodingWorkflow(
        state,
        'understood',
        {
          job: value,
          trustedNowMs: 2,
        },
      );
    state =
      transitionCodingWorkflow(
        state,
        'inspected',
        {
          job: value,
          trustedNowMs: 3,
        },
      );

    assert.equal(
      transitionCodingWorkflow(
        state,
        'research_not_required',
        {
          job: value,
          trustedNowMs: 4,
        },
      ),
      null,
    );
  },
);

test(
  'completion requires current-revision implementation build test and reviewer evidence',
  () => {
    const value = job();
    let state =
      createCodingWorkflowState(
        value,
        1,
      );

    const events = [
      'understood',
      'inspected',
      'research_not_required',
      'planned',
      'implementation_mutated',
      'build_passed',
      'test_passed',
      'review_accepted',
    ];

    for (const event of events) {
      state =
        transitionCodingWorkflow(
          state,
          event,
          {
            job: value,
            trustedNowMs:
              state.updatedAtMs + 1,
          },
        );
    }

    const revision =
      state.revision;
    const registry =
      new CodingEvidenceRegistry({
        jobId: IDS.jobId,
        sessionId:
          IDS.sessionId,
      });

    const current = [
      evidence({
        id:
          'cevidence_1111111111111111',
        revision,
        kind: 'implementation',
        outcome: 'passed',
      }),
      evidence({
        id:
          'cevidence_2222222222222222',
        revision,
        kind: 'build',
        outcome: 'passed',
      }),
      evidence({
        id:
          'cevidence_3333333333333333',
        revision,
        kind: 'test',
        outcome: 'passed',
      }),
      evidence({
        id:
          'cevidence_4444444444444444',
        revision,
        kind: 'review',
        outcome: 'accepted',
        source: 'reviewer',
      }),
    ];

    for (const item of current) {
      assert.equal(
        registry.add(item).accepted,
        true,
      );
    }

    const decisionRegistry =
      new CodingDecisionRegistry({
        jobId: IDS.jobId,
        sessionId:
          IDS.sessionId,
      });
    const finishAccepted =
      decisionRegistry.accept(
        decision({
          id:
            'cdecision_9999999999999999',
          turn: 9,
          revision,
          kind: 'finish_claim',
          payload: {
            summaryCode:
              'finish.ready',
          },
        }),
        {
          role: 'worker',
          turn: 9,
          revision,
          maxBytes:
            64 * 1024,
        },
      );
    const finish =
      finishAccepted.decision;

    assert.equal(
      evaluateCodingCompletion({
        job: value,
        state,
        evidence:
          registry.current(revision),
        finishDecision: finish,
        outerLifecycleState:
          'running',
      }).allowed,
      true,
    );

    assert.equal(
      evaluateCodingCompletion({
        job: value,
        state,
        evidence:
          registry.current(revision),
        finishDecision: {
          ...finish,
        },
        outerLifecycleState:
          'running',
      }).allowed,
      false,
    );

    const oldTest =
      evidence({
        id:
          'cevidence_5555555555555555',
        revision:
          revision - 1,
        kind: 'test',
        outcome: 'passed',
      });

    assert.equal(
      evaluateCodingCompletion({
        job: value,
        state,
        evidence: [
          current[0],
          current[1],
          oldTest,
          current[3],
        ],
        finishDecision: finish,
        outerLifecycleState:
          'running',
      }).reason,
      'test_evidence_missing',
    );
  },
);

test(
  'issued evidence provenance cannot be forged by a copied object',
  () => {
    const item =
      evidence({
        id:
          'cevidence_6666666666666666',
        revision: 1,
        kind: 'test',
        outcome: 'passed',
      });

    const registry =
      new CodingEvidenceRegistry({
        jobId: IDS.jobId,
        sessionId:
          IDS.sessionId,
      });

    assert.equal(
      registry.add({
        ...item,
      }).accepted,
      false,
    );
  },
);

test(
  'model adapter normalizes provider exception timeout and abort',
  async () => {
    const request = {
      role: 'worker',
      jobId: IDS.jobId,
    };

    assert.equal(
      (
        await invokeModelAdapter(
          {
            async invoke() {
              throw new Error(
                'provider detail',
              );
            },
          },
          request,
        )
      ).reason,
      'model_provider_error',
    );

    assert.equal(
      (
        await invokeModelAdapter(
          {
            async invoke() {
              await new Promise(
                () => {},
              );
            },
          },
          request,
          {
            timeoutMs: 100,
          },
        )
      ).reason,
      'model_timeout',
    );

    const controller =
      new AbortController();

    const pending =
      invokeModelAdapter(
        {
          async invoke(
            _request,
            { signal },
          ) {
            await new Promise(
              (resolve, reject) => {
                signal.addEventListener(
                  'abort',
                  () =>
                    reject(
                      new Error(
                        'aborted',
                      ),
                    ),
                  { once: true },
                );
              },
            );
          },
        },
        request,
        {
          timeoutMs: 2_000,
          signal:
            controller.signal,
        },
      );

    controller.abort();

    assert.equal(
      (await pending).reason,
      'model_aborted',
    );
  },
);
