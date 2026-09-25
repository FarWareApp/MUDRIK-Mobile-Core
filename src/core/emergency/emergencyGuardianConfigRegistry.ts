import {
  parseEmergencyGuardianConfig,
} from './emergencyGuardianConfig';

import type {
  EmergencyGuardianConfig,
} from './emergencyGuardianConfig';

export type EmergencyGuardianConfigUpdate =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'duplicate'
      | 'invalid_config'
      | 'stale_revision'
      | 'revision_gap'
      | 'revision_conflict'
      | 'account_binding_mismatch'
      | 'non_monotonic_update_time';
  }>;

type ConfigState = {
  config: EmergencyGuardianConfig;
  fingerprint: string;
};

function fingerprint(
  config: EmergencyGuardianConfig,
): string {
  return JSON.stringify(config);
}

export class EmergencyGuardianConfigRegistry {
  private readonly configs =
    new Map<string, ConfigState>();

  apply(
    input: unknown,
    trustedEvaluationTimeInput: unknown,
  ): EmergencyGuardianConfigUpdate {
    const config =
      parseEmergencyGuardianConfig(
        input,
        trustedEvaluationTimeInput,
      );

    if (!config) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'invalid_config',
      };
    }

    const current =
      this.configs.get(config.configId);

    if (!current) {
      if (config.revision !== 0) {
        return {
          accepted: false,
          idempotent: false,
          reason: 'revision_gap',
        };
      }

      this.configs.set(
        config.configId,
        {
          config,
          fingerprint:
            fingerprint(config),
        },
      );

      return {
        accepted: true,
        idempotent: false,
        reason: 'accepted',
      };
    }

    if (
      current.config.accountId
        !== config.accountId
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason:
          'account_binding_mismatch',
      };
    }

    if (
      config.revision
        < current.config.revision
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_revision',
      };
    }

    if (
      config.revision
        === current.config.revision
    ) {
      if (
        fingerprint(config)
          === current.fingerprint
      ) {
        return {
          accepted: true,
          idempotent: true,
          reason: 'duplicate',
        };
      }

      return {
        accepted: false,
        idempotent: false,
        reason: 'revision_conflict',
      };
    }

    if (
      config.revision
        !== current.config.revision + 1
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'revision_gap',
      };
    }

    if (
      config.updatedAtMs
        < current.config.updatedAtMs
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason:
          'non_monotonic_update_time',
      };
    }

    this.configs.set(
      config.configId,
      {
        config,
        fingerprint:
          fingerprint(config),
      },
    );

    return {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    };
  }

  get(
    configId: string,
  ): EmergencyGuardianConfig | null {
    return (
      this.configs.get(configId)
        ?.config ?? null
    );
  }

  clear(
    configId: string,
  ): void {
    this.configs.delete(configId);
  }

  clearAll(): void {
    this.configs.clear();
  }
}
