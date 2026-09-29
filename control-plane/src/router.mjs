import {
  applyAgentTaskEvent,
} from './agent-event.mjs';

import {
  createControlTaskRecord,
  isTerminalTaskState,
  transitionControlTask,
} from './task-state.mjs';

import {
  evaluateTaskFreshness,
  parseRoutedTask,
} from './task-contract.mjs';

function result(
  accepted,
  reason,
  record = null,
  extra = {},
) {
  return Object.freeze({
    accepted,
    reason,
    record,
    ...extra,
  });
}

function sameTask(a, b) {
  return (
    JSON.stringify(a)
    === JSON.stringify(b)
  );
}

export class ControlPlaneRouter {
  constructor({
    deviceRegistry,
    sessionRegistry,
    approvalRegistry,
    store,
    deliveryQueue,
  } = {}) {
    if (
      !deviceRegistry
      || typeof deviceRegistry
        .authorizeDestination
        !== 'function'
      || !sessionRegistry
      || typeof sessionRegistry
        .authorize !== 'function'
      || !approvalRegistry
      || typeof approvalRegistry
        .authorizeTask
        !== 'function'
      || !store
      || typeof store.get
        !== 'function'
      || typeof store.create
        !== 'function'
      || typeof store.replace
        !== 'function'
      || !deliveryQueue
      || typeof deliveryQueue.enqueue
        !== 'function'
    ) {
      throw new TypeError(
        'Invalid control-plane router dependencies.',
      );
    }

    this.deviceRegistry =
      deviceRegistry;
    this.sessionRegistry =
      sessionRegistry;
    this.approvalRegistry =
      approvalRegistry;
    this.store = store;
    this.deliveryQueue =
      deliveryQueue;
  }

  authorizeRoute(
    task,
    trustedNowMs,
  ) {
    const freshness =
      evaluateTaskFreshness(
        task,
        trustedNowMs,
      );

    if (!freshness.allowed) {
      return freshness;
    }

    const source =
      this.sessionRegistry
        .authorize({
          sessionId:
            task.sourceSessionId,
          accountId:
            task.accountId,
          deviceId:
            task.sourceDeviceId,
          trustedNowMs,
        });

    if (!source.allowed) {
      return source;
    }

    const destination =
      this.deviceRegistry
        .authorizeDestination({
          accountId:
            task.accountId,
          deviceId:
            task.destinationDeviceId,
        });

    if (!destination.allowed) {
      return destination;
    }

    return Object.freeze({
      allowed: true,
      reason: 'route_authorized',
    });
  }

  async persistTransition(
    record,
    event,
    trustedNowMs,
    options = {},
  ) {
    const transitioned =
      transitionControlTask(
        record,
        event,
        {
          expectedRevision:
            record.revision,
          trustedNowMs,
          ...options,
        },
      );

    if (!transitioned.accepted) {
      return result(
        false,
        transitioned.reason,
        record,
      );
    }

    if (transitioned.duplicate) {
      return result(
        true,
        'duplicate',
        record,
        {
          duplicate: true,
        },
      );
    }

    const persisted =
      await this.store.replace(
        record.task.taskId,
        record.revision,
        transitioned.record,
      );

    if (!persisted.accepted) {
      return result(
        false,
        persisted.reason,
        record,
      );
    }

    return result(
      true,
      event,
      persisted.record,
      {
        duplicate: false,
      },
    );
  }

  async advanceToQueue(
    inputRecord,
    trustedNowMs,
  ) {
    let record = inputRecord;

    if (
      isTerminalTaskState(
        record.state,
      )
      || [
        'queued',
        'delivered',
        'acknowledged',
        'running',
      ].includes(record.state)
    ) {
      return result(
        true,
        'duplicate',
        record,
        { duplicate: true },
      );
    }

    if (record.state === 'received') {
      const moved =
        await this
          .persistTransition(
            record,
            'authenticate',
            trustedNowMs,
          );

      if (!moved.accepted) {
        return moved;
      }

      record = moved.record;
    }

    if (record.state === 'authenticated') {
      const requiresApproval =
        record.task.approvalId
          !== null
        || [
          'high',
          'critical',
        ].includes(
          record.task.risk,
        );

      if (requiresApproval) {
        const waiting =
          await this
            .persistTransition(
              record,
              'await_approval',
              trustedNowMs,
            );

        if (!waiting.accepted) {
          return waiting;
        }

        record = waiting.record;
      } else {
        const authorized =
          await this
            .persistTransition(
              record,
              'authorize',
              trustedNowMs,
            );

        if (!authorized.accepted) {
          return authorized;
        }

        record =
          authorized.record;
      }
    }

    if (
      record.state
        === 'awaiting_approval'
    ) {
      if (
        record.task.approvalId
          === null
      ) {
        return result(
          false,
          'approval_required',
          record,
        );
      }

      const approval =
        await this.approvalRegistry
          .authorizeTask({
            approvalId:
              record.task.approvalId,
            task: record.task,
            trustedNowMs,
          });

      if (!approval.allowed) {
        return result(
          false,
          approval.reason,
          record,
        );
      }

      const authorized =
        await this
          .persistTransition(
            record,
            'authorize',
            trustedNowMs,
          );

      if (!authorized.accepted) {
        return authorized;
      }

      record = authorized.record;
    }

    if (record.state === 'authorized') {
      const queued =
        await this
          .persistTransition(
            record,
            'queue',
            trustedNowMs,
          );

      if (!queued.accepted) {
        return queued;
      }

      record = queued.record;
    }

    return result(
      record.state === 'queued',
      record.state === 'queued'
        ? 'queued'
        : 'admission_incomplete',
      record,
    );
  }

  async admitTask(
    taskInput,
    trustedNowMs,
  ) {
    const task =
      parseRoutedTask(taskInput);

    if (!task) {
      return result(
        false,
        'task_invalid',
      );
    }

    const route =
      this.authorizeRoute(
        task,
        trustedNowMs,
      );

    if (!route.allowed) {
      return result(
        false,
        route.reason,
      );
    }

    const existing =
      await this.store.get(
        task.taskId,
      );

    if (existing) {
      if (
        !sameTask(
          existing.task,
          task,
        )
      ) {
        return result(
          false,
          'task_id_conflict',
          existing,
        );
      }

      return this.advanceToQueue(
        existing,
        trustedNowMs,
      );
    }

    const initial =
      createControlTaskRecord(
        task,
        trustedNowMs,
      );

    if (!initial) {
      return result(
        false,
        'task_record_invalid',
      );
    }

    const created =
      await this.store.create(
        initial,
      );

    if (!created.accepted) {
      return result(
        false,
        created.reason,
        created.record
          ?? null,
      );
    }

    return this.advanceToQueue(
      created.record,
      trustedNowMs,
    );
  }

  async recheckBeforeDelivery(
    record,
    trustedNowMs,
  ) {
    const route =
      this.authorizeRoute(
        record.task,
        trustedNowMs,
      );

    if (!route.allowed) {
      return route;
    }

    if (
      record.task.approvalId
        !== null
    ) {
      const approval =
        await this.approvalRegistry
          .authorizeTask({
            approvalId:
              record.task.approvalId,
            task: record.task,
            trustedNowMs,
          });

      if (!approval.allowed) {
        return approval;
      }
    }

    return Object.freeze({
      allowed: true,
      reason:
        'delivery_authorized',
    });
  }

  async prepareDelivery(
    taskId,
    deliveryId,
    trustedNowMs,
  ) {
    let record =
      await this.store.get(taskId);

    if (!record) {
      return result(
        false,
        'task_unknown',
      );
    }

    if (
      isTerminalTaskState(
        record.state,
      )
    ) {
      return result(
        false,
        'task_terminal',
        record,
      );
    }

    const recheck =
      await this
        .recheckBeforeDelivery(
          record,
          trustedNowMs,
        );

    if (!recheck.allowed) {
      return result(
        false,
        recheck.reason,
        record,
      );
    }

    if (
      ![
        'queued',
        'delivered',
      ].includes(record.state)
    ) {
      return result(
        false,
        'task_not_deliverable',
        record,
      );
    }

    const moved =
      await this
        .persistTransition(
          record,
          'deliver',
          trustedNowMs,
          { deliveryId },
        );

    if (!moved.accepted) {
      return moved;
    }

    record = moved.record;

    const enqueued =
      this.deliveryQueue.enqueue(
        'task',
        record,
        {
          deliveryId,
          trustedNowMs,
        },
      );

    if (!enqueued.accepted) {
      return result(
        false,
        enqueued.reason,
        record,
        {
          durableUncertain:
            true,
        },
      );
    }

    return result(
      true,
      enqueued.duplicate
        ? 'delivery_duplicate'
        : 'delivery_enqueued',
      record,
      {
        delivery:
          enqueued.entry,
        duplicate:
          enqueued.duplicate
          ?? false,
      },
    );
  }

  async terminalControl(
    taskId,
    event,
    deliveryId,
    reasonCode,
    trustedNowMs,
  ) {
    let record =
      await this.store.get(taskId);

    if (!record) {
      return result(
        false,
        'task_unknown',
      );
    }

    const moved =
      await this
        .persistTransition(
          record,
          event,
          trustedNowMs,
          {
            reason: reasonCode,
          },
        );

    if (!moved.accepted) {
      return moved;
    }

    record = moved.record;

    const enqueued =
      this.deliveryQueue.enqueue(
        event === 'cancel'
          ? 'cancel'
          : 'revoke',
        record,
        {
          deliveryId,
          trustedNowMs,
        },
      );

    if (!enqueued.accepted) {
      return result(
        false,
        enqueued.reason,
        record,
        {
          durableUncertain:
            true,
        },
      );
    }

    return result(
      true,
      event === 'cancel'
        ? 'cancel_enqueued'
        : 'revoke_enqueued',
      record,
      {
        delivery:
          enqueued.entry,
        duplicate:
          moved.duplicate
          || enqueued.duplicate
          || false,
      },
    );
  }

  cancelTask(
    taskId,
    deliveryId,
    reasonCode,
    trustedNowMs,
  ) {
    return this.terminalControl(
      taskId,
      'cancel',
      deliveryId,
      reasonCode,
      trustedNowMs,
    );
  }

  revokeTask(
    taskId,
    deliveryId,
    reasonCode,
    trustedNowMs,
  ) {
    return this.terminalControl(
      taskId,
      'revoke',
      deliveryId,
      reasonCode,
      trustedNowMs,
    );
  }

  async applyAgentEvent(
    taskId,
    eventInput,
    trustedNowMs,
  ) {
    const record =
      await this.store.get(taskId);

    if (!record) {
      return result(
        false,
        'task_unknown',
      );
    }

    const applied =
      applyAgentTaskEvent(
        record,
        eventInput,
        trustedNowMs,
      );

    if (!applied.accepted) {
      return result(
        false,
        applied.reason,
        record,
      );
    }

    if (applied.duplicate) {
      return result(
        true,
        'event_duplicate',
        record,
        {
          duplicate: true,
        },
      );
    }

    const persisted =
      await this.store.replace(
        taskId,
        record.revision,
        applied.record,
      );

    if (!persisted.accepted) {
      return result(
        false,
        persisted.reason,
        record,
      );
    }

    return result(
      true,
      'event_applied',
      persisted.record,
      {
        duplicate: false,
      },
    );
  }
}
