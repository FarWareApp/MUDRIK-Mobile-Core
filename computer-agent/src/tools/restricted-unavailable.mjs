const CODES =
  Object.freeze({
    browser:
      'browser_backend_unavailable',
    screen:
      'screen_backend_unavailable',
    clipboard:
      'clipboard_backend_unavailable',
    system:
      'system_backend_unavailable',
  });

export class RestrictedToolUnavailableError
  extends Error {
  constructor(code) {
    super(code);
    this.name =
      'RestrictedToolUnavailableError';
    this.code = code;
  }
}

export function runRestrictedUnavailable(
  tool,
) {
  const code = CODES[tool];

  if (!code) {
    throw new
      RestrictedToolUnavailableError(
        'restricted_tool_invalid',
      );
  }

  throw new
    RestrictedToolUnavailableError(
      code,
    );
}
