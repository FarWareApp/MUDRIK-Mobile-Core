export type CommandSurfaceIdKind =
  | 'account'
  | 'device'
  | 'task'
  | 'approval';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const PATTERN: Readonly<
  Record<CommandSurfaceIdKind, RegExp>
> = {
  account:
    new RegExp('^acct_' + BODY + '$'),
  device:
    new RegExp('^dev_' + BODY + '$'),
  task:
    new RegExp('^ctask_' + BODY + '$'),
  approval:
    new RegExp(
      '^capproval_' + BODY + '$',
    ),
};

export function isCommandSurfaceId(
  kind: CommandSurfaceIdKind,
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && PATTERN[kind].test(value)
  );
}
