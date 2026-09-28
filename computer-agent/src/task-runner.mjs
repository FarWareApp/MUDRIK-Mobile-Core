import {
  activeCapabilityGrants,
  evaluateTaskPolicy,
} from './policy.mjs';

import {
  sanitizeAdapterResult,
  sanitizeToolError,
} from './adapter-result.mjs';

import {
  normalizeToolStep,
  policyContextForToolStep,
} from './tool-contracts.mjs';

import {
  resolveExecutionProfile,
} from './execution-profile.mjs';

import {
  createDefaultTerminalSandbox,
} from './linux-bubblewrap-sandbox.mjs';

import {
  redactSecretValues,
} from './secret-reference.mjs';

import {
  SandboxedFilesystemAdapter,
} from './tools/filesystem-sandbox.mjs';

import {
  runGitOperation,
} from './tools/git.mjs';

import {
  OwnedProcessRuntime,
} from './tools/process.mjs';

import {
  ScopedHttpsNetworkAdapter,
} from './tools/network.mjs';

import {
  runRestrictedUnavailable,
} from './tools/restricted-unavailable.mjs';

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
    terminalSandbox =
      createDefaultTerminalSandbox(),
    secretResolver = null,
    processRuntime = null,
    networkAdapter =
      new ScopedHttpsNetworkAdapter(),
    filesystemAdapter = null,
  } = {}) {
    if (
      !terminalSandbox
      || typeof terminalSandbox.run
        !== 'function'
    ) {
      throw new TypeError(
        'A terminal sandbox is required.',
      );
    }

    this.grants = grants;
    this.onEvent = onEvent;
    this.clock = clock;
    if (
      secretResolver !== null
      && (
        typeof secretResolver
          !== 'object'
        || typeof secretResolver.resolve
          !== 'function'
      )
    ) {
      throw new TypeError(
        'Invalid secret resolver.',
      );
    }

    if (
      processRuntime !== null
      && (
        typeof processRuntime
          !== 'object'
        || typeof processRuntime.run
          !== 'function'
      )
    ) {
      throw new TypeError(
        'Invalid process runtime.',
      );
    }

    if (
      !networkAdapter
      || typeof networkAdapter.run
        !== 'function'
    ) {
      throw new TypeError(
        'Invalid network adapter.',
      );
    }

    if (
      filesystemAdapter !== null
      && (
        typeof filesystemAdapter
          !== 'object'
        || typeof filesystemAdapter.run
          !== 'function'
      )
    ) {
      throw new TypeError(
        'Invalid filesystem adapter.',
      );
    }

    this.terminalSandbox =
      terminalSandbox;
    this.secretResolver =
      secretResolver;
    this.processRuntime =
      processRuntime;
    this.networkAdapter =
      networkAdapter;
    this.filesystemAdapter =
      filesystemAdapter
      ?? new SandboxedFilesystemAdapter({
        sandbox:
          terminalSandbox,
      });
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
          const rawResult =
            await this.runStep(
              step,
              controller.signal,
              {
                deviceId:
                  task.deviceId,
                trustedNowMs:
                  stepPolicyTime,
                coveringGrantIds:
                  stepPolicy
                    .coveringGrantIds
                  ?? {},
              },
            );
          const result =
            sanitizeAdapterResult(
              rawResult,
            );

          if (!result) {
            throw new Error(
              'adapter_result_invalid',
            );
          }

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
          const message =
            sanitizeToolError(error);
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
      coveringGrantIds = {},
    } = {},
  ) {
    const input =
      step.input ?? {};

    if (step.tool === 'terminal') {
      const coveringGrantId =
        coveringGrantIds[
          'terminal.execute'
        ];
      const activeGrants =
        activeCapabilityGrants({
          grants: this.grants,
          capability:
            'terminal.execute',
          deviceId,
          trustedNowMs,
        });
      const coveringGrant =
        activeGrants.find(
          (grant) =>
            grant.grantId
              === coveringGrantId,
        );
      const allowedRoots =
        coveringGrant
          ? [
              ...coveringGrant
                .scope
                .filesystemRoots,
            ]
          : [];

      if (allowedRoots.length === 0) {
        throw new Error(
          'sandbox_scope_missing',
        );
      }

      if (input.executionProfile) {
        const invocation =
          await resolveExecutionProfile(
            input,
          );

        return this.terminalSandbox.run(
          invocation,
          {
            allowedRoots,
            readOnlyRoots:
              invocation.readOnlyRoots,
            signal,
          },
        );
      }

      const secretEntries =
        input.secretBindings ?? [];
      const secretValues = [];
      const executionEnv = {
        ...(input.env ?? {}),
      };

      if (secretEntries.length > 0) {
        const secretGrantId =
          coveringGrantIds[
            'secrets.use'
          ];
        const secretGrants =
          activeCapabilityGrants({
            grants: this.grants,
            capability:
              'secrets.use',
            deviceId,
            trustedNowMs,
          });
        const secretGrant =
          secretGrants.find(
            (grant) =>
              grant.grantId
                === secretGrantId,
          );

        if (
          !secretGrant
          || !this.secretResolver
        ) {
          throw new Error(
            'secret_resolution_unavailable',
          );
        }

        for (
          const {
            envName,
            secretRef: reference,
          } of secretEntries
        ) {
          if (
            !secretGrant.scope
              .secretRefs.includes(
                reference,
              )
          ) {
            throw new Error(
              'secret_scope_missing',
            );
          }

          let value;

          try {
            value =
              await this.secretResolver
                .resolve(reference);
          } catch {
            throw new Error(
              'secret_resolution_failed',
            );
          }

          if (
            typeof value !== 'string'
            || value.length < 1
            || value.length > 65_536
            || value.includes('\0')
          ) {
            throw new Error(
              'secret_resolution_failed',
            );
          }

          executionEnv[envName] =
            value;
          secretValues.push(value);
        }
      }

      const {
        secretBindings:
          _secretBindings,
        ...sandboxInput
      } = input;
      const raw =
        await this.terminalSandbox.run(
          {
            ...sandboxInput,
            env: executionEnv,
          },
          {
            allowedRoots,
            signal,
          },
        );

      if (secretValues.length === 0) {
        return raw;
      }

      return Object.freeze({
        ...raw,
        stdout:
          redactSecretValues(
            raw.stdout,
            secretValues,
          ),
        stderr:
          redactSecretValues(
            raw.stderr,
            secretValues,
          ),
      });
    }

    if (step.tool === 'filesystem') {
      const capability =
        step.requiredCapabilities[0];
      const coveringGrantId =
        coveringGrantIds[
          capability
        ];
      const activeGrants =
        activeCapabilityGrants({
          grants: this.grants,
          capability,
          deviceId,
          trustedNowMs,
        });
      const coveringGrant =
        activeGrants.find(
          (grant) =>
            grant.grantId
              === coveringGrantId,
        );
      const allowedRoots =
        coveringGrant
          ? [
              ...coveringGrant
                .scope
                .filesystemRoots,
            ]
          : [];

      return this.filesystemAdapter.run(
        input,
        {
          allowedRoots,
          signal,
        },
      );
    }

    if (step.tool === 'git') {
      const gitCapability =
        step.requiredCapabilities.find(
          (capability) =>
            capability === 'git.read'
            || capability === 'git.write',
        );
      const coveringGrantId =
        gitCapability
          ? coveringGrantIds[
              gitCapability
            ]
          : null;
      const activeGrants =
        gitCapability
          ? activeCapabilityGrants({
              grants: this.grants,
              capability:
                gitCapability,
              deviceId,
              trustedNowMs,
            })
          : [];
      const coveringGrant =
        activeGrants.find(
          (grant) =>
            grant.grantId
              === coveringGrantId,
        );
      const allowedRepositories =
        coveringGrant
          ? [
              ...coveringGrant
                .scope
                .repositories,
            ]
          : [];

      return runGitOperation(
        input,
        {
          allowedRepositories,
          sandbox:
            this.terminalSandbox,
          signal,
        },
      );
    }

    if (step.tool === 'network') {
      const coveringGrantId =
        coveringGrantIds[
          'network.outbound'
        ];
      const activeGrants =
        activeCapabilityGrants({
          grants: this.grants,
          capability:
            'network.outbound',
          deviceId,
          trustedNowMs,
        });
      const coveringGrant =
        activeGrants.find(
          (grant) =>
            grant.grantId
              === coveringGrantId,
        );
      const allowedDomains =
        coveringGrant
          ? [
              ...coveringGrant
                .scope
                .domains,
            ]
          : [];

      return this.networkAdapter.run(
        input,
        {
          allowedDomains,
          signal,
        },
      );
    }

    if (
      step.tool === 'browser'
      || step.tool === 'screen'
      || step.tool === 'clipboard'
      || step.tool === 'system'
    ) {
      return runRestrictedUnavailable(
        step.tool,
      );
    }

    if (step.tool === 'process') {
      if (!this.processRuntime) {
        if (
          typeof this.terminalSandbox
            .spawnBackground
            !== 'function'
        ) {
          throw new Error(
            'process_runtime_unavailable',
          );
        }

        this.processRuntime =
          new OwnedProcessRuntime({
            sandbox:
              this.terminalSandbox,
            clock: this.clock,
          });
      }

      const capability =
        step.requiredCapabilities[0];
      const coveringGrantId =
        coveringGrantIds[
          capability
        ];
      const activeGrants =
        activeCapabilityGrants({
          grants: this.grants,
          capability,
          deviceId,
          trustedNowMs,
        });
      const coveringGrant =
        activeGrants.find(
          (grant) =>
            grant.grantId
              === coveringGrantId,
        );
      const allowedRoots =
        coveringGrant
          ? [
              ...coveringGrant
                .scope
                .filesystemRoots,
            ]
          : [];

      return this.processRuntime.run(
        input,
        {
          allowedRoots,
          signal,
        },
      );
    }

    throw new Error(
      `Tool is not implemented: ${step.tool}`,
    );
  }
}
