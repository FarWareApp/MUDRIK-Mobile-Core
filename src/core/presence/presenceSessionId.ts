const PRESENCE_SESSION_ID_PATTERN =
  /^psess_[a-z0-9][a-z0-9_-]{15,63}$/;

export function isPresenceSessionId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && PRESENCE_SESSION_ID_PATTERN.test(value)
  );
}
