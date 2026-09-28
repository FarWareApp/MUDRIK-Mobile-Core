const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const PATTERNS =
  Object.freeze({
    account:
      new RegExp('^acct_' + BODY + '$'),
    device:
      new RegExp('^dev_' + BODY + '$'),
    session:
      new RegExp('^sess_' + BODY + '$'),
    deviceKey:
      new RegExp('^dkey_' + BODY + '$'),
    task:
      new RegExp('^ctask_' + BODY + '$'),
    approval:
      new RegExp('^capproval_' + BODY + '$'),
    event:
      new RegExp('^cpevent_' + BODY + '$'),
    delivery:
      new RegExp('^cpdelivery_' + BODY + '$'),
    connection:
      new RegExp('^cpconn_' + BODY + '$'),
    nonce:
      new RegExp('^nonce_' + BODY + '$'),
  });

export function isControlId(
  kind,
  value,
) {
  return (
    typeof value === 'string'
    && Object.hasOwn(
      PATTERNS,
      kind,
    )
    && PATTERNS[kind].test(value)
  );
}

export function isPublicKeyThumbprint(
  value,
) {
  return (
    typeof value === 'string'
    && value.length === 43
    && /^[A-Za-z0-9_-]{43}$/
      .test(value)
  );
}

export function isPolicyVersion(
  value,
) {
  return (
    typeof value === 'string'
    && /^policy_[a-z0-9][a-z0-9_.-]{2,63}$/
      .test(value)
  );
}

export function isSha256Digest(
  value,
) {
  return (
    typeof value === 'string'
    && /^[a-f0-9]{64}$/.test(value)
  );
}
