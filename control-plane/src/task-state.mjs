import {
  isControlId,
} from './ids.mjs';

import {
  parseRoutedTask,
} from './task-contract.mjs';

export const CONTROL_TASK_STATES =
  Object.freeze([
    'received',
    'authenticated',
    'awaiting_approval',
    'authorized',
    'queued',
    'delivered',
    'acknowledged',
    'running',
    'blocked',
    'succeeded',
    'failed',
    'cancelled',
    'revoked',
    'expired',
  ]);

const STATE_SET =
  new Set(
    CONTROL_TASK_STATES,
  );

const TERMINAL =
  new Set([
    'blocked',
    'succeeded',
    'failed',
    'cancelled',
    'revoked',
    'expired',
  ]);

const REASON =
  /^[a-z][a-z0-9_.-]{0,127}$/;

const RECORD_KEYS =
  new Set([
    'task',
    'state',
    'revision',
    'createdAtMs',
    'updatedAtMs',
    'deliveryCount',
    'currentDeliveryId',
    'acknowledgedDeliveryId',
    'agentEventSequence',
    'eventReceipts',
    'terminalReason',
  ]);

const RECEIPT_KEYS =
  new Set([
    'sequence',
    'eventId',
    'digest',
  ]);

function plainObject(value) {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && (
      Object.getPrototypeOf(value)
        === Object.prototype
      || Object.getPrototypeOf(value)
        === null
    )
  );
}

function time(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function parseReceipt(value) {
  if (
    !plainObject(value)
    || Object.keys(value).length
      !== RECEIPT_KEYS.size
    || Object.keys(value).some(
      (key) =>
        !RECEIPT_KEYS.has(key),
    )
    || !Number.isSafeInteger(
      value.sequence,
    )
    || value.sequence < 1
    || !isControlId(
      'event',
      value.eventId,
    )
    || typeof value.digest
      !== 'string'
    || !/^[a-f0-9]{64}$/
      .test(value.digest)
  ) {
    return null;
  }

  return Object.freeze({
    ...value,
  });
}

export function isTerminalTaskState(
  value,
) {
  return TERMINAL.has(value);
}

export function parseControlTaskRecord(
  input,
) {
  if (
    !plainObject(input)
    || Object.keys(input).length
      !== RECORD_KEYS.size
    || Object.keys(input).some(
      (key) =>
        !RECORD_KEYS.has(key),
    )
  ) {
    return null;
  }

  const task =
    parseRoutedTask(input.task);

  if (
    !task
    || !STATE_SET.has(input.state)
    || !Number.isSafeInteger(
      input.revision,
    )
    || input.revision < 0
    || !time(input.createdAtMs)
    || !time(input.updatedAtMs)
    || input.updatedAtMs
      < input.createdAtMs
    || !Number.isSafeInteger(
      input.deliveryCount,
    )
    || input.deliveryCount < 0
    || (
      input.currentDeliveryId
        !== null
      && !isControlId(
        'delivery',
        input.currentDeliveryId,
      )
    )
    || (
      input.acknowledgedDeliveryId
        !== null
      && !isControlId(
        'delivery',
        input.acknowledgedDeliveryId,
      )
    )
    || !Number.isSafeInteger(
      input.agentEventSequence,
    )
    || input.agentEventSequence < 0
    || !Array.isArray(
      input.eventReceipts,
    )
    || input.eventReceipts.length
      > 256
    || (
      input.terminalReason !== null
      && (
        typeof input.terminalReason
          !== 'string'
        || !REASON.test(
          input.terminalReason,
        )
      )
    )
  ) {
    return null;
  }

  const receipts = [];
  let previous = 0;

  for (
    const value of
      input.eventReceipts
  ) {
    const receipt =
      parseReceipt(value);

    if (
      !receipt
      || receipt.sequence
        <= previous
    ) {
      return null;
    }

    previous =
      receipt.sequence;
    receipts.push(receipt);
  }

  if (
    receipts.length > 0
    && receipts[
      receipts.length - 1
    ].sequence
      !== input.agentEventSequence
  ) {
    return null;
  }

  if (
    receipts.length === 0
    && input.agentEventSequence
      !== 0
  ) {
    return null;
  }

  if (
    input.deliveryCount === 0
    && (
      input.currentDeliveryId
        !== null
      || input
        .acknowledgedDeliveryId
        !== null
    )
  ) {
    return null;
  }

  if (
    input.acknowledgedDeliveryId
      !== null
    && input.deliveryCount < 1
  ) {
    return null;
  }

  if (
    isTerminalTaskState(
      input.state,
    )
    && input.terminalReason
      === null
  ) {
    return null;
  }

  if (
    !isTerminalTaskState(
      input.state,
    )
    && input.terminalReason
      !== null
  ) {
    return null;
  }

  return Object.freeze({
    task,
    state: input.state,
    revision: input.revision,
    createdAtMs:
      input.createdAtMs,
    updatedAtMs:
      input.updatedAtMs,
    deliveryCount:
      input.deliveryCount,
    currentDeliveryId:
      input.currentDeliveryId,
    acknowledgedDeliveryId:
      input.acknowledgedDeliveryId,
    agentEventSequence:
      input.agentEventSequence,
    eventReceipts:
      Object.freeze(receipts),
    terminalReason:
      input.terminalReason,
  });
}

export function createControlTaskRecord(
  taskInput,
  trustedNowMs,
) {
  const task =
    parseRoutedTask(taskInput);

  if (
    !task
    || !time(trustedNowMs)
  ) {
    return null;
  }

  return Object.freeze({
    task,
    state: 'received',
    revision: 0,
    createdAtMs:
      trustedNowMs,
    updatedAtMs:
      trustedNowMs,
    deliveryCount: 0,
    currentDeliveryId: null,
    acknowledgedDeliveryId:
      null,
    agentEventSequence: 0,
    eventReceipts:
      Object.freeze([]),
    terminalReason: null,
  });
}

function nextRecord(
  record,
  updates,
  trustedNowMs,
) {
  return Object.freeze({
    ...record,
    ...updates,
    revision:
      record.revision + 1,
    updatedAtMs:
      trustedNowMs,
  });
}

export function transitionControlTask(
  inputRecord,
  event,
  {
    expectedRevision,
    trustedNowMs,
    deliveryId = null,
    reason = null,
  } = {},
) {
  const record =
    parseControlTaskRecord(
      inputRecord,
    );

  if (
    !record
    || !Number.isSafeInteger(
      expectedRevision,
    )
    || expectedRevision
      !== record.revision
    || !time(trustedNowMs)
    || trustedNowMs
      < record.updatedAtMs
  ) {
    return Object.freeze({
      accepted: false,
      reason:
        'task_transition_conflict',
    });
  }

  if (
    isTerminalTaskState(
      record.state,
    )
  ) {
    const sameTerminal =
      (
        event === 'block'
        && record.state === 'blocked'
      )
      || (
        event === 'succeed'
        && record.state === 'succeeded'
      )
      || (
        event === 'fail'
        && record.state === 'failed'
      )
      || (
        event === 'cancel'
        && record.state === 'cancelled'
      )
      || (
        event === 'revoke'
        && record.state === 'revoked'
      )
      || (
        event === 'expire'
        && record.state === 'expired'
      );

    if (
      sameTerminal
      && typeof reason === 'string'
      && reason === record.terminalReason
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record,
      });
    }

    return Object.freeze({
      accepted: false,
      reason:
        'task_terminal',
    });
  }

  const simple = (
    from,
    to,
  ) => {
    if (!from.includes(record.state)) {
      return null;
    }

    return nextRecord(
      record,
      {
        state: to,
      },
      trustedNowMs,
    );
  };

  let next = null;

  if (event === 'authenticate') {
    next = simple(
      ['received'],
      'authenticated',
    );
  } else if (
    event === 'await_approval'
  ) {
    next = simple(
      ['authenticated'],
      'awaiting_approval',
    );
  } else if (
    event === 'authorize'
  ) {
    next = simple(
      [
        'authenticated',
        'awaiting_approval',
      ],
      'authorized',
    );
  } else if (event === 'queue') {
    next = simple(
      ['authorized'],
      'queued',
    );
  } else if (event === 'deliver') {
    if (
      ![
        'queued',
        'delivered',
      ].includes(record.state)
      || !isControlId(
        'delivery',
        deliveryId,
      )
    ) {
      next = null;
    } else if (
      record.state === 'delivered'
      && record.currentDeliveryId
        === deliveryId
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record,
      });
    } else {
      next = nextRecord(
        record,
        {
          state: 'delivered',
          deliveryCount:
            record.deliveryCount + 1,
          currentDeliveryId:
            deliveryId,
          acknowledgedDeliveryId:
            null,
        },
        trustedNowMs,
      );
    }
  } else if (
    event === 'acknowledge'
  ) {
    if (
      record.state !== 'delivered'
      || deliveryId
        !== record.currentDeliveryId
    ) {
      next = null;
    } else {
      next = nextRecord(
        record,
        {
          state:
            'acknowledged',
          acknowledgedDeliveryId:
            deliveryId,
        },
        trustedNowMs,
      );
    }
  } else if (event === 'start') {
    next = simple(
      ['acknowledged'],
      'running',
    );
  } else if (
    [
      'block',
      'succeed',
      'fail',
      'cancel',
      'revoke',
      'expire',
    ].includes(event)
  ) {
    const target =
      event === 'block'
        ? 'blocked'
        : event === 'succeed'
          ? 'succeeded'
          : event === 'fail'
            ? 'failed'
            : event === 'cancel'
              ? 'cancelled'
              : event === 'revoke'
                ? 'revoked'
                : 'expired';

    if (
      typeof reason !== 'string'
      || !REASON.test(reason)
    ) {
      next = null;
    } else if (
      event === 'succeed'
      || event === 'fail'
    ) {
      if (record.state === 'running') {
        next = nextRecord(
          record,
          {
            state: target,
            terminalReason:
              reason,
          },
          trustedNowMs,
        );
      }
    } else {
      next = nextRecord(
        record,
        {
          state: target,
          terminalReason:
            reason,
        },
        trustedNowMs,
      );
    }
  }

  if (!next) {
    return Object.freeze({
      accepted: false,
      reason:
        'task_transition_invalid',
    });
  }

  return Object.freeze({
    accepted: true,
    duplicate: false,
    record: next,
  });
}
