const SECRET_REF =
  /^secret_ref_[A-Za-z0-9_-]{16,240}$/;

const ENV_NAME =
  /^[A-Z_][A-Z0-9_]{0,63}$/;

const DANGEROUS_ENV_NAMES =
  new Set([
    'BASH_ENV',
    'CDPATH',
    'ENV',
    'GIT_CONFIG',
    'GIT_CONFIG_COUNT',
    'GIT_CONFIG_GLOBAL',
    'GIT_CONFIG_SYSTEM',
    'GIT_SSH',
    'GIT_SSH_COMMAND',
    'HOME',
    'IFS',
    'LD_LIBRARY_PATH',
    'LD_PRELOAD',
    'NODE_OPTIONS',
    'PATH',
    'PERL5LIB',
    'PERL5OPT',
    'PROMPT_COMMAND',
    'PYTHONHOME',
    'PYTHONPATH',
    'RUBYLIB',
    'RUBYOPT',
    'SHELLOPTS',
    'SSH_ASKPASS',
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

export function isSecretReference(
  value,
) {
  return (
    typeof value === 'string'
    && SECRET_REF.test(value)
  );
}

export function parseSecretBindings(
  value,
) {
  if (value === undefined) {
    return Object.freeze([]);
  }

  if (
    !Array.isArray(value)
    || value.length > 32
  ) {
    return null;
  }

  const parsed = [];
  const envNames = new Set();

  for (const binding of value) {
    if (
      !plainObject(binding)
      || Object.keys(binding).length
        !== 2
      || !Object.hasOwn(
        binding,
        'envName',
      )
      || !Object.hasOwn(
        binding,
        'secretRef',
      )
      || !ENV_NAME.test(
        binding.envName,
      )
      || DANGEROUS_ENV_NAMES.has(
        binding.envName,
      )
      || !isSecretReference(
        binding.secretRef,
      )
      || envNames.has(
        binding.envName,
      )
    ) {
      return null;
    }

    envNames.add(binding.envName);
    parsed.push(
      Object.freeze({
        envName: binding.envName,
        secretRef:
          binding.secretRef,
      }),
    );
  }

  return Object.freeze(parsed);
}

export function secretReferences(
  bindings,
) {
  if (!Array.isArray(bindings)) {
    return Object.freeze([]);
  }

  return Object.freeze([
    ...new Set(
      bindings.map(
        (binding) =>
          binding.secretRef,
      ),
    ),
  ]);
}

export function redactSecretValues(
  value,
  secrets,
) {
  let output =
    typeof value === 'string'
      ? value
      : String(value ?? '');

  const unique =
    [...new Set(
      secrets.filter(
        (secret) =>
          typeof secret === 'string'
          && secret.length > 0,
      ),
    )]
      .sort(
        (a, b) =>
          b.length - a.length,
      );

  for (const secret of unique) {
    output =
      output.split(secret).join(
        '[REDACTED]',
      );
  }

  return output;
}
