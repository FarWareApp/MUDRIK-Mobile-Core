function integer(
  value,
  min,
  max,
) {
  return (
    Number.isInteger(value)
    && value >= min
    && value <= max
  );
}

export function reconnectDelayMs(
  {
    attempt,
    baseDelayMs = 500,
    maxDelayMs = 30_000,
    jitterFraction = 0.25,
    jitterUnit = 0.5,
  } = {},
) {
  if (
    !integer(attempt, 0, 30)
    || !integer(
      baseDelayMs,
      1,
      60_000,
    )
    || !integer(
      maxDelayMs,
      baseDelayMs,
      300_000,
    )
    || typeof jitterFraction
      !== 'number'
    || !Number.isFinite(
      jitterFraction,
    )
    || jitterFraction < 0
    || jitterFraction > 0.5
    || typeof jitterUnit
      !== 'number'
    || !Number.isFinite(
      jitterUnit,
    )
    || jitterUnit < 0
    || jitterUnit > 1
  ) {
    return null;
  }

  const exponent =
    Math.min(attempt, 20);
  const raw =
    Math.min(
      maxDelayMs,
      baseDelayMs
        * (2 ** exponent),
    );
  const multiplier =
    1
    - jitterFraction
    + (
      2
      * jitterFraction
      * jitterUnit
    );

  return Math.max(
    1,
    Math.min(
      maxDelayMs,
      Math.round(
        raw * multiplier,
      ),
    ),
  );
}

export class DeterministicReconnectPolicy {
  constructor(options = {}) {
    this.options =
      Object.freeze({
        baseDelayMs:
          options.baseDelayMs
          ?? 500,
        maxDelayMs:
          options.maxDelayMs
          ?? 30_000,
        jitterFraction:
          options.jitterFraction
          ?? 0.25,
      });

    if (
      reconnectDelayMs({
        attempt: 0,
        ...this.options,
        jitterUnit: 0.5,
      }) === null
    ) {
      throw new TypeError(
        'Invalid reconnect policy.',
      );
    }
  }

  delay(
    attempt,
    jitterUnit,
  ) {
    return reconnectDelayMs({
      attempt,
      ...this.options,
      jitterUnit,
    });
  }
}
