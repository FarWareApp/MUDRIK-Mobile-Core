function time(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function key(value) {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= 256
    && /^[A-Za-z0-9:._-]+$/
      .test(value)
  );
}

export class FixedWindowRateLimiter {
  constructor({
    windowMs,
    maxEvents,
    maxKeys = 10_000,
  } = {}) {
    if (
      !Number.isInteger(windowMs)
      || windowMs < 1
      || windowMs > 3_600_000
      || !Number.isInteger(maxEvents)
      || maxEvents < 1
      || maxEvents > 1_000_000
      || !Number.isInteger(maxKeys)
      || maxKeys < 1
      || maxKeys > 1_000_000
    ) {
      throw new TypeError(
        'Invalid rate limiter.',
      );
    }

    this.windowMs = windowMs;
    this.maxEvents = maxEvents;
    this.maxKeys = maxKeys;
    this.buckets = new Map();
  }

  check(
    subject,
    trustedNowMs,
    {
      cost = 1,
    } = {},
  ) {
    if (
      !key(subject)
      || !time(trustedNowMs)
      || !Number.isInteger(cost)
      || cost < 1
      || cost > this.maxEvents
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'rate_limit_input_invalid',
      });
    }

    let bucket =
      this.buckets.get(subject);

    if (
      bucket
      && trustedNowMs
        < bucket.windowStartMs
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'rate_limit_time_rollback',
      });
    }

    if (
      !bucket
      || trustedNowMs
        >= bucket.windowStartMs
          + this.windowMs
    ) {
      if (
        !bucket
        && this.buckets.size
          >= this.maxKeys
      ) {
        this.cleanup(
          trustedNowMs,
        );
      }

      if (
        !bucket
        && this.buckets.size
          >= this.maxKeys
      ) {
        return Object.freeze({
          allowed: false,
          reason:
            'rate_limit_key_capacity',
        });
      }

      bucket = {
        windowStartMs:
          trustedNowMs,
        used: 0,
      };
      this.buckets.set(
        subject,
        bucket,
      );
    }

    if (
      bucket.used + cost
        > this.maxEvents
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'rate_limited',
        retryAfterMs:
          Math.max(
            1,
            bucket.windowStartMs
              + this.windowMs
              - trustedNowMs,
          ),
        remaining: 0,
      });
    }

    bucket.used += cost;

    return Object.freeze({
      allowed: true,
      reason: 'allowed',
      retryAfterMs: 0,
      remaining:
        this.maxEvents
        - bucket.used,
    });
  }

  cleanup(trustedNowMs) {
    if (!time(trustedNowMs)) {
      return 0;
    }

    let removed = 0;

    for (
      const [
        subject,
        bucket,
      ] of this.buckets
    ) {
      if (
        trustedNowMs
          >= bucket.windowStartMs
            + this.windowMs
      ) {
        this.buckets.delete(subject);
        removed += 1;
      }
    }

    return removed;
  }
}
