const SURFACE_REF =
  /^surface_[A-Za-z0-9_-]{16,240}$/;

const SETTING_ID =
  /^setting_[a-z0-9][a-z0-9_.-]{2,127}$/;

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

function parseHttpsUrl(value) {
  if (
    !safeString(value, 1, 4096)
  ) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || !parsed.hostname
    || parsed.hostname.length > 253
  ) {
    return null;
  }

  return Object.freeze({
    url: parsed.toString(),
  });
}

function normalizeRequired(
  step,
  required,
) {
  return (
    Array.isArray(
      step.requiredCapabilities,
    )
    && step.requiredCapabilities.length
      === required.length
    && required.every(
      (capability, index) =>
        step.requiredCapabilities[index]
          === capability,
    )
  );
}

export function isSurfaceReference(
  value,
) {
  return (
    typeof value === 'string'
    && SURFACE_REF.test(value)
  );
}

export function isSettingId(
  value,
) {
  return (
    typeof value === 'string'
    && SETTING_ID.test(value)
  );
}

export function isAdminActionId(
  value,
) {
  return (
    typeof value === 'string'
    && /^admin_[a-z0-9][a-z0-9_.-]{2,127}$/
      .test(value)
  );
}

function parseBrowser(input) {
  if (
    !plainObject(input)
    || ![
      'read',
      'control',
    ].includes(input.operation)
  ) {
    return null;
  }

  const allowed =
    input.operation === 'read'
      ? new Set([
          'operation',
          'url',
          'maxBytes',
        ])
      : new Set([
          'operation',
          'url',
          'action',
          'selector',
          'text',
        ]);

  if (!exactKeys(input, allowed)) {
    return null;
  }

  const target =
    parseHttpsUrl(input.url);

  if (!target) {
    return null;
  }

  if (input.operation === 'read') {
    if (
      input.maxBytes !== undefined
      && (
        !Number.isInteger(
          input.maxBytes,
        )
        || input.maxBytes < 1024
        || input.maxBytes
          > 2 * 1024 * 1024
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation: 'read',
      ...target,
      maxBytes:
        input.maxBytes
        ?? 512 * 1024,
    });
  }

  if (
    ![
      'navigate',
      'click',
      'type',
    ].includes(input.action)
    || (
      input.action !== 'navigate'
      && !safeString(
        input.selector,
        1,
        1024,
      )
    )
    || (
      input.action === 'navigate'
      && input.selector !== undefined
    )
    || (
      input.action === 'type'
      && !safeString(
        input.text,
        0,
        16_384,
      )
    )
    || (
      input.action !== 'type'
      && input.text !== undefined
    )
  ) {
    return null;
  }

  return Object.freeze({
    operation: 'control',
    ...target,
    action: input.action,
    selector:
      input.selector ?? null,
    text:
      input.text ?? null,
  });
}

function parseScreen(input) {
  if (
    !plainObject(input)
    || !exactKeys(
      input,
      new Set([
        'operation',
        'surfaceRef',
        'maxDimension',
      ]),
    )
    || input.operation !== 'capture'
    || !isSurfaceReference(
      input.surfaceRef,
    )
    || (
      input.maxDimension !== undefined
      && (
        !Number.isInteger(
          input.maxDimension,
        )
        || input.maxDimension < 320
        || input.maxDimension > 4096
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    operation: 'capture',
    surfaceRef: input.surfaceRef,
    maxDimension:
      input.maxDimension ?? 1920,
  });
}

function parseClipboard(input) {
  if (
    !plainObject(input)
    || ![
      'read',
      'write',
    ].includes(input.operation)
  ) {
    return null;
  }

  if (input.operation === 'read') {
    if (
      !exactKeys(
        input,
        new Set([
          'operation',
          'maxChars',
        ]),
      )
      || (
        input.maxChars !== undefined
        && (
          !Number.isInteger(
            input.maxChars,
          )
          || input.maxChars < 1
          || input.maxChars > 65_536
        )
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation: 'read',
      maxChars:
        input.maxChars ?? 16_384,
    });
  }

  if (
    !exactKeys(
      input,
      new Set([
        'operation',
        'text',
      ]),
    )
    || !safeString(
      input.text,
      0,
      65_536,
    )
  ) {
    return null;
  }

  return Object.freeze({
    operation: 'write',
    text: input.text,
  });
}

function safeSettingValue(value) {
  return (
    value === null
    || typeof value === 'boolean'
    || (
      typeof value === 'number'
      && Number.isFinite(value)
    )
    || safeString(
      value,
      0,
      4096,
    )
  );
}

function parseSystem(input) {
  if (
    !plainObject(input)
    || ![
      'inspect_setting',
      'set_setting',
      'admin_action',
    ].includes(input.operation)
  ) {
    return null;
  }

  if (
    input.operation ===
      'inspect_setting'
  ) {
    if (
      !exactKeys(
        input,
        new Set([
          'operation',
          'settingId',
        ]),
      )
      || !isSettingId(
        input.settingId,
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation:
        'inspect_setting',
      settingId:
        input.settingId,
    });
  }

  if (
    input.operation === 'set_setting'
  ) {
    if (
      !exactKeys(
        input,
        new Set([
          'operation',
          'settingId',
          'value',
        ]),
      )
      || !isSettingId(
        input.settingId,
      )
      || !safeSettingValue(
        input.value,
      )
    ) {
      return null;
    }

    return Object.freeze({
      operation: 'set_setting',
      settingId:
        input.settingId,
      value: input.value,
    });
  }

  if (
    !exactKeys(
      input,
      new Set([
        'operation',
        'actionId',
      ]),
    )
    || !isAdminActionId(
      input.actionId,
    )
  ) {
    return null;
  }

  return Object.freeze({
    operation: 'admin_action',
    actionId: input.actionId,
  });
}

export function normalizeRestrictedStep(
  step,
) {
  if (
    !step
    || typeof step !== 'object'
  ) {
    return null;
  }

  if (step.tool === 'browser') {
    const input =
      parseBrowser(
        step.input ?? {},
      );

    if (!input) {
      return null;
    }

    const required =
      input.operation === 'read'
        ? [
            'browser.read',
            'network.outbound',
          ]
        : [
            'browser.control',
            'network.outbound',
          ];

    if (
      !normalizeRequired(
        step,
        required,
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...step,
      input,
    });
  }

  if (step.tool === 'screen') {
    const input =
      parseScreen(
        step.input ?? {},
      );

    if (
      !input
      || !normalizeRequired(
        step,
        ['screen.capture'],
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...step,
      input,
    });
  }

  if (step.tool === 'clipboard') {
    const input =
      parseClipboard(
        step.input ?? {},
      );
    const required =
      input?.operation === 'read'
        ? ['clipboard.read']
        : ['clipboard.write'];

    if (
      !input
      || !normalizeRequired(
        step,
        required,
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...step,
      input,
    });
  }

  if (step.tool === 'system') {
    const input =
      parseSystem(
        step.input ?? {},
      );
    const required =
      input?.operation ===
        'admin_action'
        ? ['system.admin']
        : ['system.settings'];

    if (
      !input
      || !normalizeRequired(
        step,
        required,
      )
    ) {
      return null;
    }

    return Object.freeze({
      ...step,
      input,
    });
  }

  return null;
}

export function restrictedPolicyContext(
  step,
) {
  const normalized =
    normalizeRestrictedStep(step);

  if (!normalized) {
    return null;
  }

  if (normalized.tool === 'browser') {
    const capability =
      normalized.input.operation
        === 'read'
        ? 'browser.read'
        : 'browser.control';
    const risk =
      normalized.input.operation
        === 'read'
        ? 'low'
        : 'medium';
    const domain =
      new URL(
        normalized.input.url,
      ).hostname.toLowerCase();

    return {
      [capability]: {
        domain,
        minimumRisk: risk,
      },
      'network.outbound': {
        domain,
        minimumRisk: 'medium',
      },
    };
  }

  if (normalized.tool === 'screen') {
    return {
      'screen.capture': {
        surfaceRef:
          normalized.input
            .surfaceRef,
        minimumRisk: 'high',
      },
    };
  }

  if (normalized.tool === 'clipboard') {
    const capability =
      normalized.input.operation
        === 'read'
        ? 'clipboard.read'
        : 'clipboard.write';

    return {
      [capability]: {
        minimumRisk:
          normalized.input.operation
            === 'read'
            ? 'high'
            : 'medium',
      },
    };
  }

  if (normalized.tool === 'system') {
    if (
      normalized.input.operation
        === 'admin_action'
    ) {
      return {
        'system.admin': {
          adminActionId:
            normalized.input
              .actionId,
          minimumRisk: 'critical',
        },
      };
    }

    return {
      'system.settings': {
        settingId:
          normalized.input
            .settingId,
        minimumRisk: 'high',
      },
    };
  }

  return null;
}
