import {
  runTerminalCommand,
} from '../../src/tools/terminal.mjs';

export function createDirectTestTerminalSandbox() {
  return Object.freeze({
    async run(
      input,
      {
        signal,
      } = {},
    ) {
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
        stdin:
          input.stdin ?? null,
        signal,
      });
    },
  });
}
