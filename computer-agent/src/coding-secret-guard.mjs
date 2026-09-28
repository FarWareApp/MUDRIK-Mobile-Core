const SIGNATURES =
  Object.freeze([
    /sk-[A-Za-z0-9_-]{20,}/,
    /ghp_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /AIza[A-Za-z0-9_-]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ]);

const MAX_DEPTH = 8;
const MAX_NODES = 20_000;

export function containsStrongSecretSignature(
  value,
) {
  let nodes = 0;
  const seen = new WeakSet();

  function visit(
    entry,
    depth,
  ) {
    nodes += 1;

    if (
      nodes > MAX_NODES
      || depth > MAX_DEPTH
    ) {
      return true;
    }

    if (typeof entry === 'string') {
      return SIGNATURES.some(
        (pattern) =>
          pattern.test(entry),
      );
    }

    if (
      entry === null
      || typeof entry !== 'object'
    ) {
      return false;
    }

    if (seen.has(entry)) {
      return true;
    }

    seen.add(entry);

    if (Array.isArray(entry)) {
      return entry.some(
        (item) =>
          visit(
            item,
            depth + 1,
          ),
      );
    }

    return Object.values(entry)
      .some(
        (item) =>
          visit(
            item,
            depth + 1,
          ),
      );
  }

  return visit(value, 0);
}
