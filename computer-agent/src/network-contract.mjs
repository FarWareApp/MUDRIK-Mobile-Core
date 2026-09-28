import net from 'node:net';

const OPERATIONS =
  new Set([
    'fetch',
    'head',
  ]);

function plainObject(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype
    || prototype === null
  );
}

function exactKeys(
  value,
  allowed,
) {
  return Object.keys(value).every(
    (key) => allowed.has(key),
  );
}

function safeString(
  value,
  min,
  max,
) {
  return (
    typeof value === 'string'
    && value.length >= min
    && value.length <= max
    && !value.includes('\0')
  );
}

export function parseNetworkToolInput(
  input,
) {
  if (
    !plainObject(input)
    || !exactKeys(
      input,
      new Set([
        'operation',
        'url',
        'timeoutMs',
        'maxBytes',
      ]),
    )
    || !OPERATIONS.has(
      input.operation,
    )
    || !safeString(
      input.url,
      1,
      4096,
    )
    || (
      input.timeoutMs !== undefined
      && (
        !Number.isInteger(
          input.timeoutMs,
        )
        || input.timeoutMs < 100
        || input.timeoutMs > 30_000
      )
    )
    || (
      input.maxBytes !== undefined
      && (
        !Number.isInteger(
          input.maxBytes,
        )
        || input.maxBytes
          < (
            input.operation === 'head'
              ? 0
              : 1
          )
        || input.maxBytes
          > 2 * 1024 * 1024
      )
    )
  ) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(input.url);
  } catch {
    return null;
  }

  const hostname =
    parsed.hostname.toLowerCase();

  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.hash
    || !hostname
    || hostname.length > 253
    || hostname.startsWith('[')
    || hostname.endsWith(']')
    || net.isIP(hostname) !== 0
    || (
      parsed.port
      && parsed.port !== '443'
    )
  ) {
    return null;
  }

  return Object.freeze({
    operation:
      input.operation,
    url: parsed.toString(),
    timeoutMs:
      input.timeoutMs ?? 10_000,
    maxBytes:
      input.operation === 'head'
        ? 0
        : input.maxBytes
          ?? 512 * 1024,
  });
}

export function normalizeNetworkStep(
  step,
) {
  if (
    !step
    || step.tool !== 'network'
    || !Array.isArray(
      step.requiredCapabilities,
    )
    || step.requiredCapabilities.length
      !== 1
    || step.requiredCapabilities[0]
      !== 'network.outbound'
  ) {
    return null;
  }

  const input =
    parseNetworkToolInput(
      step.input ?? {},
    );

  if (!input) {
    return null;
  }

  return Object.freeze({
    ...step,
    input,
  });
}

export function networkPolicyContext(
  step,
) {
  const normalized =
    normalizeNetworkStep(step);

  if (!normalized) {
    return null;
  }

  return {
    'network.outbound': {
      domain:
        new URL(
          normalized.input.url,
        ).hostname.toLowerCase(),
      timeoutMs:
        normalized.input.timeoutMs,
      minimumRisk: 'medium',
    },
  };
}
