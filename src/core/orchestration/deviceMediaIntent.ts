import {
  isIdentityId,
} from '../identity/identityIds';

export type DeviceMediaIntentKind =
  | 'media.play'
  | 'media.pause'
  | 'media.next'
  | 'media.previous'
  | 'media.seek'
  | 'media.set_volume'
  | 'media.transfer_session'
  | 'tv.channel.next'
  | 'tv.channel.set'
  | 'app.open'
  | 'app.close'
  | 'content.search'
  | 'content.play'
  | 'game.launch'
  | 'device.focus'
  | 'display.companion.move';

export type CompanionPlacement =
  | 'top_left'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_right'
  | 'center_left'
  | 'center_right'
  | 'minimal'
  | 'hidden';

type BaseIntent = Readonly<{
  orchestrationSessionId: string;
  intentId: string;
  sequence: number;
  kind: DeviceMediaIntentKind;
  targetDeviceId: string;
}>;

export type NormalizedDeviceMediaIntent =
  | (BaseIntent & Readonly<{
      kind:
        | 'media.play'
        | 'media.pause'
        | 'media.next'
        | 'media.previous'
        | 'tv.channel.next'
        | 'device.focus';
    }>)
  | (BaseIntent & Readonly<{
      kind: 'media.seek';
      positionMs: number;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'media.set_volume';
      volumePercent: number;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'media.transfer_session';
      sourceDeviceId: string;
      mediaSessionRef: string;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'tv.channel.set';
      channelRef: string;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'app.open' | 'app.close';
      appRef: string;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'content.search';
      queryText: string;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'content.play';
      contentRef: string;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'game.launch';
      gameRef: string;
    }>)
  | (BaseIntent & Readonly<{
      kind: 'display.companion.move';
      placement: CompanionPlacement;
    }>);

const ORCHESTRATION_SESSION_ID =
  /^orch_[a-z0-9][a-z0-9_-]{15,63}$/;

const INTENT_ID =
  /^dmi_[a-z0-9][a-z0-9_-]{15,63}$/;

const OPAQUE_REFERENCE =
  /^[a-z][a-z0-9_-]{1,23}_[a-z0-9][a-z0-9._:-]{1,95}$/;

export function isOrchestrationSessionId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && ORCHESTRATION_SESSION_ID.test(value)
  );
}

export function isDeviceMediaIntentId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && INTENT_ID.test(value)
  );
}


const CREDENTIAL_SHAPE =
  /(?:^|[._:-])(?:sk|api[_-]?key|bearer|token|secret|ghp|github[_-]?pat|aiza)(?:[._:-]|$)/i;

const URL_OR_SCRIPT_SHAPE =
  /(?:^[a-z][a-z0-9+.-]*:|\/\/|\b(?:bash|zsh|sh)\s+-c\b|\b(?:powershell|pwsh)\b|\bcmd(?:\.exe)?\s+\/c\b|&&|\|\||`|\$\()/i;

const KINDS: readonly DeviceMediaIntentKind[] = [
  'media.play',
  'media.pause',
  'media.next',
  'media.previous',
  'media.seek',
  'media.set_volume',
  'media.transfer_session',
  'tv.channel.next',
  'tv.channel.set',
  'app.open',
  'app.close',
  'content.search',
  'content.play',
  'game.launch',
  'device.focus',
  'display.companion.move',
];

const PLACEMENTS: readonly CompanionPlacement[] = [
  'top_left',
  'top_right',
  'bottom_left',
  'bottom_right',
  'center_left',
  'center_right',
  'minimal',
  'hidden',
];

const BASE_KEYS = [
  'orchestrationSessionId',
  'intentId',
  'sequence',
  'kind',
  'targetDeviceId',
] as const;

const MAX_MEDIA_POSITION_MS =
  7 * 24 * 60 * 60 * 1000;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
  );
}

function isSafeNonNegativeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function hasExactKeys(
  record: Record<string, unknown>,
  extraKeys: readonly string[] = [],
): boolean {
  const expected = new Set<string>([
    ...BASE_KEYS,
    ...extraKeys,
  ]);

  return (
    Object.keys(record).length === expected.size
    && Object.keys(record).every(
      (key) => expected.has(key),
    )
  );
}

function isKind(
  value: unknown,
): value is DeviceMediaIntentKind {
  return (
    typeof value === 'string'
    && KINDS.includes(
      value as DeviceMediaIntentKind,
    )
  );
}

function parseOpaqueReference(
  value: unknown,
  prefix: 'app' | 'media' | 'content' | 'game' | 'channel',
): string | null {
  if (
    typeof value !== 'string'
    || value.length > 120
    || !value.startsWith(`${prefix}_`)
    || !OPAQUE_REFERENCE.test(value)
    || CREDENTIAL_SHAPE.test(value)
    || URL_OR_SCRIPT_SHAPE.test(value)
  ) {
    return null;
  }

  return value;
}

function parseSearchQuery(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0
    || normalized.length > 512
    || /[\u0000-\u001F\u007F]/.test(normalized)
    || URL_OR_SCRIPT_SHAPE.test(normalized)
    || CREDENTIAL_SHAPE.test(normalized)
  ) {
    return null;
  }

  return normalized;
}

function parseBase(
  record: Record<string, unknown>,
): BaseIntent | null {
  if (
    !isOrchestrationSessionId(
      record.orchestrationSessionId,
    )
    || !isDeviceMediaIntentId(
      record.intentId,
    )
    || !isSafeNonNegativeInteger(record.sequence)
    || !isKind(record.kind)
    || !isIdentityId(
      'device',
      record.targetDeviceId,
    )
  ) {
    return null;
  }

  return {
    orchestrationSessionId:
      record.orchestrationSessionId,
    intentId: record.intentId,
    sequence: record.sequence,
    kind: record.kind,
    targetDeviceId:
      record.targetDeviceId,
  };
}

function freezeIntent<T extends NormalizedDeviceMediaIntent>(
  value: T,
): T {
  return Object.freeze(value);
}

export function parseDeviceMediaIntent(
  input: unknown,
): NormalizedDeviceMediaIntent | null {
  if (!isRecord(input) || !isKind(input.kind)) {
    return null;
  }

  const base = parseBase(input);
  if (!base) {
    return null;
  }

  switch (base.kind) {
    case 'media.play':
    case 'media.pause':
    case 'media.next':
    case 'media.previous':
    case 'tv.channel.next':
    case 'device.focus': {
      if (!hasExactKeys(input)) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: base.kind,
      });
    }

    case 'media.seek': {
      if (
        !hasExactKeys(input, ['positionMs'])
        || !isSafeNonNegativeInteger(
          input.positionMs,
        )
        || input.positionMs
          > MAX_MEDIA_POSITION_MS
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'media.seek',
        positionMs: input.positionMs,
      });
    }

    case 'media.set_volume': {
      if (
        !hasExactKeys(input, ['volumePercent'])
        || !isSafeNonNegativeInteger(
          input.volumePercent,
        )
        || input.volumePercent > 100
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'media.set_volume',
        volumePercent:
          input.volumePercent,
      });
    }

    case 'media.transfer_session': {
      const mediaSessionRef =
        parseOpaqueReference(
          input.mediaSessionRef,
          'media',
        );

      if (
        !hasExactKeys(
          input,
          [
            'sourceDeviceId',
            'mediaSessionRef',
          ],
        )
        || !isIdentityId(
          'device',
          input.sourceDeviceId,
        )
        || input.sourceDeviceId
          === base.targetDeviceId
        || !mediaSessionRef
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'media.transfer_session',
        sourceDeviceId:
          input.sourceDeviceId,
        mediaSessionRef,
      });
    }

    case 'tv.channel.set': {
      const channelRef =
        parseOpaqueReference(
          input.channelRef,
          'channel',
        );

      if (
        !hasExactKeys(input, ['channelRef'])
        || !channelRef
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'tv.channel.set',
        channelRef,
      });
    }

    case 'app.open':
    case 'app.close': {
      const appRef =
        parseOpaqueReference(
          input.appRef,
          'app',
        );

      if (
        !hasExactKeys(input, ['appRef'])
        || !appRef
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: base.kind,
        appRef,
      });
    }

    case 'content.search': {
      const queryText =
        parseSearchQuery(
          input.queryText,
        );

      if (
        !hasExactKeys(input, ['queryText'])
        || !queryText
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'content.search',
        queryText,
      });
    }

    case 'content.play': {
      const contentRef =
        parseOpaqueReference(
          input.contentRef,
          'content',
        );

      if (
        !hasExactKeys(input, ['contentRef'])
        || !contentRef
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'content.play',
        contentRef,
      });
    }

    case 'game.launch': {
      const gameRef =
        parseOpaqueReference(
          input.gameRef,
          'game',
        );

      if (
        !hasExactKeys(input, ['gameRef'])
        || !gameRef
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'game.launch',
        gameRef,
      });
    }

    case 'display.companion.move': {
      if (
        !hasExactKeys(input, ['placement'])
        || typeof input.placement !== 'string'
        || !PLACEMENTS.includes(
          input.placement as CompanionPlacement,
        )
      ) {
        return null;
      }

      return freezeIntent({
        ...base,
        kind: 'display.companion.move',
        placement:
          input.placement as CompanionPlacement,
      });
    }
  }
}
