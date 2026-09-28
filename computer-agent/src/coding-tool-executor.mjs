const CODE =
  /^[a-z][a-z0-9_.-]{0,127}$/;

const MUTATING =
  new Set([
    'filesystem.write',
    'filesystem.delete',
    'git.write',
    'terminal.execute',
    'process.start',
    'process.stop',
    'browser.control',
    'clipboard.write',
    'system.settings',
    'system.admin',
  ]);

const STATUSES =
  new Set([
    'succeeded',
    'failed',
    'blocked',
    'cancelled',
  ]);

function plainObject(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype
    || prototype === null
  );
}

export function codingStepCanMutate(
  step,
) {
  return (
    step
    && Array.isArray(
      step.requiredCapabilities,
    )
    && step.requiredCapabilities.some(
      (capability) =>
        MUTATING.has(capability),
    )
  );
}

export function normalizeCodingToolExecutionResult(
  value,
  steps,
) {
  if (
    !plainObject(value)
    || Object.keys(value).length
      !== 4
    || !Object.hasOwn(
      value,
      'status',
    )
    || !Object.hasOwn(
      value,
      'completedStepIds',
    )
    || !Object.hasOwn(
      value,
      'summaryCode',
    )
    || !Object.hasOwn(
      value,
      'observation',
    )
    || !STATUSES.has(value.status)
    || !Array.isArray(
      value.completedStepIds,
    )
    || value.completedStepIds.length
      > 128
    || new Set(
      value.completedStepIds,
    ).size
      !== value.completedStepIds.length
    || typeof value.summaryCode
      !== 'string'
    || !CODE.test(
      value.summaryCode,
    )
    || typeof value.observation
      !== 'string'
    || Buffer.byteLength(
      value.observation,
      'utf8',
    ) > 64 * 1024
    || value.observation.includes('\0')
    || !Array.isArray(steps)
  ) {
    return null;
  }

  const byId =
    new Map(
      steps.map(
        (step) => [
          step.stepId,
          step,
        ],
      ),
    );

  if (
    value.completedStepIds.some(
      (stepId) =>
        typeof stepId !== 'string'
        || !byId.has(stepId),
    )
    || (
      value.status === 'succeeded'
      && value.completedStepIds.length
        !== steps.length
    )
  ) {
    return null;
  }

  const mutationOccurred =
    value.completedStepIds.some(
      (stepId) =>
        codingStepCanMutate(
          byId.get(stepId),
        ),
    );

  return Object.freeze({
    status: value.status,
    completedStepIds:
      Object.freeze([
        ...value.completedStepIds,
      ]),
    summaryCode:
      value.summaryCode,
    observation:
      value.observation,
    mutationOccurred,
  });
}

export class Section12CodingToolExecutor {
  constructor({
    runner,
    outerTask,
  } = {}) {
    if (
      !runner
      || typeof runner.run
        !== 'function'
      || typeof runner.cancel
        !== 'function'
      || !outerTask
      || typeof outerTask
        !== 'object'
      || typeof outerTask.taskId
        !== 'string'
      || !Array.isArray(
        outerTask.requestedCapabilities,
      )
    ) {
      throw new TypeError(
        'Invalid coding tool executor.',
      );
    }

    this.runner = runner;
    this.outerTask =
      Object.freeze({
        ...outerTask,
        requestedCapabilities:
          Object.freeze([
            ...outerTask
              .requestedCapabilities,
          ]),
      });
  }

  async execute({
    job,
    steps,
    signal,
  }) {
    if (
      !job
      || job.outerTaskId
        !== this.outerTask.taskId
      || job.deviceId
        !== this.outerTask.deviceId
      || !Array.isArray(steps)
      || steps.length < 1
    ) {
      throw new Error(
        'coding_tool_boundary_invalid',
      );
    }

    const outerCapabilities =
      new Set(
        this.outerTask
          .requestedCapabilities,
      );

    if (
      steps.some(
        (step) =>
          step.requiredCapabilities
            .some(
              (capability) =>
                !outerCapabilities
                  .has(capability),
            ),
      )
    ) {
      return Object.freeze({
        status: 'blocked',
        completedStepIds:
          Object.freeze([]),
        summaryCode:
          'tool.capability_outside_outer_task',
        observation: '',
      });
    }

    const onAbort = () => {
      this.runner.cancel(
        this.outerTask.taskId,
      );
    };

    if (signal?.aborted) {
      onAbort();
    } else {
      signal?.addEventListener(
        'abort',
        onAbort,
        { once: true },
      );
    }

    try {
      const result =
        await this.runner.run({
          taskId:
            this.outerTask.taskId,
          deviceId:
            this.outerTask.deviceId,
          intent:
            this.outerTask.intent,
          risk:
            this.outerTask.risk,
          requestedCapabilities:
            this.outerTask
              .requestedCapabilities,
          approval:
            this.outerTask.approval,
          expiresAt:
            this.outerTask.expiresAt,
          steps,
        });

      const completed =
        (result.steps ?? [])
          .filter(
            (entry) =>
              entry.status
                === 'succeeded',
          )
          .map(
            (entry) =>
              entry.stepId,
          );

      const observation =
        JSON.stringify(
          (result.steps ?? [])
            .slice(-4)
            .map((entry) => ({
              stepId:
                entry.stepId,
              status:
                entry.status,
              error:
                entry.error ?? null,
              result:
                entry.result
                ?? null,
            })),
        ).slice(0, 64 * 1024);

      return Object.freeze({
        status:
          result.status,
        completedStepIds:
          Object.freeze(completed),
        summaryCode:
          'tool.'
          + (
            result.status
            ?? 'failed'
          ),
        observation,
      });
    } finally {
      signal?.removeEventListener(
        'abort',
        onAbort,
      );
    }
  }
}
