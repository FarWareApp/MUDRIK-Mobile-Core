import {
  TaskAdmissionRegistry,
} from './task-admission.mjs';

import {
  createTaskLifecycle,
} from './task-lifecycle.mjs';

import {
  evaluateTaskPolicy,
} from './policy.mjs';

import {
  ComputerTaskRunner,
  policyContextForStep,
} from './task-runner.mjs';

function result(
  accepted,
  status,
  reason,
  record = null,
) {
  return Object.freeze({
    accepted,
    status,
    reason,
    record,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function validTrustedTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}
export class DurableComputerAgentRuntime {
  constructor({
    accountId,
    deviceId,
    trustedSigners = [],
    store,
    grants = [],
    clock = () => Date.now(),
    onEvent = () => {},
    terminalSandbox,
    secretResolver,
    networkAdapter,
    filesystemAdapter,
  } = {}) {
    if (
      !store
      || typeof store.init !== 'function'
      || typeof store.get !== 'function'
    ) {
      throw new TypeError(
        'A durable task store is required.',
      );
    }

    this.accountId = accountId;
    this.deviceId = deviceId;
    this.store = store;
    this.grants =
      Array.isArray(grants)
        ? grants
        : [];
    this.clock = clock;
    this.onEvent = onEvent;
    this.admission =
      new TaskAdmissionRegistry({
        accountId,
        deviceId,
        trustedSigners,
      });
    this.runner =
      new ComputerTaskRunner({
        grants: this.grants,
        clock: this.clock,
        onEvent: () => {},
        ...(terminalSandbox
          ? { terminalSandbox }
          : {}),
        ...(secretResolver
          ? { secretResolver }
          : {}),
        ...(networkAdapter
          ? { networkAdapter }
          : {}),
        ...(filesystemAdapter
          ? { filesystemAdapter }
          : {}),
      });
    this.active = new Set();
    this.initialized = false;
    this.initializing = null;
  }
  emitEvent(event) {
    try {
      this.onEvent(event);
    } catch {
      // Observers are non-authoritative and must
      // never break already durable runtime state.
    }
  }

  now() {
    const value = this.clock();

    if (!validTrustedTime(value)) {
      throw new TypeError(
        'Runtime clock returned invalid time.',
      );
    }

    return value;
  }

  setGrants(grants) {
    this.grants =
      Array.isArray(grants)
        ? grants
        : [];
    this.runner.setGrants(
      this.grants,
    );
  }

  async init() {
    if (this.initialized) {
      return Object.freeze({
        restored: 0,
        recovered: 0,
      });
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing =
      this.initializeInternal();

    try {
      return await this.initializing;
    } finally {
      this.initializing = null;
    }
  }
  async initializeInternal() {
    await this.store.init();

    const records =
      await this.store.list();

    for (const record of records) {
      const restored =
        this.admission
          .restorePersistedTask(
            record.task,
          );

      if (!restored.accepted) {
        throw new Error(
          'Persisted task failed admission restore: '
          + restored.reason,
        );
      }
    }

    const recovered =
      await this.store
        .recoverInterrupted(
          this.now(),
        );

    this.initialized = true;

    for (const record of recovered) {
      const event =
        record.events.at(-1);

      if (event) {
        this.emitEvent(event);
      }
    }

    return Object.freeze({
      restored: records.length,
      recovered: recovered.length,
    });
  }
  async audit(
    taskId,
    event,
    trustedTimeMs = this.now(),
  ) {
    const appended =
      await this.store.appendEvent(
        taskId,
        event,
        trustedTimeMs,
      );

    if (!appended.accepted) {
      throw new Error(
        'Durable task audit failed: '
        + appended.reason,
      );
    }

    this.emitEvent(appended.event);
    return appended.record;
  }

  async admit(
    envelope,
  ) {
    await this.init();

    const now = this.now();
    const admitted =
      this.admission.admit(
        envelope,
        now,
      );

    if (!admitted.accepted) {
      return result(
        false,
        'rejected',
        admitted.reason,
      );
    }

    const existing =
      await this.store.get(
        admitted.task.taskId,
      );

    if (existing) {
      return result(
        true,
        existing.lifecycle.state,
        'duplicate',
        existing,
      );
    }
    const lifecycle =
      createTaskLifecycle(
        admitted.task.taskId,
        now,
      );

    if (!lifecycle.accepted) {
      return result(
        false,
        'rejected',
        lifecycle.reason,
      );
    }

    const created =
      await this.store.create(
        admitted.task,
        lifecycle.lifecycle,
        now,
      );

    if (!created.accepted) {
      return result(
        false,
        'rejected',
        created.reason,
      );
    }

    const audited =
      await this.audit(
        admitted.task.taskId,
        {
          type: 'task.admitted',
        },
        now,
      );

    return result(
      true,
      audited.lifecycle.state,
      admitted.idempotent
        ? 'duplicate'
        : 'admitted',
      audited,
    );
  }
  stepPolicy(
    task,
    step,
    trustedTimeMs,
  ) {
    const contextByCapability =
      policyContextForStep(step);

    if (!contextByCapability) {
      return Object.freeze({
        allowed: false,
        reason: 'invalid-tool-input',
      });
    }

    return evaluateTaskPolicy({
      task: {
        ...task,
        requestedCapabilities:
          step.requiredCapabilities,
        steps: [step],
      },
      grants: this.grants,
      contextByCapability,
      trustedNowMs:
        trustedTimeMs,
    });
  }

  remainingPolicy(
    record,
    trustedTimeMs,
  ) {
    if (
      record.checkpoint
        .inFlightStep !== null
    ) {
      return Object.freeze({
        allowed: false,
        reason: 'uncertain-step',
      });
    }

    for (
      let index =
        record.checkpoint
          .nextStepIndex;
      index < record.task.steps.length;
      index += 1
    ) {
      const policy =
        this.stepPolicy(
          record.task,
          record.task.steps[index],
          trustedTimeMs,
        );

      if (!policy.allowed) {
        return policy;
      }
    }

    return Object.freeze({
      allowed: true,
      reason: 'authorized',
    });
  }
  async prepare(
    taskId,
  ) {
    await this.init();

    let record =
      await this.store.get(taskId);

    if (!record) {
      return result(
        false,
        'missing',
        'not_found',
      );
    }

    if (
      record.lifecycle.state
        === 'succeeded'
    ) {
      return result(
        true,
        'succeeded',
        'duplicate',
        record,
      );
    }

    if (
      record.lifecycle.state
        === 'failed'
      || record.lifecycle.state
        === 'cancelled'
    ) {
      return result(
        false,
        record.lifecycle.state,
        'terminal_state',
        record,
      );
    }

    if (
      record.lifecycle.state
        === 'paused'
      || record.lifecycle.state
        === 'blocked'
    ) {
      return result(
        false,
        record.lifecycle.state,
        'resume_required',
        record,
      );
    }

    if (
      record.lifecycle.state
        === 'awaiting_approval'
    ) {
      const now = this.now();
      const policy =
        this.remainingPolicy(
          record,
          now,
        );

      if (!policy.allowed) {
        return result(
          false,
          record.lifecycle.state,
          policy.reason,
          record,
        );
      }

      const approved =
        await this.store
          .updateLifecycle(
            taskId,
            'approve',
            now,
          );

      if (!approved.accepted) {
        return result(
          false,
          record.lifecycle.state,
          approved.reason,
          approved.record,
        );
      }

      record = approved.record;
    }

    if (
      record.lifecycle.state
        === 'draft'
    ) {
      const now = this.now();
      const policy =
        this.remainingPolicy(
          record,
          now,
        );

      if (!policy.allowed) {
        const waiting =
          await this.store
            .updateLifecycle(
              taskId,
              'request_approval',
              now,
            );

        if (waiting.accepted) {
          record =
            await this.audit(
              taskId,
              {
                type: 'task.blocked',
                reason:
                  policy.reason,
              },
              now,
            );
        }

        return result(
          false,
          record.lifecycle.state,
          policy.reason,
          record,
        );
      }

      const approved =
        await this.store
          .updateLifecycle(
            taskId,
            'approve',
            now,
          );

      if (!approved.accepted) {
        return result(
          false,
          record.lifecycle.state,
          approved.reason,
          approved.record,
        );
      }

      record = approved.record;
    }
    if (
      record.lifecycle.state
        === 'approved'
    ) {
      const now = this.now();
      const queued =
        await this.store
          .updateLifecycle(
            taskId,
            'queue',
            now,
          );

      if (!queued.accepted) {
        return result(
          false,
          record.lifecycle.state,
          queued.reason,
          queued.record,
        );
      }

      record =
        await this.audit(
          taskId,
          {
            type: 'task.queued',
          },
          now,
        );
    }

    return result(
      true,
      record.lifecycle.state,
      'prepared',
      record,
    );
  }
  async run(
    taskId,
  ) {
    await this.init();

    if (this.active.has(taskId)) {
      const current =
        await this.store.get(taskId);

      return result(
        false,
        current?.lifecycle.state
          ?? 'missing',
        'already_running',
        current,
      );
    }

    const prepared =
      await this.prepare(taskId);

    if (!prepared.accepted) {
      return prepared;
    }

    let record = prepared.record;

    if (
      prepared.status === 'succeeded'
      && prepared.reason === 'duplicate'
    ) {
      return prepared;
    }

    if (
      record.lifecycle.state
        !== 'queued'
    ) {
      return result(
        false,
        record.lifecycle.state,
        'not_queued',
        record,
      );
    }

    const startTime = this.now();
    const started =
      await this.store
        .updateLifecycle(
          taskId,
          'start',
          startTime,
        );

    if (!started.accepted) {
      return result(
        false,
        record.lifecycle.state,
        started.reason,
        started.record,
      );
    }
    record =
      await this.audit(
        taskId,
        {
          type: 'task.started',
        },
        startTime,
      );

    this.active.add(taskId);

    try {
      while (
        record.checkpoint
          .nextStepIndex
        < record.task.steps.length
      ) {
        record =
          await this.store.get(
            taskId,
          );

        if (
          !record
          || record.lifecycle.state
            !== 'running'
        ) {
          return result(
            false,
            record?.lifecycle.state
              ?? 'missing',
            'interrupted',
            record,
          );
        }

        if (
          record.checkpoint
            .inFlightStep !== null
        ) {
          const blocked =
            await this.store
              .updateLifecycle(
                taskId,
                'block',
                this.now(),
              );

          return result(
            false,
            blocked.record
              ?.lifecycle.state
              ?? 'blocked',
            'uncertain_step',
            blocked.record,
          );
        }
        const stepIndex =
          record.checkpoint
            .nextStepIndex;
        const step =
          record.task.steps[
            stepIndex
          ];
        const policyTime =
          this.now();
        const policy =
          this.stepPolicy(
            record.task,
            step,
            policyTime,
          );

        if (!policy.allowed) {
          const blocked =
            await this.store
              .updateLifecycle(
                taskId,
                'block',
                policyTime,
              );

          const audited =
            blocked.accepted
              ? await this.audit(
                  taskId,
                  {
                    type:
                      'task.blocked',
                    stepId:
                      step.stepId,
                    reason:
                      policy.reason,
                  },
                  policyTime,
                )
              : blocked.record;

          return result(
            false,
            audited?.lifecycle.state
              ?? 'blocked',
            policy.reason,
            audited,
          );
        }

        const marked =
          await this.store
            .markStepStarted(
              taskId,
              {
                stepIndex,
                stepId:
                  step.stepId,
              },
              policyTime,
            );
        if (!marked.accepted) {
          return result(
            false,
            record.lifecycle.state,
            marked.reason,
            marked.record,
          );
        }

        record =
          await this.audit(
            taskId,
            {
              type: 'step.started',
              stepId: step.stepId,
            },
            policyTime,
          );

        this.runner.setGrants(
          this.grants,
        );

        const execution =
          await this.runner.run({
            ...record.task,
            requestedCapabilities:
              step.requiredCapabilities,
            steps: [step],
          });

        const finishTime =
          this.now();

        if (
          execution.status
            === 'cancelled'
          || execution.steps[0]
            ?.result?.aborted
        ) {
          const current =
            await this.store.get(
              taskId,
            );

          return result(
            false,
            current?.lifecycle.state
              ?? 'cancelled',
            'execution_aborted',
            current,
          );
        }
        if (
          execution.status
            === 'blocked'
        ) {
          const blocked =
            await this.store
              .updateLifecycle(
                taskId,
                'block',
                finishTime,
              );

          const audited =
            blocked.accepted
              ? await this.audit(
                  taskId,
                  {
                    type:
                      'task.blocked',
                    stepId:
                      step.stepId,
                    reason:
                      execution.policy
                        ?.reason
                      ?? 'policy_denied',
                  },
                  finishTime,
                )
              : blocked.record;

          return result(
            false,
            audited?.lifecycle.state
              ?? 'blocked',
            execution.policy
              ?.reason
              ?? 'policy_denied',
            audited,
          );
        }

        const stepResult =
          execution.steps[0];
        const succeeded =
          stepResult?.status
            === 'succeeded';
        const outcome =
          succeeded
            ? 'succeeded'
            : step.continueOnError
              ? 'failed_continued'
              : 'failed';
        const checkpointed =
          await this.store
            .checkpointStep(
              taskId,
              {
                stepIndex,
                stepId:
                  step.stepId,
                outcome,
              },
              finishTime,
            );

        if (!checkpointed.accepted) {
          return result(
            false,
            record.lifecycle.state,
            checkpointed.reason,
            checkpointed.record,
          );
        }

        record =
          await this.audit(
            taskId,
            {
              type:
                succeeded
                  ? 'step.checkpointed'
                  : 'step.failed',
              stepId: step.stepId,
              outcome,
              reason:
                succeeded
                  ? null
                  : 'step_failed',
            },
            finishTime,
          );

        if (
          !succeeded
          && !step.continueOnError
        ) {
          const failed =
            await this.store
              .updateLifecycle(
                taskId,
                'fail',
                finishTime,
              );

          if (failed.accepted) {
            record =
              await this.audit(
                taskId,
                {
                  type: 'task.failed',
                  stepId:
                    step.stepId,
                  reason:
                    'step_failed',
                },
                finishTime,
              );
          }
          return result(
            false,
            record.lifecycle.state,
            'step_failed',
            record,
          );
        }
      }

      const doneTime = this.now();
      const succeeded =
        await this.store
          .updateLifecycle(
            taskId,
            'succeed',
            doneTime,
          );

      if (!succeeded.accepted) {
        return result(
          false,
          succeeded.record
            ?.lifecycle.state
            ?? 'failed',
          succeeded.reason,
          succeeded.record,
        );
      }

      record =
        await this.audit(
          taskId,
          {
            type: 'task.succeeded',
          },
          doneTime,
        );

      return result(
        true,
        'succeeded',
        'succeeded',
        record,
      );
    } finally {
      this.active.delete(taskId);
    }
  }
  async pause(
    taskId,
  ) {
    await this.init();

    const now = this.now();
    const paused =
      await this.store
        .updateLifecycle(
          taskId,
          'pause',
          now,
        );

    if (!paused.accepted) {
      return result(
        false,
        paused.record
          ?.lifecycle.state
          ?? 'missing',
        paused.reason,
        paused.record,
      );
    }

    this.runner.cancel(taskId);

    const record =
      paused.reason === 'duplicate'
        ? paused.record
        : await this.audit(
            taskId,
            {
              type: 'task.paused',
            },
            now,
          );

    return result(
      true,
      record.lifecycle.state,
      paused.reason,
      record,
    );
  }

  async resume(
    taskId,
  ) {
    await this.init();

    const current =
      await this.store.get(taskId);

    if (!current) {
      return result(
        false,
        'missing',
        'not_found',
      );
    }
    if (
      current.checkpoint
        .inFlightStep !== null
    ) {
      return result(
        false,
        current.lifecycle.state,
        'uncertain_step',
        current,
      );
    }

    const now = this.now();
    const resumed =
      await this.store
        .updateLifecycle(
          taskId,
          'resume',
          now,
        );

    if (!resumed.accepted) {
      return result(
        false,
        resumed.record
          ?.lifecycle.state
          ?? current.lifecycle.state,
        resumed.reason,
        resumed.record,
      );
    }

    const record =
      resumed.reason === 'duplicate'
        ? resumed.record
        : await this.audit(
            taskId,
            {
              type: 'task.resumed',
            },
            now,
          );

    return result(
      true,
      record.lifecycle.state,
      resumed.reason,
      record,
    );
  }
  async cancel(
    taskId,
  ) {
    await this.init();

    const now = this.now();
    const cancelled =
      await this.store
        .updateLifecycle(
          taskId,
          'cancel',
          now,
        );

    if (!cancelled.accepted) {
      return result(
        false,
        cancelled.record
          ?.lifecycle.state
          ?? 'missing',
        cancelled.reason,
        cancelled.record,
      );
    }

    this.runner.cancel(taskId);

    const record =
      cancelled.reason === 'duplicate'
        ? cancelled.record
        : await this.audit(
            taskId,
            {
              type: 'task.cancelled',
            },
            now,
          );

    return result(
      true,
      record.lifecycle.state,
      cancelled.reason,
      record,
    );
  }

  async pauseAll() {
    await this.init();

    const records =
      await this.store.list();
    const results = [];

    for (const record of records) {
      if (
        record.lifecycle.state
          === 'queued'
        || record.lifecycle.state
          === 'running'
      ) {
        results.push(
          await this.pause(
            record.task.taskId,
          ),
        );
      }
    }

    return Object.freeze(results);
  }

  async getTask(taskId) {
    await this.init();
    return this.store.get(taskId);
  }
}
