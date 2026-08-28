export type AppPermissionId =
  | 'microphone'
  | 'camera'
  | 'media-library'
  | 'notifications';

export type AppPermissionStatus =
  | 'unknown'
  | 'granted'
  | 'denied';

export type AppPermissionRecord = {
  id: AppPermissionId;
  status: AppPermissionStatus;
  canAskAgain: boolean;
};

export interface PermissionService {
  getAll():
    Promise<AppPermissionRecord[]>;

  request(
    id: AppPermissionId,
  ): Promise<AppPermissionRecord>;
}
