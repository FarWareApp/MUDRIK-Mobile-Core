import type {
  BrainInputEnvelope,
  BrainOutputEvent,
} from './brainEnvelope';

export type BrainRequestHandle =
  Readonly<{
    requestId: string;
    cancel(): Promise<void>;
  }>;

export type BrainOutputObserver =
  (event: BrainOutputEvent) => void;

export interface BrainPort {
  submit(
    request: BrainInputEnvelope,
    onOutput: BrainOutputObserver,
  ): Promise<BrainRequestHandle>;
}

export interface BrainPayloadStore {
  put(
    bytes: Uint8Array,
    metadata: Readonly<{
      mediaType: string;
      expiresAtMs: number | null;
    }>,
  ): Promise<string>;

  read(
    payloadRef: string,
  ): Promise<Uint8Array | null>;

  remove(
    payloadRef: string,
  ): Promise<boolean>;
}
