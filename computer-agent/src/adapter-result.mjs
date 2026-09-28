const FORBIDDEN_KEY =
  /(?:^|_)(?:approval|authority|capability|credential|password|secret|token|private_key|grant)(?:$|_)/i;

const SAFE_ERROR_CODE =
  /^[a-z][a-z0-9_-]{0,127}$/;

const MAX_RESULT_BYTES =
  12 * 1024 * 1024;

const MAX_DEPTH = 6;
const MAX_ARRAY = 10_000;
const MAX_KEYS = 256;
const MAX_STRING = 8 * 1024 * 1024;

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

function cloneBounded(
  value,
  depth = 0,
) {
  if (depth > MAX_DEPTH) {
    return null;
  }

  if (
    value === null
    || typeof value === 'boolean'
  ) {
    return value;
  }

  if (
    typeof value === 'number'
    && Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length <= MAX_STRING
      ? value
      : null;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY) {
      return null;
    }

    const output = [];

    for (const entry of value) {
      const cloned =
        cloneBounded(
          entry,
          depth + 1,
        );

      if (cloned === null && entry !== null) {
        return null;
      }

      output.push(cloned);
    }

    return Object.freeze(output);
  }

  if (!plainObject(value)) {
    return null;
  }

  const entries =
    Object.entries(value);

  if (
    entries.length > MAX_KEYS
    || entries.some(
      ([key]) =>
        key.length < 1
        || key.length > 128
        || FORBIDDEN_KEY.test(key),
    )
  ) {
    return null;
  }

  const output = {};

  for (const [key, entry] of entries) {
    const cloned =
      cloneBounded(
        entry,
        depth + 1,
      );

    if (cloned === null && entry !== null) {
      return null;
    }

    output[key] = cloned;
  }

  return Object.freeze(output);
}

export function sanitizeAdapterResult(
  value,
) {
  if (!plainObject(value)) {
    return null;
  }

  if (
    !Object.hasOwn(
      value,
      'exitCode',
    )
    || !(
      value.exitCode === null
      || (
        Number.isInteger(
          value.exitCode,
        )
        && value.exitCode >= 0
        && value.exitCode <= 255
      )
    )
  ) {
    return null;
  }

  const cloned =
    cloneBounded(value);

  if (!cloned) {
    return null;
  }

  let encoded;

  try {
    encoded =
      JSON.stringify(cloned);
  } catch {
    return null;
  }

  if (
    Buffer.byteLength(
      encoded,
      'utf8',
    ) > MAX_RESULT_BYTES
  ) {
    return null;
  }

  return cloned;
}

export function sanitizeToolError(
  error,
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  return SAFE_ERROR_CODE.test(message)
    ? message
    : 'tool_execution_failed';
}
