import {
  GatewaySessionUnavailableError,
} from './GatewaySessionTokenStore';

const MIN_ACCESS_TOKEN_LENGTH = 32;
const MAX_ACCESS_TOKEN_LENGTH = 4096;
const MAX_SESSION_LIFETIME_MS =
  15 * 60 * 1000;
const DEFAULT_REFRESH_WINDOW_MS =
  60 * 1000;

export type GatewaySessionLease =
  Readonly<{
    accessToken: string;
    issuedAtMs: number;
    expiresAtMs: number;
  }>;

export type GatewaySessionSnapshot =
  Readonly<{
    available: boolean;
    expiresAtMs: number | null;
    generation: number;
    refreshable: boolean;
  }>;

export interface GatewaySessionRefreshPort {
  refresh():
    Promise<GatewaySessionLease>;
}

function safeEpochMs(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function validToken(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && value.length
      >= MIN_ACCESS_TOKEN_LENGTH
    && value.length
      <= MAX_ACCESS_TOKEN_LENGTH
    && !/[\r\n]/.test(value)
  );
}

function parseLease(
  value: unknown,
  nowMs: number,
): GatewaySessionLease | null {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    Object.keys(record)
      .sort()
      .join(',')
      !== [
        'accessToken',
        'expiresAtMs',
        'issuedAtMs',
      ].sort().join(',')
    || !validToken(
      record.accessToken,
    )
    || !safeEpochMs(
      record.issuedAtMs,
    )
    || !safeEpochMs(
      record.expiresAtMs,
    )
    || record.issuedAtMs > nowMs
    || record.expiresAtMs <= nowMs
    || record.expiresAtMs
      <= record.issuedAtMs
    || record.expiresAtMs
      - record.issuedAtMs
      > MAX_SESSION_LIFETIME_MS
  ) {
    return null;
  }

  return Object.freeze({
    accessToken:
      record.accessToken,
    issuedAtMs:
      record.issuedAtMs,
    expiresAtMs:
      record.expiresAtMs,
  });
}

export class GatewaySessionManager {
  private lease:
    GatewaySessionLease | null = null;

  private generation = 0;

  private refreshInFlight:
    Promise<GatewaySessionLease>
    | null = null;

  constructor(
    private readonly refreshPort:
      GatewaySessionRefreshPort
      | null = null,
    private readonly clock:
      () => number =
        () => Date.now(),
    private readonly refreshWindowMs =
      DEFAULT_REFRESH_WINDOW_MS,
  ) {
    if (
      !Number.isSafeInteger(
        refreshWindowMs,
      )
      || refreshWindowMs < 0
      || refreshWindowMs
        >= MAX_SESSION_LIFETIME_MS
    ) {
      throw new TypeError(
        'Invalid gateway session refresh window',
      );
    }
  }

  install(
    input: GatewaySessionLease,
  ): GatewaySessionSnapshot {
    const now = this.clock();
    const parsed =
      safeEpochMs(now)
        ? parseLease(
            input,
            now,
          )
        : null;

    if (!parsed) {
      throw new TypeError(
        'Invalid gateway session lease',
      );
    }

    this.lease = parsed;
    this.generation += 1;

    return this.snapshot();
  }

  clear():
    GatewaySessionSnapshot {
    this.lease = null;
    this.generation += 1;

    return this.snapshot();
  }

  async getAccessToken():
    Promise<string> {
    const now = this.clock();

    if (!safeEpochMs(now)) {
      this.clear();

      throw new
        GatewaySessionUnavailableError();
    }

    if (
      this.lease
      && this.lease.expiresAtMs
        - now
        > this.refreshWindowMs
    ) {
      return this.lease.accessToken;
    }

    if (!this.refreshPort) {
      if (
        this.lease
        && this.lease.expiresAtMs
          > now
      ) {
        return this.lease.accessToken;
      }

      this.clear();

      throw new
        GatewaySessionUnavailableError();
    }

    if (!this.refreshInFlight) {
      this.refreshInFlight =
        this.refreshOnce(now)
          .finally(() => {
            this.refreshInFlight =
              null;
          });
    }

    const refreshed =
      await this.refreshInFlight;

    return refreshed.accessToken;
  }

  private async refreshOnce(
    now: number,
  ): Promise<GatewaySessionLease> {
    let value: unknown;

    try {
      value =
        await this.refreshPort
          ?.refresh();
    } catch {
      this.clear();

      throw new
        GatewaySessionUnavailableError();
    }

    const parsed =
      parseLease(
        value,
        now,
      );

    if (!parsed) {
      this.clear();

      throw new
        GatewaySessionUnavailableError();
    }

    this.lease = parsed;
    this.generation += 1;

    return parsed;
  }

  snapshot():
    GatewaySessionSnapshot {
    return Object.freeze({
      available:
        this.lease !== null,
      expiresAtMs:
        this.lease?.expiresAtMs
        ?? null,
      generation:
        this.generation,
      refreshable:
        this.refreshPort !== null,
    });
  }

  toJSON():
    GatewaySessionSnapshot {
    return this.snapshot();
  }
}
