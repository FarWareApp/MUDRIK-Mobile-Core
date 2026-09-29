export const COMPUTER_CONTROL_CAPABILITIES = [
  'terminal.read',
  'terminal.execute',
  'filesystem.read',
  'filesystem.write',
  'filesystem.delete',
  'git.read',
  'git.write',
  'process.read',
  'process.start',
  'process.stop',
  'browser.read',
  'browser.control',
  'screen.capture',
  'network.outbound',
  'clipboard.read',
  'clipboard.write',
  'secrets.use',
  'system.settings',
  'system.admin',
] as const;

export type ComputerControlCapability =
  (typeof COMPUTER_CONTROL_CAPABILITIES)[number];

const CAPABILITY_SET: ReadonlySet<string> =
  new Set(COMPUTER_CONTROL_CAPABILITIES);

export function isComputerControlCapability(
  value: unknown,
): value is ComputerControlCapability {
  return (
    typeof value === 'string'
    && CAPABILITY_SET.has(value)
  );
}
