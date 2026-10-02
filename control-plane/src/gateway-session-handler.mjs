import {
  timingSafeEqual,
} from 'node:crypto';

const ACCOUNT_ID =
  /^acct_[a-z0-9][a-z0-9_-]{15,63}$/;

const DEVICE_ID =
  /^dev_[a-z0-9][a-z0-9_-]{15,63}$/;

function json(
  status,
  body,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
        'cache-control':
          'no-store',
        'x-content-type-options':
          'nosniff',
      },
    },
  );
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return (
    a.length === b.length
    && timingSafeEqual(a, b)
  );
}

function bearer(request) {
  const header =
    request.headers.get(
      'authorization',
    );

  if (
    !header
    || !header.startsWith(
      'Bearer ',
    )
  ) {
    return null;
  }

  const token =
    header.slice(7).trim();

  return (
    token.length >= 32
    && token.length <= 4096
    && !/[\r\n]/.test(token)
  )
    ? token
    : null;
}

export function createGatewaySessionHandler({
  accessToken,
  sessionAuthority,
  clock = () => Date.now(),
}) {
  if (
    typeof accessToken !== 'string'
    || accessToken.length < 32
    || !sessionAuthority
    || typeof sessionAuthority.issue
      !== 'function'
    || typeof clock !== 'function'
  ) {
    throw new TypeError(
      'Invalid gateway session handler configuration.',
    );
  }

  return async function handle(request) {
    if (
      !(request instanceof Request)
      || request.method !== 'POST'
    ) {
      return json(
        405,
        {
          code:
            'method_not_allowed',
        },
      );
    }

    const token =
      bearer(request);

    if (
      !token
      || !safeEqual(
        token,
        accessToken,
      )
    ) {
      return json(
        401,
        {
          code:
            'unauthorized',
        },
      );
    }

    const contentType =
      request.headers.get(
        'content-type',
      ) ?? '';

    if (
      !contentType
        .toLowerCase()
        .startsWith(
          'application/json',
        )
    ) {
      return json(
        415,
        {
          code:
            'unsupported_media_type',
        },
      );
    }

    let input;

    try {
      input =
        await request.json();
    } catch {
      return json(
        400,
        {
          code:
            'invalid_json',
        },
      );
    }

    if (
      !input
      || typeof input !== 'object'
      || Array.isArray(input)
      || Object.keys(input)
        .sort()
        .join(',')
        !== [
          'accountId',
          'deviceId',
          'protocolVersion',
        ].sort().join(',')
      || input.protocolVersion
        !== '1.0'
      || typeof input.accountId
        !== 'string'
      || !ACCOUNT_ID.test(
        input.accountId,
      )
      || typeof input.deviceId
        !== 'string'
      || !DEVICE_ID.test(
        input.deviceId,
      )
    ) {
      return json(
        400,
        {
          code:
            'invalid_request',
        },
      );
    }

    const now = clock();

    if (
      !Number.isSafeInteger(now)
      || now < 0
    ) {
      return json(
        503,
        {
          code:
            'clock_unavailable',
        },
      );
    }

    const issued =
      sessionAuthority.issue({
        accountId:
          input.accountId,
        deviceId:
          input.deviceId,
        nowMs: now,
      });

    return json(
      200,
      {
        protocolVersion: '1.0',
        accessToken:
          issued.token,
        sessionId:
          issued.session.sessionId,
        issuedAtMs:
          issued.session.issuedAtMs,
        expiresAtMs:
          issued.session.expiresAtMs,
      },
    );
  };
}
