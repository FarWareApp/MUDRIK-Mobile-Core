import {
  parseCommandApprovalProjection,
  type CommandApprovalProjection,
} from './approvalProjection';

import {
  parseCommandDeviceProjection,
  type CommandDeviceProjection,
} from './deviceProjection';

import {
  parseCommandTaskResultProjection,
  type CommandTaskResultProjection,
} from './resultProjection';

import {
  applyCommandTaskProjection,
  isTerminalCommandTaskState,
  parseCommandTaskProjection,
  type CommandTaskProjection,
} from './taskProjection';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const ACCOUNT_ID =
  new RegExp(
    '^acct_' + BODY + '$',
  );

export type CommandSurfaceConnectivity =
  | 'online'
  | 'reconnecting'
  | 'offline';

export type CommandSurfaceConnectivityProjection =
  Readonly<{
    accountId: string;
    state:
      CommandSurfaceConnectivity;
    revision: number;
    updatedAtMs: number;
    grantsAuthority: false;
  }>;

export type CommandSurfaceTaskView =
  Readonly<{
    task: CommandTaskProjection;
    connectivity:
      CommandSurfaceConnectivity;
    certainty:
      | 'current'
      | 'last_known';
    grantsAuthority: false;
  }>;

export type SurfaceStateUpdateReason =
  | 'accepted'
  | 'duplicate'
  | 'invalid_projection'
  | 'identity_mismatch'
  | 'stale_revision'
  | 'revision_conflict'
  | 'terminal_regression'
  | 'capacity_exhausted'
  | 'task_missing'
  | 'task_not_terminal'
  | 'result_revision_mismatch'
  | 'result_outcome_mismatch';

export type SurfaceStateUpdate =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason:
      SurfaceStateUpdateReason;
  }>;

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function same(
  left: unknown,
  right: unknown,
): boolean {
  return (
    JSON.stringify(left)
      === JSON.stringify(right)
  );
}

function accepted(
  duplicate = false,
): SurfaceStateUpdate {
  return Object.freeze({
    accepted: true,
    duplicate,
    reason:
      duplicate
        ? 'duplicate'
        : 'accepted',
  });
}

function rejected(
  reason:
    Exclude<
      SurfaceStateUpdateReason,
      'accepted' | 'duplicate'
    >,
): SurfaceStateUpdate {
  return Object.freeze({
    accepted: false,
    duplicate: false,
    reason,
  });
}

export function parseCommandSurfaceConnectivityProjection(
  input: unknown,
  expectedAccountId?: string,
): CommandSurfaceConnectivityProjection | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;
  const keys =
    new Set([
      'accountId',
      'state',
      'revision',
      'updatedAtMs',
      'grantsAuthority',
    ]);

  if (
    Object.keys(record).length
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || (
      expectedAccountId !== undefined
      && record.accountId
        !== expectedAccountId
    )
    || ![
      'online',
      'reconnecting',
      'offline',
    ].includes(
      record.state as string,
    )
    || !safeInteger(
      record.revision,
    )
    || !safeInteger(
      record.updatedAtMs,
    )
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    accountId:
      record.accountId,
    state:
      (record.state as CommandSurfaceConnectivity),
    revision:
      record.revision,
    updatedAtMs:
      record.updatedAtMs,
    grantsAuthority: false,
  });
}

const TERMINAL_TO_OUTCOME:
  Readonly<
    Partial<
      Record<
        CommandTaskProjection['state'],
        CommandTaskResultProjection['outcome']
      >
    >
  > = {
    succeeded: 'succeeded',
    failed: 'failed',
    cancelled: 'cancelled',
    revoked: 'revoked',
    expired: 'expired',
  };

export class CommandSurfaceStateStore {
  readonly accountId: string;

  private readonly maxDevices:
    number;
  private readonly maxTasks:
    number;
  private readonly maxApprovals:
    number;
  private readonly maxResults:
    number;

  private readonly devices =
    new Map<
      string,
      CommandDeviceProjection
    >();

  private readonly tasks =
    new Map<
      string,
      CommandTaskProjection
    >();

  private readonly approvals =
    new Map<
      string,
      CommandApprovalProjection
    >();

  private readonly results =
    new Map<
      string,
      CommandTaskResultProjection
    >();

  private connectivity:
    CommandSurfaceConnectivityProjection;

  constructor(
    accountId: string,
    {
      maxDevices = 64,
      maxTasks = 256,
      maxApprovals = 128,
      maxResults = 256,
    }: {
      maxDevices?: number;
      maxTasks?: number;
      maxApprovals?: number;
      maxResults?: number;
    } = {},
  ) {
    if (
      !ACCOUNT_ID.test(accountId)
      || ![
        maxDevices,
        maxTasks,
        maxApprovals,
        maxResults,
      ].every(
        (value) =>
          Number.isInteger(value)
          && value >= 1
          && value <= 4096,
      )
    ) {
      throw new TypeError(
        'Invalid command surface state limits.',
      );
    }

    this.accountId = accountId;
    this.maxDevices = maxDevices;
    this.maxTasks = maxTasks;
    this.maxApprovals =
      maxApprovals;
    this.maxResults = maxResults;

    this.connectivity =
      Object.freeze({
        accountId,
        state: 'offline',
        revision: 0,
        updatedAtMs: 0,
        grantsAuthority: false,
      });
  }

  applyConnectivity(
    input: unknown,
  ): SurfaceStateUpdate {
    const next =
      parseCommandSurfaceConnectivityProjection(
        input,
        this.accountId,
      );

    if (!next) {
      return rejected(
        'invalid_projection',
      );
    }

    if (
      next.revision
        < this.connectivity.revision
    ) {
      return rejected(
        'stale_revision',
      );
    }

    if (
      next.revision
        === this.connectivity.revision
    ) {
      return same(
        next,
        this.connectivity,
      )
        ? accepted(true)
        : rejected(
            'revision_conflict',
          );
    }

    if (
      next.updatedAtMs
        < this.connectivity.updatedAtMs
    ) {
      return rejected(
        'stale_revision',
      );
    }

    this.connectivity = next;
    return accepted();
  }

  applyDevice(
    input: unknown,
  ): SurfaceStateUpdate {
    const next =
      parseCommandDeviceProjection(
        input,
        this.accountId,
      );

    if (!next) {
      return rejected(
        'invalid_projection',
      );
    }

    const current =
      this.devices.get(
        next.deviceId,
      );

    if (!current) {
      if (
        this.devices.size
          >= this.maxDevices
      ) {
        return rejected(
          'capacity_exhausted',
        );
      }

      this.devices.set(
        next.deviceId,
        next,
      );
      return accepted();
    }

    if (
      next.revision < current.revision
    ) {
      return rejected(
        'stale_revision',
      );
    }

    if (
      next.revision
        === current.revision
    ) {
      return same(next, current)
        ? accepted(true)
        : rejected(
            'revision_conflict',
          );
    }

    this.devices.set(
      next.deviceId,
      next,
    );
    return accepted();
  }

  applyTask(
    input: unknown,
  ): SurfaceStateUpdate {
    const next =
      parseCommandTaskProjection(
        input,
        {
          expectedAccountId:
            this.accountId,
        },
      );

    if (!next) {
      return rejected(
        'invalid_projection',
      );
    }

    const current =
      this.tasks.get(
        next.taskId,
      );

    if (!current) {
      if (
        this.tasks.size
          >= this.maxTasks
      ) {
        return rejected(
          'capacity_exhausted',
        );
      }

      this.tasks.set(
        next.taskId,
        next,
      );
      return accepted();
    }

    const update =
      applyCommandTaskProjection(
        current,
        next,
      );

    if (!update.accepted) {
      if (
        update.reason === 'accepted'
        || update.reason === 'duplicate'
      ) {
        return rejected(
          'revision_conflict',
        );
      }

      return rejected(
        update.reason,
      );
    }

    if (!update.duplicate) {
      this.tasks.set(
        next.taskId,
        update.projection,
      );
    }

    return accepted(
      update.duplicate,
    );
  }

  applyApproval(
    input: unknown,
  ): SurfaceStateUpdate {
    const next =
      parseCommandApprovalProjection(
        input,
        {
          expectedAccountId:
            this.accountId,
        },
      );

    if (!next) {
      return rejected(
        'invalid_projection',
      );
    }

    const current =
      this.approvals.get(
        next.approvalId,
      );

    if (!current) {
      if (
        this.approvals.size
          >= this.maxApprovals
      ) {
        return rejected(
          'capacity_exhausted',
        );
      }

      this.approvals.set(
        next.approvalId,
        next,
      );
      return accepted();
    }

    if (
      current.taskId !== next.taskId
      || current.destinationDeviceId
        !== next.destinationDeviceId
    ) {
      return rejected(
        'identity_mismatch',
      );
    }

    if (
      next.revision < current.revision
    ) {
      return rejected(
        'stale_revision',
      );
    }

    if (
      next.revision
        === current.revision
    ) {
      return same(next, current)
        ? accepted(true)
        : rejected(
            'revision_conflict',
          );
    }

    if (
      current.state !== 'active'
      && next.state === 'active'
    ) {
      return rejected(
        'terminal_regression',
      );
    }

    this.approvals.set(
      next.approvalId,
      next,
    );
    return accepted();
  }

  applyResult(
    input: unknown,
  ): SurfaceStateUpdate {
    const next =
      parseCommandTaskResultProjection(
        input,
        {
          expectedAccountId:
            this.accountId,
        },
      );

    if (!next) {
      return rejected(
        'invalid_projection',
      );
    }

    const task =
      this.tasks.get(
        next.taskId,
      );

    if (!task) {
      return rejected(
        'task_missing',
      );
    }

    if (
      task.destinationDeviceId
        !== next.destinationDeviceId
    ) {
      return rejected(
        'identity_mismatch',
      );
    }

    if (
      !isTerminalCommandTaskState(
        task.state,
      )
    ) {
      return rejected(
        'task_not_terminal',
      );
    }

    if (
      next.taskRevision
        !== task.revision
    ) {
      return rejected(
        'result_revision_mismatch',
      );
    }

    if (
      TERMINAL_TO_OUTCOME[
        task.state
      ] !== next.outcome
    ) {
      return rejected(
        'result_outcome_mismatch',
      );
    }

    const current =
      this.results.get(
        next.taskId,
      );

    if (current) {
      return same(current, next)
        ? accepted(true)
        : rejected(
            'revision_conflict',
          );
    }

    if (
      this.results.size
        >= this.maxResults
    ) {
      return rejected(
        'capacity_exhausted',
      );
    }

    this.results.set(
      next.taskId,
      next,
    );
    return accepted();
  }

  taskView(
    taskId: string,
  ): CommandSurfaceTaskView | null {
    const task =
      this.tasks.get(taskId);

    if (!task) {
      return null;
    }

    const terminal =
      isTerminalCommandTaskState(
        task.state,
      );

    return Object.freeze({
      task,
      connectivity:
        this.connectivity.state,
      certainty:
        terminal
        || this.connectivity.state
          === 'online'
          ? 'current'
          : 'last_known',
      grantsAuthority: false,
    });
  }

  snapshot() {
    return Object.freeze({
      accountId: this.accountId,
      connectivity:
        this.connectivity,
      devices:
        Object.freeze([
          ...this.devices.values(),
        ]),
      tasks:
        Object.freeze([
          ...this.tasks.values(),
        ]),
      approvals:
        Object.freeze([
          ...this.approvals.values(),
        ]),
      results:
        Object.freeze([
          ...this.results.values(),
        ]),
      grantsAuthority: false,
    });
  }
}
