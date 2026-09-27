import {
  activeCapabilityGrants,
  evaluateTaskPolicy,
} from './policy.mjs';

import {
  normalizeToolStep,
  policyContextForToolStep,
} from './tool-contracts.mjs';

import {
  runFilesystemOperation,
} from './tools/filesystem.mjs';

import {
  runTerminalCommand,
} from './tools/terminal.mjs';

export function policyContextForStep(step) {
  return policyContextForToolStep(step);
}

function assertStepCapabilities(task, step) {
  const taskCapabilities = new Set(task.requestedCapabilities ?? []);

  for (const capability of step.requiredCapabilities ?? []) {
    if (!taskCapabilities.has(capability)) {
      throw new Error(
        `Step ${step.stepId} requests capability not declared by task: ${capability}`,
      );
    }
  }
}

export class ComputerTaskRunner {
  constructor({
    grants = [],
    onEvent = () => {},
    clock = () => Date.now(),
  } = {}) {
    this.grants = grants;
    this.onEvent = onEvent;
    this.clock = clock;
    this.active = new Map();
  }

  setGrants(grants) {
    this.grants = Array.isArray(grants) ? grants : [];
  }

  emit(taskId, type, data = {}) {
    this.onEvent({
      taskId,
      type,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  cancel(taskId) {
    const controller = this.active.get(taskId);

    if (!controller) {
      return false;
    }

    controller.abort();
    this.emit(taskId, 'task.cancel-requested');
    return true;
  }

  async run(
    task,
    {
      signal: externalSignal,
    } = {},
  ) {
    if (!task || typeof task !== 'object' || typeof task.taskId !== 'string') {
      throw new Error('Invalid task envelope.');
    }

    if (!Array.isArray(task.steps) || task.steps.length === 0) {
      throw new Error('Task must contain at least one step.');
    }

    if (this.active.has(task.taskId)) {
      throw new Error(`Task is already running: ${task.taskId}`);
    }

    const normalizedSteps =
      task.steps.map(
        normalizeToolStep,
      );

    if (
      normalizedSteps.some(
        (step) => step === null,
      )
    ) {
      const policy = {
        allowed: false,
        reason: 'invalid-tool-input',
      };

      this.emit(
        task.taskId,
        'task.blocked',
        { policy },
      );

      return {
        status: 'blocked',
        policy,
        steps: [],
      };
    }

    for (const step of normalizedSteps) {
      assertStepCapabilities(task, step);
    }

    const taskPolicy = evaluateTaskPolicy({
      task,
      grants: this.grants,
      trustedNowMs: this.clock(),
    });

    if (!taskPolicy.allowed) {
      this.emit(task.taskId, 'task.blocked', { policy: taskPolicy });
      return {
        status: 'blocked',
        policy: taskPolicy,
        steps: [],
      };
    }

    const controller =
      new AbortController();
    const forwardAbort =
      () => controller.abort();

    if (externalSignal?.aborted) {
      controller.abort();
    } else {
      externalSignal?.addEventListener(
        'abort',
        forwardAbort,
        { once: true },
      );
    }

    this.active.set(
      task.taskId,
      controller,
    );
    this.emit(task.taskId, 'task.started', {
      intent: task.intent,
      risk: task.risk,
    });

    const results = [];

    try {
      for (const step of normalizedSteps) {
        if (controller.signal.aborted) {
          this.emit(task.taskId, 'task.cancelled');
          return {
            status: 'cancelled',
            policy: taskPolicy,
            steps: results,
          };
        }

        const stepPolicyTime =
          this.clock();
        const stepPolicy =
          evaluateTaskPolicy({
            task: {
              ...task,
              requestedCapabilities:
                step.requiredCapabilities,
            },
            grants: this.grants,
            contextByCapability:
              policyContextForStep(step),
            trustedNowMs:
              stepPolicyTime,
          });

        if (!stepPolicy.allowed) {
          this.emit(task.taskId, 'step.blocked', {
            stepId: step.stepId,
            policy: stepPolicy,
          });

          this.emit(task.taskId, 'task.blocked', {
            stepId: step.stepId,
            policy: stepPolicy,
          });

          return {
            status: 'blocked',
            policy: stepPolicy,
            steps: results,
          };
        }

        this.emit(task.taskId, 'step.started', {
          stepId: step.stepId,
          tool: step.tool,
          summary: step.summary,
        });

        try {
          const result =
            await this.runStep(
              step,
              controller.signal,
              {
                deviceId:
                  task.deviceId,
                trustedNowMs:
                  stepPolicyTime,
              },
            );
          results.push({
            stepId: step.stepId,
            status: result.exitCode === 0 ? 'succeeded' : 'failed',
            result,
          });

          this.emit(task.taskId, 'step.completed', {
            stepId: step.stepId,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            aborted: result.aborted,
          });

          if (result.exitCode !== 0 && !step.continueOnError) {
            this.emit(task.taskId, 'task.failed', {
              stepId: step.stepId,
              reason: 'non-zero-exit',
            });

            return {
              status: 'failed',
              policy: taskPolicy,
              steps: results,
            };
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.push({
            stepId: step.stepId,
            status: 'failed',
            error: message,
          });

          this.emit(task.taskId, 'step.failed', {
            stepId: step.stepId,
            error: message,
          });

          if (!step.continueOnError) {
            this.emit(task.taskId, 'task.failed', {
              stepId: step.stepId,
              reason: 'step-error',
            });

            return {
              status: 'failed',
              policy: taskPolicy,
              steps: results,
            };
          }
        }
      }

      this.emit(task.taskId, 'task.succeeded');

      return {
        status: 'succeeded',
        policy: taskPolicy,
        steps: results,
      };
    } finally {
      externalSignal?.removeEventListener(
        'abort',
        forwardAbort,
      );
      this.active.delete(task.taskId);
    }
  }

  async runStep(
    step,
    signal,
    {
      deviceId,
      trustedNowMs,
    } = {},
  ) {
    const input =
      step.input ?? {};

    if (step.tool === 'terminal') {
      return runTerminalCommand({
        executable:
          input.executable,
        args: input.args,
        cwd: input.cwd,
        env: input.env,
        timeoutMs:
          input.timeoutMs,
        maxOutputBytes:
          input.maxOutputBytes,
        signal,
      });
    }

    if (step.tool === 'filesystem') {
      const capability =
        step.requiredCapabilities[0];
      const activeGrants =
        activeCapabilityGrants({
          grants: this.grants,
          capability,
          deviceId,
          trustedNowMs,
        });
      const allowedRoots =
        [...new Set(
          activeGrants.flatMap(
            (grant) =>
              grant.scope
                .filesystemRoots,
          ),
        )];

      return runFilesystemOperation(
        input,
        {
          allowedRoots,
        },
      );
    }

    throw new Error(
      `Tool is not implemented: ${step.tool}`,
    );
  }
}
