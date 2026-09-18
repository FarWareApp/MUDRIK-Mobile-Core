import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  ObservationPrivacyRepository,
  ObservationPrivacySnapshot,
} from './ObservationPrivacyRepository';
import type { ObservationPrivacyPolicyState } from './observationPrivacyState';

type DatabaseProvider = () => Promise<SQLiteDatabase>;

type PrivacyRow = {
  state: string;
  reason: string;
  updated_at: number;
};

const FAIL_CLOSED_SNAPSHOT: ObservationPrivacySnapshot = Object.freeze({
  state: 'privacy_lock',
  reason: 'privacy_state_missing_or_invalid',
  updatedAtMs: 0,
  recoveredFailClosed: true,
});

const VALID_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

function isState(value: unknown): value is ObservationPrivacyPolicyState {
  return typeof value === 'string' && VALID_STATES.includes(
    value as ObservationPrivacyPolicyState,
  );
}

function isReason(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 160 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function parseRow(row: PrivacyRow | null): ObservationPrivacySnapshot {
  if (
    !row ||
    !isState(row.state) ||
    !isReason(row.reason) ||
    typeof row.updated_at !== 'number' ||
    !Number.isSafeInteger(row.updated_at) ||
    row.updated_at < 0
  ) {
    return FAIL_CLOSED_SNAPSHOT;
  }

  return Object.freeze({
    state: row.state,
    reason: row.reason,
    updatedAtMs: row.updated_at,
    recoveredFailClosed: false,
  });
}

export class SQLiteObservationPrivacyRepository
  implements ObservationPrivacyRepository {
  constructor(private readonly getDatabase: DatabaseProvider) {}

  async get(): Promise<ObservationPrivacySnapshot> {
    try {
      const database = await this.getDatabase();
      const row = await database.getFirstAsync<PrivacyRow>(
        `
          SELECT state, reason, updated_at
          FROM observation_privacy_state
          WHERE id = 1
        `,
      );

      return parseRow(row ?? null);
    } catch {
      return FAIL_CLOSED_SNAPSHOT;
    }
  }

  async set(input: Readonly<{
    state: ObservationPrivacyPolicyState;
    reason: string;
    updatedAtMs: number;
  }>): Promise<ObservationPrivacySnapshot> {
    if (
      !isState(input.state) ||
      !isReason(input.reason) ||
      !Number.isSafeInteger(input.updatedAtMs) ||
      input.updatedAtMs < 0
    ) {
      throw new Error('Invalid observation privacy state');
    }

    const database = await this.getDatabase();
    await database.runAsync(
      `
        INSERT INTO observation_privacy_state (
          id,
          state,
          reason,
          updated_at
        )
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
          state = excluded.state,
          reason = excluded.reason,
          updated_at = excluded.updated_at
      `,
      [input.state, input.reason, input.updatedAtMs],
    );

    return Object.freeze({
      state: input.state,
      reason: input.reason,
      updatedAtMs: input.updatedAtMs,
      recoveredFailClosed: false,
    });
  }
}
