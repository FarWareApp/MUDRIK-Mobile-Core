import { isIdentityId } from './identityIds';
import type { SessionState } from './sessionPolicy';

export type SessionInventoryEntry = Readonly<{
  sessionId: string;
  deviceId: string;
  deviceLabel: string;
  platform: 'android' | 'ios' | 'web' | 'linux' | 'windows' | 'macos' | 'unknown';
  createdAtMs: number;
  lastActiveAtMs: number;
  state: SessionState;
  isCurrent: boolean;
}>;

export type SessionInventoryResult = Readonly<{
  valid: boolean;
  entries: readonly SessionInventoryEntry[];
}>;

function isPlatform(value: unknown): value is SessionInventoryEntry['platform'] {
  return (
    value === 'android' ||
    value === 'ios' ||
    value === 'web' ||
    value === 'linux' ||
    value === 'windows' ||
    value === 'macos' ||
    value === 'unknown'
  );
}

function isState(value: unknown): value is SessionState {
  return (
    value === 'active' ||
    value === 'reauth_required' ||
    value === 'suspected_reuse' ||
    value === 'revoked' ||
    value === 'expired'
  );
}

function parseEntry(value: unknown): SessionInventoryEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'sessionId',
    'deviceId',
    'deviceLabel',
    'platform',
    'createdAtMs',
    'lastActiveAtMs',
    'state',
    'isCurrent',
  ]);

  if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    !isIdentityId('session', record.sessionId) ||
    !isIdentityId('device', record.deviceId) ||
    typeof record.deviceLabel !== 'string' ||
    record.deviceLabel.trim().length === 0 ||
    record.deviceLabel.length > 80 ||
    record.deviceLabel.includes('\0') ||
    !isPlatform(record.platform) ||
    typeof record.createdAtMs !== 'number' ||
    !Number.isFinite(record.createdAtMs) ||
    typeof record.lastActiveAtMs !== 'number' ||
    !Number.isFinite(record.lastActiveAtMs) ||
    record.lastActiveAtMs < record.createdAtMs ||
    !isState(record.state) ||
    typeof record.isCurrent !== 'boolean'
  ) {
    return null;
  }

  return Object.freeze({
    sessionId: record.sessionId,
    deviceId: record.deviceId,
    deviceLabel: record.deviceLabel.trim(),
    platform: record.platform,
    createdAtMs: record.createdAtMs,
    lastActiveAtMs: record.lastActiveAtMs,
    state: record.state,
    isCurrent: record.isCurrent,
  });
}

export function buildSessionInventory(input: unknown): SessionInventoryResult {
  if (!Array.isArray(input) || input.length > 100) {
    return { valid: false, entries: [] };
  }

  const entries: SessionInventoryEntry[] = [];
  const seenSessions = new Set<string>();
  let currentCount = 0;

  for (const value of input) {
    const parsed = parseEntry(value);
    if (!parsed || seenSessions.has(parsed.sessionId)) {
      return { valid: false, entries: [] };
    }

    seenSessions.add(parsed.sessionId);
    if (parsed.isCurrent) {
      currentCount += 1;
      if (currentCount > 1) {
        return { valid: false, entries: [] };
      }
    }

    entries.push(parsed);
  }

  entries.sort((a, b) => b.lastActiveAtMs - a.lastActiveAtMs);

  return {
    valid: true,
    entries: Object.freeze(entries),
  };
}
