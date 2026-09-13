import Constants, {
  ExecutionEnvironment,
} from 'expo-constants';
import { Platform } from 'react-native';

export function supportsNativeNotificationModule(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  return (
    Constants.executionEnvironment !==
    ExecutionEnvironment.StoreClient
  );
}
