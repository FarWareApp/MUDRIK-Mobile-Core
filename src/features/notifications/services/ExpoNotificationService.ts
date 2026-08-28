import { Platform } from 'react-native';

import * as Notifications from 'expo-notifications';

import {
  LocalNotificationContent,
  NotificationEvent,
  NotificationResponseEvent,
} from '../../../contracts/Notification';

import {
  NotificationService,
} from '../../../contracts/NotificationService';

const CHANNEL_ID = 'mudrik-default';

function mapNotification(
  notification: Notifications.Notification,
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
  response: Notifications.NotificationResponse,
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
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
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
    await Notifications
      .cancelScheduledNotificationAsync(
        identifier,
      );
  }

  async cancelAll(): Promise<void> {
    await Notifications
      .cancelAllScheduledNotificationsAsync();
  }

  async getLastResponse():
    Promise<NotificationResponseEvent | null> {
    const response =
      await Notifications
        .getLastNotificationResponseAsync();

    return response
      ? mapResponse(response)
      : null;
  }

  async clearLastResponse():
    Promise<void> {
    await Notifications
      .clearLastNotificationResponseAsync();
  }

  subscribeReceived(
    listener:
      (event: NotificationEvent) => void,
  ): () => void {
    const subscription =
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

    return () => {
      subscription.remove();
    };
  }

  subscribeResponses(
    listener:
      (
        event:
          NotificationResponseEvent,
      ) => void,
  ): () => void {
    const subscription =
      Notifications
        .addNotificationResponseReceivedListener(
          (response) => {
            listener(
              mapResponse(response),
            );
          },
        );

    return () => {
      subscription.remove();
    };
  }
}
