import type {
  MessageTransport,
  MessageTransportInput,
  MessageTransportOutput,
  MessageTransportProgress,
  MessageTransportTask,
} from '../../contracts/MessageTransport';

import {
  TransportCancelledError,
} from '../../contracts/TransportCancelledError';

export type GatewaySessionTokenProvider =
  () => Promise<string>;

export type GatewayLanguageTagProvider =
  () => string;

export class GatewayTransportProtocolError
extends Error {
  constructor(
    message =
      'Invalid MUDRIK gateway protocol',
  ) {
    super(message);
    this.name =
      'GatewayTransportProtocolError';
  }
}

export class GatewayTransportRemoteError
extends Error {
  readonly reasonCode: string;

  constructor(reasonCode: string) {
    super(
      'MUDRIK gateway failed: '
      + reasonCode,
    );
    this.name =
      'GatewayTransportRemoteError';
    this.reasonCode = reasonCode;
  }
}

type SseEvent =
  Readonly<{
    event: string;
    data: unknown;
  }>;

function createRequestId(): string {
  return (
    'gateway_request_'
    + Date.now().toString(36)
    + '_'
    + Math.random()
      .toString(36)
      .slice(2, 12)
  );
}

function safeToken(
  token: string,
): boolean {
  return (
    token.length >= 16
    && token.length <= 4096
    && !/[\r\n]/.test(token)
  );
}

function safeLanguageTag(
  value: string,
): boolean {
  return (
    /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/
      .test(value)
  );
}

function boundedHistory(
  history:
    MessageTransportInput['history'],
): readonly Readonly<{
  role: 'user' | 'assistant';
  text: string;
}>[] {
  if (!history || history.length === 0) {
    return [];
  }

  const selected: {
    role: 'user' | 'assistant';
    text: string;
  }[] = [];
  let characters = 0;

  for (
    let index = history.length - 1;
    index >= 0;
    index -= 1
  ) {
    const item = history[index];

    if (
      !item
      || (
        item.role !== 'user'
        && item.role !== 'assistant'
      )
      || typeof item.text !== 'string'
    ) {
      continue;
    }

    const text = item.text.trim();

    if (
      text.length === 0
      || text.length > 32_000
      || characters + text.length
        > 64_000
      || selected.length >= 48
    ) {
      continue;
    }

    selected.push({
      role: item.role,
      text,
    });
    characters += text.length;
  }

  return Object.freeze(
    selected.reverse().map(
      (item) => Object.freeze(item),
    ),
  );
}

function parseSseBlock(
  block: string,
): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (
    const line of block.split(/\r?\n/)
  ) {
    if (line.startsWith('event:')) {
      event =
        line.slice(6).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(
        line.slice(5).trimStart(),
      );
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return Object.freeze({
      event,
      data: JSON.parse(
        dataLines.join('\n'),
      ),
    });
  } catch {
    throw new GatewayTransportProtocolError(
      'Malformed gateway event',
    );
  }
}

async function* responseChunks(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const reader = body.getReader();

  try {
    while (true) {
      const next =
        await reader.read();

      if (next.done) {
        return;
      }

      if (next.value) {
        yield next.value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class GatewayMessageTransport
implements MessageTransport {
  constructor(
    private readonly endpoint: string,
    private readonly tokenProvider:
      GatewaySessionTokenProvider,
    private readonly languageTagProvider:
      GatewayLanguageTagProvider,
    private readonly fetchImpl:
      typeof fetch = fetch,
  ) {
    if (
      !/^https:\/\//.test(endpoint)
      || typeof tokenProvider
        !== 'function'
      || typeof languageTagProvider
        !== 'function'
      || typeof fetchImpl !== 'function'
    ) {
      throw new TypeError(
        'Invalid gateway transport configuration',
      );
    }
  }

  send(
    input: MessageTransportInput,
  ): MessageTransportTask {
    const controller =
      new AbortController();
    const listeners =
      new Set<
        (
          progress:
            MessageTransportProgress,
        ) => void
      >();

    let settled = false;
    let cancelled = false;

    const result =
      new Promise<MessageTransportOutput>(
        (resolve, reject) => {
          void (async () => {
            try {
              const languageTag =
                this.languageTagProvider();

              if (
                !safeLanguageTag(
                  languageTag,
                )
              ) {
                throw new
                  GatewayTransportProtocolError(
                    'Invalid language tag',
                  );
              }

              const token =
                await this.tokenProvider();

              if (!safeToken(token)) {
                throw new
                  GatewayTransportProtocolError(
                    'Invalid session token',
                  );
              }

              if (cancelled) {
                throw new
                  TransportCancelledError();
              }

              const requestId =
                createRequestId();

              const response =
                await this.fetchImpl(
                  this.endpoint,
                  {
                    method: 'POST',
                    headers: {
                      authorization:
                        'Bearer ' + token,
                      accept:
                        'text/event-stream',
                      'content-type':
                        'application/json',
                      'cache-control':
                        'no-store',
                    },
                    body: JSON.stringify({
                      protocolVersion:
                        '1.0',
                      requestId,
                      conversationId:
                        input.conversationId,
                      languageTag,
                      inputText:
                        input.text,
                      history:
                        boundedHistory(
                          input.history,
                        ),
                      streaming: true,
                    }),
                    signal:
                      controller.signal,
                  },
                );

              if (!response.ok) {
                throw new
                  GatewayTransportRemoteError(
                    'http_'
                    + response.status,
                  );
              }

              if (!response.body) {
                throw new
                  GatewayTransportProtocolError(
                    'Gateway stream missing',
                  );
              }

              const decoder =
                new TextDecoder();
              let buffer = '';
              let text = '';
              let lastSequence = 0;
              let finalOutput:
                MessageTransportOutput
                | null = null;

              for await (
                const chunk of responseChunks(
                  response.body,
                )
              ) {
                buffer += decoder.decode(
                  chunk,
                  { stream: true },
                );

                const blocks =
                  buffer.split(
                    /\r?\n\r?\n/,
                  );
                buffer =
                  blocks.pop() ?? '';

                for (const block of blocks) {
                  const event =
                    parseSseBlock(block);

                  if (!event) {
                    continue;
                  }

                  if (event.event === 'delta') {
                    const data =
                      event.data as
                        Record<
                          string,
                          unknown
                        >;

                    if (
                      !Number.isSafeInteger(
                        data.sequence,
                      )
                      || Number(data.sequence)
                        !== lastSequence + 1
                      || typeof data.delta
                        !== 'string'
                    ) {
                      throw new
                        GatewayTransportProtocolError(
                          'Invalid delta sequence',
                        );
                    }

                    lastSequence =
                      Number(data.sequence);
                    text += data.delta;

                    const progress:
                      MessageTransportProgress =
                        Object.freeze({
                          id:
                            'stream-'
                            + requestId,
                          conversationId:
                            input
                              .conversationId,
                          kind:
                            'text-delta',
                          sequence:
                            lastSequence,
                          delta:
                            data.delta,
                          createdAt:
                            Date.now(),
                        });

                    for (
                      const listener
                      of listeners
                    ) {
                      listener(progress);
                    }
                    continue;
                  }

                  if (event.event === 'error') {
                    const data =
                      event.data as
                        Record<
                          string,
                          unknown
                        >;

                    throw new
                      GatewayTransportRemoteError(
                        typeof data.code
                          === 'string'
                          ? data.code
                          : 'unknown_error',
                      );
                  }

                  if (event.event === 'final') {
                    const data =
                      event.data as
                        Record<
                          string,
                          unknown
                        >;

                    if (
                      typeof data.id
                        !== 'string'
                      || typeof data.text
                        !== 'string'
                      || !Number
                        .isSafeInteger(
                          data.createdAt,
                        )
                      || (
                        text.length > 0
                        && text
                          !== data.text
                      )
                    ) {
                      throw new
                        GatewayTransportProtocolError(
                          'Invalid final gateway event',
                        );
                    }

                    finalOutput =
                      Object.freeze({
                        id: data.id,
                        conversationId:
                          input.conversationId,
                        kind: 'text',
                        text: data.text,
                        createdAt:
                          Number(
                            data.createdAt,
                          ),
                      });
                  }
                }
              }

              if (!finalOutput) {
                throw new
                  GatewayTransportProtocolError(
                    'Gateway stream ended without final event',
                  );
              }

              settled = true;
              resolve(finalOutput);
            } catch (error) {
              if (
                cancelled
                || (
                  error instanceof
                    DOMException
                  && error.name
                    === 'AbortError'
                )
              ) {
                settled = true;
                reject(
                  new
                    TransportCancelledError(),
                );
                return;
              }

              settled = true;
              reject(error);
            } finally {
              listeners.clear();
            }
          })();
        },
      );

    return {
      result,
      cancel: () => {
        if (settled || cancelled) {
          return;
        }

        cancelled = true;
        controller.abort();
      },
      subscribe: (listener) => {
        if (settled) {
          return () => {};
        }

        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
    };
  }
}
