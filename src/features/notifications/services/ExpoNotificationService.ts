import { Platform } from 'react-native';

import {
  LocalNotificationContent,
  NotificationEvent,
  NotificationResponseEvent,
} from '../../../contracts/Notification';

import {
  NotificationService,
} from '../../../contracts/NotificationService';

import {
  supportsNativeNotificationModule,
} from './notificationRuntimeSupport';

const CHANNEL_ID = 'mudrik-default';

const UNAVAILABLE_MESSAGE =
  'Native notifications are unavailable in this runtime. Use a development build or standalone app.';

type NotificationsModule =
  typeof import('expo-notifications');

type ReceivedListener =
  Parameters<
    NotificationsModule[
      'addNotificationReceivedListener'
    ]
  >[0];

type ExpoNotification =
  Parameters<ReceivedListener>[0];

type ResponseListener =
  Parameters<
    NotificationsModule[
      'addNotificationResponseReceivedListener'
    ]
  >[0];

type ExpoNotificationResponse =
  Parameters<ResponseListener>[0];

type NativeSubscription = {
  remove(): void;
};

function mapNotification(
  notification: ExpoNotification,
): NotificationEvent {
  const content =
    notification.request.content;

  return {
    id: notification.request.identifier,
    title: content.title,
    body: content.body,
    data: content.data ?? {},
    receivedAt: Date.now(),
  };
}

function mapResponse(
  response: ExpoNotificationResponse,
): NotificationResponseEvent {
  return {
    notification:
      mapNotification(
        response.notification,
      ),

    actionIdentifier:
      response.actionIdentifier,

    respondedAt: Date.now(),
  };
}

export class ExpoNotificationService
  implements NotificationService
{
  private notificationsPromise:
    Promise<NotificationsModule> | null =
      null;

  private async getNotifications():
    Promise<NotificationsModule | null> {
    if (!supportsNativeNotificationModule()) {
      return null;
    }

    if (!this.notificationsPromise) {
      this.notificationsPromise =
        import('expo-notifications');
    }

    return this.notificationsPromise;
  }

  private async requireNotifications():
    Promise<NotificationsModule> {
    const notifications =
      await this.getNotifications();

    if (!notifications) {
      throw new Error(
        UNAVAILABLE_MESSAGE,
      );
    }

    return notifications;
  }

  async initialize(): Promise<void> {
    const Notifications =
      await this.getNotifications();

    if (
      !Notifications ||
      Platform.OS !== 'android'
    ) {
      return;
    }

    await Notifications
      .setNotificationChannelAsync(
        CHANNEL_ID,
        {
          name: 'MUDRIK',

          importance:
            Notifications
              .AndroidImportance
              .DEFAULT,
        },
      );
  }

  async presentNow(
    content: LocalNotificationContent,
  ): Promise<string> {
    const Notifications =
      await this.requireNotifications();

    return Notifications
      .scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data ?? {},
        },

        trigger: null,
      });
  }

  async scheduleAt(
    content: LocalNotificationContent,
    timestamp: number,
  ): Promise<string> {
    const Notifications =
      await this.requireNotifications();

    return Notifications
      .scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data ?? {},
        },

        trigger: {
          type:
            Notifications
              .SchedulableTriggerInputTypes
              .DATE,

          date: new Date(timestamp),

          channelId:
            Platform.OS === 'android'
              ? CHANNEL_ID
              : undefined,
        },
      });
  }

  async cancel(
    identifier: string,
  ): Promise<void> {
    const Notifications =
      await this.getNotifications();

    if (!Notifications) {
      return;
    }

    await Notifications
      .cancelScheduledNotificationAsync(
        identifier,
      );
  }

  async cancelAll(): Promise<void> {
    const Notifications =
      await this.getNotifications();

    if (!Notifications) {
      return;
    }

    await Notifications
      .cancelAllScheduledNotificationsAsync();
  }

  async getLastResponse():
    Promise<NotificationResponseEvent | null> {
    const Notifications =
      await this.getNotifications();

    if (!Notifications) {
      return null;
    }

    const response =
      await Notifications
        .getLastNotificationResponseAsync();

    return response
      ? mapResponse(response)
      : null;
  }

  async clearLastResponse():
    Promise<void> {
    const Notifications =
      await this.getNotifications();

    if (!Notifications) {
      return;
    }

    await Notifications
      .clearLastNotificationResponseAsync();
  }

  subscribeReceived(
    listener:
      (event: NotificationEvent) => void,
  ): () => void {
    if (!supportsNativeNotificationModule()) {
      return () => {};
    }

    let active = true;
    let subscription:
      NativeSubscription | null =
        null;

    void this.getNotifications()
      .then((Notifications) => {
        if (
          !active ||
          !Notifications
        ) {
          return;
        }

        subscription =
          Notifications
            .addNotificationReceivedListener(
              (notification) => {
                listener(
                  mapNotification(
                    notification,
                  ),
                );
              },
            );
      })
      .catch(() => undefined);

    return () => {
      active = false;
      subscription?.remove();
    };
  }

  subscribeResponses(
    listener: (
      event:
        NotificationResponseEvent,
    ) => void,
  ): () => void {
    if (!supportsNativeNotificationModule()) {
      return () => {};
    }

    let active = true;
    let subscription:
      NativeSubscription | null =
        null;

    void this.getNotifications()
      .then((Notifications) => {
        if (
          !active ||
          !Notifications
        ) {
          return;
        }

        subscription =
          Notifications
            .addNotificationResponseReceivedListener(
              (response) => {
                listener(
                  mapResponse(response),
                );
              },
            );
      })
      .catch(() => undefined);

    return () => {
      active = false;
      subscription?.remove();
    };
  }
}
