import type {
  MessageTransport,
  MessageTransportInput,
  MessageTransportOutput,
  MessageTransportTask,
} from '../../contracts/MessageTransport';

import {
  TransportCancelledError,
} from '../../contracts/TransportCancelledError';

import {
  parseBrainInputEnvelope,
  type BrainInputEnvelope,
  type BrainOutputEvent,
  type BrainTransportPreference,
} from './brainEnvelope';

import {
  BrainStreamTracker,
} from './brainStream';

import type {
  BrainPort,
  BrainRequestHandle,
} from './brainPort';

export class BrainTransportProtocolError extends Error {
  constructor(message = 'Invalid Brain transport protocol event') {
    super(message);
    this.name = 'BrainTransportProtocolError';
  }
}

export class BrainTransportRemoteError extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string) {
    super('Brain request failed: ' + reasonCode);
    this.name = 'BrainTransportRemoteError';
    this.reasonCode = reasonCode;
  }
}

export interface BrainMessageCodec {
  encode(
    input: MessageTransportInput,
  ): Promise<
    Readonly<{
      payloadRef: string;
      attachmentRefs: readonly string[];
    }>
  >;

  decodeText(
    payloadRef: string,
  ): Promise<string>;
}

export type BrainRequestContext =
  Readonly<{
    requestId: string;
    sessionId: string;
    traceId: string;
    workspaceId: string | null;
    languageTag: string | null;
    deadlineAtMs: number | null;
    transportPreference: BrainTransportPreference;
    requiresVerification: boolean;
  }>;

export interface BrainRequestContextFactory {
  create(
    input: MessageTransportInput,
  ): BrainRequestContext;
}

function buildEnvelope(
  input: MessageTransportInput,
  context: BrainRequestContext,
  encoded: Readonly<{
    payloadRef: string;
    attachmentRefs: readonly string[];
  }>,
): BrainInputEnvelope {
  const parsed =
    parseBrainInputEnvelope({
      protocolVersion: '1.0',
      requestId: context.requestId,
      sessionId: context.sessionId,
      traceId: context.traceId,
      conversationId: input.conversationId,
      workspaceId: context.workspaceId,
      kind: 'text',
      payloadRef: encoded.payloadRef,
      attachmentRefs: encoded.attachmentRefs,
      languageTag: context.languageTag,
      createdAtMs: input.createdAt,
      deadlineAtMs: context.deadlineAtMs,
      transportPreference:
        context.transportPreference,
      requiresVerification:
        context.requiresVerification,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    });

  if (!parsed) {
    throw new BrainTransportProtocolError(
      'Invalid Brain request envelope',
    );
  }

  return parsed;
}

export class BrainMessageTransport
implements MessageTransport {
  constructor(
    private readonly port: BrainPort,
    private readonly codec: BrainMessageCodec,
    private readonly contextFactory:
      BrainRequestContextFactory,
  ) {}

  send(
    input: MessageTransportInput,
  ): MessageTransportTask {
    let cancelled = false;
    let settled = false;
    let handle: BrainRequestHandle | null = null;

    let resolveTask:
      (output: MessageTransportOutput) => void =
        () => {};
    let rejectTask:
      (reason: unknown) => void =
        () => {};

    const result =
      new Promise<MessageTransportOutput>(
        (resolve, reject) => {
          resolveTask = resolve;
          rejectTask = reject;
        },
      );

    const fail =
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        rejectTask(error);
      };

    const complete =
      (output: MessageTransportOutput) => {
        if (settled) {
          return;
        }
        settled = true;
        resolveTask(output);
      };

    void (async () => {
      try {
        const context =
          this.contextFactory.create(input);
        const encoded =
          await this.codec.encode(input);

        if (cancelled) {
          fail(new TransportCancelledError());
          return;
        }

        const envelope =
          buildEnvelope(
            input,
            context,
            encoded,
          );
        const tracker =
          new BrainStreamTracker(envelope);

        const onOutput =
          (event: BrainOutputEvent) => {
            void (async () => {
              if (cancelled || settled) {
                return;
              }

              const accepted =
                tracker.accept(event);

              if (!accepted.accepted) {
                fail(
                  new BrainTransportProtocolError(
                    accepted.reason,
                  ),
                );
                return;
              }

              if (accepted.idempotent) {
                return;
              }

              if (!event.isFinal) {
                return;
              }

              if (event.kind === 'error') {
                fail(
                  new BrainTransportRemoteError(
                    event.reasonCode
                      ?? 'unknown_error',
                  ),
                );
                return;
              }

              if (
                event.kind !== 'text'
                || event.payloadRef === null
              ) {
                fail(
                  new BrainTransportProtocolError(
                    'Final chat output is not text',
                  ),
                );
                return;
              }

              try {
                const text =
                  await this.codec.decodeText(
                    event.payloadRef,
                  );

                if (
                  cancelled
                  || settled
                ) {
                  return;
                }

                complete({
                  id: event.eventId,
                  conversationId:
                    event.conversationId,
                  kind: 'text',
                  text,
                  createdAt:
                    event.observedAtMs,
                });
              } catch (error) {
                fail(error);
              }
            })();
          };

        handle =
          await this.port.submit(
            envelope,
            onOutput,
          );

        if (
          handle.requestId
            !== envelope.requestId
        ) {
          fail(
            new BrainTransportProtocolError(
              'Brain handle request mismatch',
            ),
          );
          return;
        }

        if (cancelled) {
          await handle.cancel();
          fail(new TransportCancelledError());
        }
      } catch (error) {
        fail(error);
      }
    })();

    return {
      result,
      cancel: () => {
        if (cancelled || settled) {
          return;
        }

        cancelled = true;
        if (handle) {
          void handle.cancel().catch(() => {});
        }
        fail(new TransportCancelledError());
      },
    };
  }
}
