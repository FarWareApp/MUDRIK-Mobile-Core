import {
  LocalNotificationContent,
  NotificationEvent,
  NotificationResponseEvent,
} from './Notification';

export interface NotificationService {
  initialize():
    Promise<void>;

  presentNow(
    content:
      LocalNotificationContent,
  ): Promise<string>;

  scheduleAt(
    content:
      LocalNotificationContent,
    timestamp: number,
  ): Promise<string>;

  cancel(
    identifier: string,
  ): Promise<void>;

  cancelAll():
    Promise<void>;

  getLastResponse():
    Promise<
      NotificationResponseEvent
      | null
    >;

  clearLastResponse():
    Promise<void>;

  subscribeReceived(
    listener: (
      event:
        NotificationEvent,
    ) => void,
  ): () => void;

  subscribeResponses(
    listener: (
      event:
        NotificationResponseEvent,
    ) => void,
  ): () => void;
}
