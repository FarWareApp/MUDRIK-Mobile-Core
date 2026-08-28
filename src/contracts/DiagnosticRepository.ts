import {
  DiagnosticEvent,
} from './Diagnostics';

export interface DiagnosticRepository {
  append(
    event:
      DiagnosticEvent,
  ): Promise<void>;

  list(
    limit: number,
  ): Promise<
    DiagnosticEvent[]
  >;

  trim(
    limit: number,
  ): Promise<void>;

  clear():
    Promise<void>;
}
