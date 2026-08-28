export type NotificationData =
  Record<string, unknown>;

export type LocalNotificationContent = {
  title: string;
  body: string;

  data?: NotificationData;
};

export type NotificationEvent = {
  id: string;

  title: string | null;
  body: string | null;

  data: NotificationData;

  receivedAt: number;
};

export type NotificationResponseEvent = {
  notification:
    NotificationEvent;

  actionIdentifier: string;

  respondedAt: number;
};

export type NotificationTarget =
  | 'home'
  | 'conversations'
  | 'projects'
  | 'project'
  | 'settings'
  | 'companion'
  | 'voice';
