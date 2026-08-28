import {
  DiagnosticRepository,
} from '../../contracts/DiagnosticRepository';

import {
  DiagnosticEvent,
  DiagnosticLevel,
} from '../../contracts/Diagnostics';

import {
  sanitizeDiagnosticText,
} from './sanitizeDiagnosticText';

export type {
  DiagnosticEvent,
  DiagnosticLevel,
} from '../../contracts/Diagnostics';

const MAX_EVENTS = 200;

class DiagnosticsService {
  private events:
    DiagnosticEvent[] = [];

  private repository:
    DiagnosticRepository | null =
      null;

  private enabled = true;

  setEnabled(
    enabled: boolean,
  ): void {
    this.enabled = enabled;
  }

  configure(
    repository:
      DiagnosticRepository,
  ): void {
    if (
      this.repository ===
      repository
    ) {
      return;
    }

    this.repository =
      repository;

    void this.restore();
  }

  private async restore():
    Promise<void> {
    const repository =
      this.repository;

    if (!repository) {
      return;
    }

    try {
      for (
        const event
        of this.events
      ) {
        await repository
          .append(event);
      }

      await repository
        .trim(MAX_EVENTS);

      const stored =
        await repository
          .list(MAX_EVENTS);

      const merged =
        new Map<
          string,
          DiagnosticEvent
        >();

      for (
        const event
        of [
          ...stored,
          ...this.events,
        ]
      ) {
        merged.set(
          event.id,
          event,
        );
      }

      this.events =
        [...merged.values()]
          .sort(
            (a, b) =>
              b.timestamp -
              a.timestamp,
          )
          .slice(
            0,
            MAX_EVENTS,
          );
    } catch {
      // Diagnostics must never
      // break the app core.
    }
  }

  record(
    module: string,
    event: string,
    level:
      DiagnosticLevel =
        'info',
  ): void {
    if (!this.enabled) {
      return;
    }

    const now =
      Date.now();

    const item:
      DiagnosticEvent = {
      id:
        `${now}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,

      timestamp: now,

      module:
        sanitizeDiagnosticText(
          module,
        ).slice(0, 80),

      event:
        sanitizeDiagnosticText(
          event,
        ),

      level,
    };

    this.events = [
      item,
      ...this.events,
    ].slice(
      0,
      MAX_EVENTS,
    );

    const repository =
      this.repository;

    if (repository) {
      void repository
        .append(item)
        .then(() =>
          repository.trim(
            MAX_EVENTS,
          ),
        )
        .catch(() => {
          // Diagnostics persistence
          // is best effort.
        });
    }
  }

  snapshot():
    DiagnosticEvent[] {
    return [
      ...this.events,
    ];
  }

  clear(): void {
    this.events = [];

    void this.repository
      ?.clear()
      .catch(() => {
        // Best effort.
      });
  }
}

export const diagnosticsService =
  new DiagnosticsService();
