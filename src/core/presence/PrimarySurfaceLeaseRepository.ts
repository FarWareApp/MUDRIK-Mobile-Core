import type {
  PrimarySurfaceLease,
} from './primarySurfaceLease';

export interface PrimarySurfaceLeaseRepository {
  get(
    presenceSessionId: string,
  ): Promise<PrimarySurfaceLease | null>;

  save(
    lease: PrimarySurfaceLease,
  ): Promise<void>;
}
