export type DiagnosticLevel =
  | 'info'
  | 'warning'
  | 'error';

export type DiagnosticEvent = {
  id: string;
  timestamp: number;

  module: string;
  event: string;

  level:
    DiagnosticLevel;
};
