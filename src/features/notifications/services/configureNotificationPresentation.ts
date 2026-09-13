import {
  supportsNativeNotificationModule,
} from './notificationRuntimeSupport';

export async function configureNotificationPresentation(): Promise<void> {
  if (!supportsNativeNotificationModule()) {
    return;
  }

  const Notifications =
    await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
