import {
  CompanionProfile,
} from './Companion';

export interface CompanionRepository {
  getProfile():
    Promise<CompanionProfile | null>;

  saveProfile(
    profile: CompanionProfile,
  ): Promise<void>;

  clearProfile():
    Promise<void>;
}
