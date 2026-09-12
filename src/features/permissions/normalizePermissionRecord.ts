import type {
  AppPermissionId,
  AppPermissionRecord,
} from '../../contracts/PermissionService';

export type NativePermissionResult = {
  granted: boolean;
  status: string;
  canAskAgain?: boolean;
};

export function normalizePermissionRecord(
  id: AppPermissionId,
  result: NativePermissionResult,
): AppPermissionRecord {
  return {
    id,
    status:
      result.granted
        ? 'granted'
        : result.status === 'denied'
          ? 'denied'
          : 'unknown',
    canAskAgain:
      result.canAskAgain ?? true,
  };
}
