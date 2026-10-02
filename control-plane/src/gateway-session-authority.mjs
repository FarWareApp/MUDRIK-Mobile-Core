import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ACCOUNT_ID =
  /^acct_[a-z0-9][a-z0-9_-]{15,63}$/;

const DEVICE_ID =
  /^dev_[a-z0-9][a-z0-9_-]{15,63}$/;

const SESSION_ID =
  /^sess_[a-z0-9][a-z0-9_-]{15,63}$/;

const MAX_SESSION_LIFETIME_MS =
  15 * 60 * 1000;

const AUDIENCE =
  'mudrik-intelligence-gateway';

function safeEpochMs(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function encodeJson(value) {
  return Buffer
    .from(
      JSON.stringify(value),
      'utf8',
    )
    .toString('base64url');
}

function signature(
  secret,
  payload,
) {
  return createHmac(
    'sha256',
    secret,
  )
    .update(payload)
    .digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return (
    a.length === b.length
    && timingSafeEqual(a, b)
  );
}

function parsePayload(encoded) {
  if (
    typeof encoded !== 'string'
    || encoded.length < 16
    || encoded.length > 2048
  ) {
    return null;
  }

  let value;

  try {
    value =
      JSON.parse(
        Buffer
          .from(
            encoded,
            'base64url',
          )
          .toString('utf8'),
      );
  } catch {
    return null;
  }

  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || Object.keys(value)
      .sort()
      .join(',')
      !== [
        'accountId',
        'aud',
        'deviceId',
        'expiresAtMs',
        'issuedAtMs',
        'sessionId',
        'v',
      ].sort().join(',')
    || value.v !== 1
    || value.aud !== AUDIENCE
    || typeof value.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      value.accountId,
    )
    || typeof value.deviceId
      !== 'string'
    || !DEVICE_ID.test(
      value.deviceId,
    )
    || typeof value.sessionId
      !== 'string'
    || !SESSION_ID.test(
      value.sessionId,
    )
    || !safeEpochMs(
      value.issuedAtMs,
    )
    || !safeEpochMs(
      value.expiresAtMs,
    )
    || value.expiresAtMs
      <= value.issuedAtMs
    || value.expiresAtMs
      - value.issuedAtMs
      > MAX_SESSION_LIFETIME_MS
  ) {
    return null;
  }

  return Object.freeze({
    sessionId:
      value.sessionId,
    accountId:
      value.accountId,
    deviceId:
      value.deviceId,
    issuedAtMs:
      value.issuedAtMs,
    expiresAtMs:
      value.expiresAtMs,
  });
}

export class GatewaySessionAuthority {
  constructor(secret) {
    if (
      typeof secret !== 'string'
      || secret.length < 32
      || secret.length > 512
      || /[\r\n]/.test(secret)
    ) {
      throw new TypeError(
        'Invalid gateway session secret.',
      );
    }

    this.secret = secret;
  }

  issue({
    accountId,
    deviceId,
    nowMs,
    ttlMs =
      10 * 60 * 1000,
  }) {
    if (
      typeof accountId !== 'string'
      || !ACCOUNT_ID.test(accountId)
      || typeof deviceId !== 'string'
      || !DEVICE_ID.test(deviceId)
      || !safeEpochMs(nowMs)
      || !Number.isSafeInteger(ttlMs)
      || ttlMs < 60_000
      || ttlMs
        > MAX_SESSION_LIFETIME_MS
    ) {
      throw new TypeError(
        'Invalid gateway session issue request.',
      );
    }

    const payload =
      Object.freeze({
        v: 1,
        aud: AUDIENCE,
        sessionId:
          'sess_'
          + randomBytes(18)
            .toString('hex'),
        accountId,
        deviceId,
        issuedAtMs: nowMs,
        expiresAtMs:
          nowMs + ttlMs,
      });

    const encoded =
      encodeJson(payload);
    const mac =
      signature(
        this.secret,
        'v1.' + encoded,
      );

    return Object.freeze({
      token:
        'v1.'
        + encoded
        + '.'
        + mac,
      session:
        Object.freeze({
          sessionId:
            payload.sessionId,
          accountId:
            payload.accountId,
          deviceId:
            payload.deviceId,
          issuedAtMs:
            payload.issuedAtMs,
          expiresAtMs:
            payload.expiresAtMs,
        }),
    });
  }

  verify(token, nowMs) {
    if (
      typeof token !== 'string'
      || token.length < 32
      || token.length > 4096
      || /[\r\n]/.test(token)
      || !safeEpochMs(nowMs)
    ) {
      return null;
    }

    const parts =
      token.split('.');

    if (
      parts.length !== 3
      || parts[0] !== 'v1'
    ) {
      return null;
    }

    const expected =
      signature(
        this.secret,
        'v1.' + parts[1],
      );

    if (!safeEqual(
      parts[2],
      expected,
    )) {
      return null;
    }

    const session =
      parsePayload(parts[1]);

    if (
      !session
      || session.issuedAtMs
        > nowMs
      || session.expiresAtMs
        <= nowMs
    ) {
      return null;
    }

    return session;
  }
}
