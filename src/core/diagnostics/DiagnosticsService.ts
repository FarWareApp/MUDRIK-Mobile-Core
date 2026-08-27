export type DiagnosticLevel = 'info' | 'warning' | 'error';

export type DiagnosticEvent = {
  id: string;
  timestamp: number;
  module: string;
  event: string;
  level: DiagnosticLevel;
};

const MAX_EVENTS = 200;

class DiagnosticsService {
  private events: DiagnosticEvent[] = [];

  record(
    module: string,
    event: string,
    level: DiagnosticLevel = 'info',
  ): void {
    const item: DiagnosticEvent = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      module,
      event,
      level,
    };

    this.events = [item, ...this.events].slice(0, MAX_EVENTS);
  }

  snapshot(): DiagnosticEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

export const diagnosticsService = new DiagnosticsService();
