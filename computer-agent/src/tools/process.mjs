export class ProcessToolError
  extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProcessToolError';
    this.code = code;
  }
}

function fail(code) {
  throw new ProcessToolError(code);
}

function safeTime(clock) {
  const value = clock();

  if (
    !Number.isSafeInteger(value)
    || value < 0
  ) {
    fail('process_clock_invalid');
  }

  return value;
}

export class OwnedProcessRuntime {
  constructor({
    sandbox,
    clock = () => Date.now(),
    maxTracked = 256,
  } = {}) {
    if (
      !sandbox
      || typeof sandbox
        .spawnBackground !== 'function'
      || typeof clock !== 'function'
      || !Number.isInteger(maxTracked)
      || maxTracked < 1
      || maxTracked > 4096
    ) {
      throw new TypeError(
        'Invalid owned process runtime.',
      );
    }

    this.sandbox = sandbox;
    this.clock = clock;
    this.maxTracked = maxTracked;
    this.records = new Map();
  }

  recordSnapshot(record) {
    const state =
      record.controller.snapshot();

    return Object.freeze({
      exitCode: 0,
      operation: 'inspect',
      processRef:
        record.processRef,
      running: state.running,
      processExitCode:
        state.exitCode,
      signal: state.signal,
      timedOut: state.timedOut,
      startedAtMs:
        record.startedAtMs,
      completedAtMs:
        record.completedAtMs,
      owned: true,
      sandbox:
        record.controller.sandbox,
      network:
        record.controller.network,
    });
  }

  async start(
    input,
    {
      allowedRoots = [],
      signal,
    } = {},
  ) {
    if (
      this.records.has(
        input.processRef,
      )
    ) {
      fail('process_ref_replay');
    }

    if (
      this.records.size
        >= this.maxTracked
    ) {
      fail('process_registry_limit');
    }

    let controller;

    try {
      controller =
        await this.sandbox
          .spawnBackground(
            {
              executable:
                input.executable,
              args: input.args,
              cwd: input.cwd,
              env: input.env,
              timeoutMs:
                input.maxRuntimeMs,
              maxOutputBytes: 1024,
            },
            {
              allowedRoots,
              signal,
            },
          );
    } catch {
      fail('process_start_failed');
    }

    const record = {
      processRef:
        input.processRef,
      controller,
      startedAtMs:
        safeTime(this.clock),
      completedAtMs: null,
      completion: null,
    };

    this.records.set(
      input.processRef,
      record,
    );

    record.completion =
      controller.wait()
        .then(
          () => {
            record.completedAtMs =
              record.completedAtMs
              ?? safeTime(this.clock);
          },
          () => {
            record.completedAtMs =
              record.completedAtMs
              ?? safeTime(this.clock);
          },
        );

    return Object.freeze({
      exitCode: 0,
      operation: 'start',
      processRef:
        input.processRef,
      running:
        controller.running(),
      owned: true,
      sandbox:
        controller.sandbox,
      network:
        controller.network,
    });
  }

  inspect(input) {
    const record =
      this.records.get(
        input.processRef,
      );

    if (!record) {
      fail('process_not_owned');
    }

    if (
      !record.controller.running()
      && record.completedAtMs === null
    ) {
      record.completedAtMs =
        safeTime(this.clock);
    }

    return this.recordSnapshot(record);
  }

  async stop(input) {
    const record =
      this.records.get(
        input.processRef,
      );

    if (!record) {
      fail('process_not_owned');
    }

    const wasRunning =
      record.controller.running();

    if (wasRunning) {
      record.controller.terminate();

      try {
        await record.controller.wait();
      } catch {
        fail('process_stop_failed');
      }
    }

    record.completedAtMs =
      record.completedAtMs
      ?? safeTime(this.clock);

    const state =
      record.controller.snapshot();

    return Object.freeze({
      exitCode: 0,
      operation: 'stop',
      processRef:
        input.processRef,
      stopped:
        wasRunning,
      running: state.running,
      processExitCode:
        state.exitCode,
      signal: state.signal,
      timedOut: state.timedOut,
      owned: true,
      sandbox:
        record.controller.sandbox,
      network:
        record.controller.network,
    });
  }

  async run(
    input,
    options = {},
  ) {
    if (
      !input
      || typeof input !== 'object'
    ) {
      fail('process_invalid_input');
    }

    if (input.operation === 'start') {
      return this.start(
        input,
        options,
      );
    }

    if (input.operation === 'inspect') {
      return this.inspect(input);
    }

    if (input.operation === 'stop') {
      return this.stop(input);
    }

    fail('process_invalid_operation');
  }

  async stopAll() {
    const pending = [];

    for (const record of this.records.values()) {
      if (record.controller.running()) {
        record.controller.terminate();
        pending.push(
          record.controller
            .wait()
            .catch(() => null),
        );
      }
    }

    await Promise.all(pending);
  }
}
