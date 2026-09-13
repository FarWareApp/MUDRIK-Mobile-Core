import type {
  TrustedSurfaceRecord,
} from './trustedSurfaceRecord';

export interface TrustedSurfaceRepository {
  get(
    surfaceId: string,
  ): Promise<TrustedSurfaceRecord | null>;

  listForAccount(
    accountId: string,
  ): Promise<readonly TrustedSurfaceRecord[]>;

  save(
    record: TrustedSurfaceRecord,
  ): Promise<void>;
}
