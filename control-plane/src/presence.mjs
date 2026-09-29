import {
  isControlId,
} from './ids.mjs';

export const PRESENCE_STATES =
  Object.freeze([
    'online',
    'degraded',
    'reconnecting',
    'offline',
    'revoked',
  ]);

function time(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function snapshot(record) {
  return Object.freeze({
    protocolVersion: '1.0',
    deviceId: record.deviceId,
    connectionId:
      record.connectionId,
    state: record.state,
    connectedAtMs:
      record.connectedAtMs,
    lastHeartbeatAtMs:
      record.lastHeartbeatAtMs,
    lastRttMs:
      record.lastRttMs,
    backpressured:
      record.backpressured,
    disconnectedAtMs:
      record.disconnectedAtMs,
    revokedAtMs:
      record.revokedAtMs,
    revision: record.revision,
    grantsAuthority: false,
  });
}

export class PresenceRegistry {
  constructor({
    healthyHeartbeatMs = 10_000,
    livenessTimeoutMs = 30_000,
    reconnectWindowMs = 60_000,
    degradedRttMs = 2_000,
  } = {}) {
    if (
      !Number.isInteger(
        healthyHeartbeatMs,
      )
      || healthyHeartbeatMs < 1
      || !Number.isInteger(
        livenessTimeoutMs,
      )
      || livenessTimeoutMs
        <= healthyHeartbeatMs
      || !Number.isInteger(
        reconnectWindowMs,
      )
      || reconnectWindowMs < 1
      || !Number.isInteger(
        degradedRttMs,
      )
      || degradedRttMs < 1
    ) {
      throw new TypeError(
        'Invalid presence limits.',
      );
    }

    this.healthyHeartbeatMs =
      healthyHeartbeatMs;
    this.livenessTimeoutMs =
      livenessTimeoutMs;
    this.reconnectWindowMs =
      reconnectWindowMs;
    this.degradedRttMs =
      degradedRttMs;
    this.records = new Map();
  }

  connect(
    {
      deviceId,
      connectionId,
    },
    trustedNowMs,
  ) {
    if (
      !isControlId(
        'device',
        deviceId,
      )
      || !isControlId(
        'connection',
        connectionId,
      )
      || !time(trustedNowMs)
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'presence_connect_invalid',
      });
    }

    const current =
      this.records.get(deviceId);

    if (
      current
      && current.state === 'revoked'
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'presence_revoked',
      });
    }

    if (
      current
      && current.connectionId
        === connectionId
    ) {
      const age =
        trustedNowMs
        - current.lastHeartbeatAtMs;

      if (
        age >= 0
        && age
          <= this.livenessTimeoutMs
        && [
          'online',
          'degraded',
        ].includes(current.state)
      ) {
        return Object.freeze({
          accepted: true,
          duplicate: true,
          record:
            snapshot(current),
        });
      }

      return Object.freeze({
        accepted: false,
        reason:
          'presence_connection_replay',
      });
    }

    if (
      current
      && trustedNowMs
        < Math.max(
          current.lastHeartbeatAtMs,
          current.disconnectedAtMs
            ?? 0,
          current.revokedAtMs
            ?? 0,
        )
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'presence_time_rollback',
      });
    }

    const next = {
      deviceId,
      connectionId,
      state: 'online',
      connectedAtMs:
        trustedNowMs,
      lastHeartbeatAtMs:
        trustedNowMs,
      lastRttMs: null,
      backpressured: false,
      disconnectedAtMs: null,
      revokedAtMs: null,
      revision:
        (current?.revision ?? -1)
        + 1,
    };

    this.records.set(
      deviceId,
      next,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record: snapshot(next),
    });
  }

  heartbeat(
    {
      deviceId,
      connectionId,
      rttMs = null,
      backpressured = false,
    },
    trustedNowMs,
  ) {
    const current =
      this.records.get(deviceId);

    if (
      !current
      || ![
        'online',
        'degraded',
      ].includes(current.state)
      || current.connectionId
        !== connectionId
      || !time(trustedNowMs)
      || trustedNowMs
        < current.lastHeartbeatAtMs
      || (
        rttMs !== null
        && (
          !Number.isInteger(rttMs)
          || rttMs < 0
          || rttMs > 120_000
        )
      )
      || typeof backpressured
        !== 'boolean'
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'presence_heartbeat_invalid',
      });
    }

    const next = {
      ...current,
      state:
        backpressured
        || (
          rttMs !== null
          && rttMs
            >= this.degradedRttMs
        )
          ? 'degraded'
          : 'online',
      lastHeartbeatAtMs:
        trustedNowMs,
      lastRttMs: rttMs,
      backpressured,
      disconnectedAtMs: null,
      revision:
        current.revision + 1,
    };

    this.records.set(
      deviceId,
      next,
    );

    return Object.freeze({
      accepted: true,
      record: snapshot(next),
    });
  }

  disconnect(
    {
      deviceId,
      connectionId,
    },
    trustedNowMs,
  ) {
    const current =
      this.records.get(deviceId);

    if (
      !current
      || current.state === 'revoked'
      || current.connectionId
        !== connectionId
      || !time(trustedNowMs)
      || trustedNowMs
        < current.lastHeartbeatAtMs
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'presence_disconnect_invalid',
      });
    }

    if (
      current.state === 'reconnecting'
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record:
          snapshot(current),
      });
    }

    const next = {
      ...current,
      state: 'reconnecting',
      disconnectedAtMs:
        trustedNowMs,
      revision:
        current.revision + 1,
    };

    this.records.set(
      deviceId,
      next,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record: snapshot(next),
    });
  }

  revoke(
    deviceId,
    trustedNowMs,
  ) {
    const current =
      this.records.get(deviceId);

    if (
      !isControlId(
        'device',
        deviceId,
      )
      || !time(trustedNowMs)
      || (
        current
        && trustedNowMs
          < Math.max(
            current.lastHeartbeatAtMs,
            current.disconnectedAtMs
              ?? 0,
            current.revokedAtMs
              ?? 0,
          )
      )
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'presence_revoke_invalid',
      });
    }

    if (
      current
      && current.state === 'revoked'
    ) {
      return Object.freeze({
        accepted: true,
        duplicate: true,
        record:
          snapshot(current),
      });
    }

    const next = {
      deviceId,
      connectionId:
        current?.connectionId
        ?? null,
      state: 'revoked',
      connectedAtMs:
        current?.connectedAtMs
        ?? null,
      lastHeartbeatAtMs:
        current?.lastHeartbeatAtMs
        ?? trustedNowMs,
      lastRttMs:
        current?.lastRttMs
        ?? null,
      backpressured:
        current?.backpressured
        ?? false,
      disconnectedAtMs:
        current?.disconnectedAtMs
        ?? null,
      revokedAtMs:
        trustedNowMs,
      revision:
        (current?.revision ?? -1)
        + 1,
    };

    this.records.set(
      deviceId,
      next,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      record: snapshot(next),
    });
  }

  get(
    deviceId,
    trustedNowMs,
  ) {
    const current =
      this.records.get(deviceId);

    if (
      !current
      || !time(trustedNowMs)
    ) {
      return null;
    }

    if (
      current.state === 'revoked'
    ) {
      return snapshot(current);
    }

    if (
      trustedNowMs
        < current.lastHeartbeatAtMs
    ) {
      return null;
    }

    const age =
      trustedNowMs
      - current.lastHeartbeatAtMs;

    let state;

    if (
      current.state
        === 'reconnecting'
    ) {
      const disconnectedAge =
        trustedNowMs
        - current.disconnectedAtMs;

      state =
        disconnectedAge
          <= this.reconnectWindowMs
          ? 'reconnecting'
          : 'offline';
    } else if (
      age <= this.healthyHeartbeatMs
      && !current.backpressured
      && (
        current.lastRttMs === null
        || current.lastRttMs
          < this.degradedRttMs
      )
    ) {
      state = 'online';
    } else if (
      age <= this.livenessTimeoutMs
    ) {
      state = 'degraded';
    } else if (
      age
        <= this.livenessTimeoutMs
          + this.reconnectWindowMs
    ) {
      state = 'reconnecting';
    } else {
      state = 'offline';
    }

    return Object.freeze({
      ...snapshot(current),
      state,
      evaluatedAtMs:
        trustedNowMs,
      grantsAuthority: false,
    });
  }
}
