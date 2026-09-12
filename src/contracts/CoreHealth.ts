export type CoreHealthStatus =
  | 'healthy'
  | 'degraded';

export type CoreHealthIssue = {
  id: string;
  message: string;
};

export type CoreHealthSnapshot = {
  status:
    CoreHealthStatus;

  ready: boolean;

  issues:
    CoreHealthIssue[];
};
