import type { ObservationPrivacyPolicyState } from './observationPrivacyState';

export type ObservationPrivacySnapshot = Readonly<{
  state: ObservationPrivacyPolicyState;
  reason: string;
  updatedAtMs: number;
  recoveredFailClosed: boolean;
}>;

export interface ObservationPrivacyRepository {
  get(): Promise<ObservationPrivacySnapshot>;

  set(input: Readonly<{
    state: ObservationPrivacyPolicyState;
    reason: string;
    updatedAtMs: number;
  }>): Promise<ObservationPrivacySnapshot>;
}
