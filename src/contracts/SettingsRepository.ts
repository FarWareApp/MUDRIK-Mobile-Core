import {
  AppSettings,
} from './AppSettings';

export interface SettingsRepository {
  getAll():
    Promise<Partial<AppSettings>>;

  set<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<void>;

  remove(
    key: keyof AppSettings,
  ): Promise<void>;

  clear(): Promise<void>;
}
