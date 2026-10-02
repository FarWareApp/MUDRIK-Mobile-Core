const LANGUAGE =
  /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const REQUEST_ID =
  /^[a-z][a-z0-9_:-]{15,159}$/;

function jsonResponse(
  status,
  body,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options':
          'nosniff',
      },
    },
  );
}

function parseBearer(request) {
  const value =
    request.headers.get(
      'authorization',
    );

  if (
    !value
    || !value.startsWith('Bearer ')
  ) {
    return null;
  }

  const token =
    value.slice(7).trim();

  if (
    token.length < 16
    || token.length > 4096
    || /[\r\n]/.test(token)
  ) {
    return null;
  }

  return token;
}

function validPublicRequest(value) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return false;
  }

  const actual =
    Object.keys(value)
      .sort()
      .join(',');
  const baseExpected =
    [
      'conversationId',
      'inputText',
      'languageTag',
      'protocolVersion',
      'requestId',
      'streaming',
    ].sort().join(',');
  const historyExpected =
    [
      'conversationId',
      'history',
      'inputText',
      'languageTag',
      'protocolVersion',
      'requestId',
      'streaming',
    ].sort().join(',');

  if (
    actual !== baseExpected
    && actual !== historyExpected
  ) {
    return false;
  }

  const history =
    value.history === undefined
      ? []
      : value.history;

  if (
    !Array.isArray(history)
    || history.length > 48
  ) {
    return false;
  }

  let historyCharacters = 0;

  for (const item of history) {
    if (
      !item
      || typeof item !== 'object'
      || Array.isArray(item)
      || Object.keys(item)
        .sort()
        .join(',')
        !== 'role,text'
      || (
        item.role !== 'user'
        && item.role !== 'assistant'
      )
      || typeof item.text !== 'string'
      || item.text.length < 1
      || item.text.length > 32_000
    ) {
      return false;
    }

    historyCharacters +=
      item.text.length;

    if (historyCharacters > 64_000) {
      return false;
    }
  }

  return (
    value.protocolVersion === '1.0'
    && typeof value.requestId
      === 'string'
    && REQUEST_ID.test(
      value.requestId,
    )
    && typeof value.conversationId
      === 'string'
    && value.conversationId.length
      >= 8
    && value.conversationId.length
      <= 240
    && typeof value.languageTag
      === 'string'
    && LANGUAGE.test(
      value.languageTag,
    )
    && typeof value.inputText
      === 'string'
    && value.inputText.length > 0
    && value.inputText.length
      <= 200_000
    && historyCharacters
      + value.inputText.length
      <= 200_000
    && value.streaming === true
  );
}

function sseEvent(
  event,
  data,
) {
  return (
    'event: '
    + event
    + '\n'
    + 'data: '
    + JSON.stringify(data)
    + '\n\n'
  );
}

export function createIntelligenceChatHandler({
  gateway,
  authenticateBearer,
  routeSelector,
  clock = () => Date.now(),
  requestTimeoutMs = 60_000,
  maxBodyBytes = 256_000,
}) {
  if (
    !gateway
    || (
      typeof gateway.invoke
        !== 'function'
      && typeof gateway.invokePlan
        !== 'function'
    )
    || typeof authenticateBearer
      !== 'function'
    || typeof routeSelector
      !== 'function'
    || typeof clock !== 'function'
    || !Number.isSafeInteger(
      requestTimeoutMs,
    )
    || requestTimeoutMs < 1_000
    || requestTimeoutMs > 180_000
    || !Number.isSafeInteger(
      maxBodyBytes,
    )
    || maxBodyBytes < 1024
    || maxBodyBytes > 1_000_000
  ) {
    throw new TypeError(
      'Invalid intelligence chat handler configuration.',
    );
  }

  return async function handle(request) {
    if (
      !(request instanceof Request)
      || request.method !== 'POST'
    ) {
      return jsonResponse(
        405,
        { code: 'method_not_allowed' },
      );
    }

    const contentType =
      request.headers.get(
        'content-type',
      ) ?? '';

    if (
      !contentType
        .toLowerCase()
        .startsWith(
          'application/json',
        )
    ) {
      return jsonResponse(
        415,
        {
          code:
            'unsupported_media_type',
        },
      );
    }

    const contentLength =
      Number(
        request.headers.get(
          'content-length',
        ) ?? '0',
      );

    if (
      Number.isFinite(contentLength)
      && contentLength > maxBodyBytes
    ) {
      return jsonResponse(
        413,
        { code: 'request_too_large' },
      );
    }

    const token =
      parseBearer(request);

    if (!token) {
      return jsonResponse(
        401,
        { code: 'unauthorized' },
      );
    }

    let session;

    try {
      session =
        await authenticateBearer(
          token,
        );
    } catch {
      session = null;
    }

    if (!session) {
      return jsonResponse(
        401,
        { code: 'unauthorized' },
      );
    }

    let bodyText;

    try {
      bodyText = await request.text();
    } catch {
      return jsonResponse(
        400,
        { code: 'invalid_body' },
      );
    }

    if (
      new TextEncoder()
        .encode(bodyText)
        .byteLength > maxBodyBytes
    ) {
      return jsonResponse(
        413,
        { code: 'request_too_large' },
      );
    }

    let input;

    try {
      input =
        JSON.parse(bodyText);
    } catch {
      return jsonResponse(
        400,
        { code: 'invalid_json' },
      );
    }

    if (!validPublicRequest(input)) {
      return jsonResponse(
        400,
        { code: 'invalid_request' },
      );
    }

    let route;

    try {
      route =
        await routeSelector({
          session,
          requestId:
            input.requestId,
          conversationId:
            input.conversationId,
          languageTag:
            input.languageTag,
          inputTextLength:
            input.inputText.length,
          historyMessageCount:
            Array.isArray(input.history)
              ? input.history.length
              : 0,
        });
    } catch {
      route = null;
    }

    const candidates =
      route
      && Array.isArray(
        route.candidates,
      )
        ? route.candidates
        : route
          && typeof route.providerRef
            === 'string'
          && typeof route.modelRef
            === 'string'
            ? [
                {
                  providerRef:
                    route.providerRef,
                  modelRef:
                    route.modelRef,
                },
              ]
            : null;

    if (
      !route
      || !candidates
      || candidates.length < 1
      || candidates.length > 8
      || candidates.some(
        (candidate) =>
          !candidate
          || typeof candidate.providerRef
            !== 'string'
          || typeof candidate.modelRef
            !== 'string',
      )
      || !Number.isSafeInteger(
        route.maxOutputTokens,
      )
      || route.maxOutputTokens < 16
      || route.maxOutputTokens
        > 65_536
    ) {
      return jsonResponse(
        503,
        { code: 'route_unavailable' },
      );
    }

    const now = clock();
    const deadlineAtMs =
      now + requestTimeoutMs;
    const encoder =
      new TextEncoder();

    const stream =
      new ReadableStream({
        start(controller) {
          let closed = false;

          const push =
            (event, data) => {
              if (closed) {
                return;
              }

              controller.enqueue(
                encoder.encode(
                  sseEvent(
                    event,
                    data,
                  ),
                ),
              );
            };

          const gatewayInput = {
            protocolVersion: '1.0',
            requestId:
              input.requestId,
            service: 'general',
            languageTag:
              input.languageTag,
            inputText:
              input.inputText,
            history:
              Array.isArray(input.history)
                ? input.history
                : [],
            streaming: true,
            maxOutputTokens:
              route.maxOutputTokens,
            deadlineAtMs,
          };

          const invoke =
            typeof gateway.invokePlan
              === 'function'
              ? gateway.invokePlan(
                  gatewayInput,
                  candidates,
                  {
              signal:
                request.signal,
              now: () => now,
              onDelta(event) {
                push(
                  'delta',
                  {
                    sequence:
                      event.sequence,
                    delta:
                      event.delta,
                  },
                );
              },
            },
                )
              : gateway.invoke(
                  {
                    ...gatewayInput,
                    providerRef:
                      candidates[0]
                        .providerRef,
                    modelRef:
                      candidates[0]
                        .modelRef,
                  },
                  {
                    signal:
                      request.signal,
                    now: () => now,
                    onDelta(event) {
                      push(
                        'delta',
                        {
                          sequence:
                            event.sequence,
                          delta:
                            event.delta,
                        },
                      );
                    },
                  },
                );

          void invoke
            .then((result) => {
              if (!result.ok) {
                push(
                  'error',
                  {
                    code:
                      result.code,
                    retryable:
                      result.retryable,
                  },
                );
                return;
              }

              push(
                'final',
                {
                  id:
                    'assistant_'
                    + input.requestId,
                  text:
                    result.text,
                  createdAt:
                    clock(),
                  providerResponseRef:
                    result
                      .providerResponseRef,
                },
              );
            })
            .catch(() => {
              push(
                'error',
                {
                  code:
                    'gateway_failure',
                  retryable: true,
                },
              );
            })
            .finally(() => {
              if (!closed) {
                closed = true;
                controller.close();
              }
            });
        },
        cancel() {},
      });

    return new Response(
      stream,
      {
        status: 200,
        headers: {
          'content-type':
            'text/event-stream; charset=utf-8',
          'cache-control':
            'no-store, no-transform',
          connection:
            'keep-alive',
          'x-accel-buffering':
            'no',
          'x-content-type-options':
            'nosniff',
        },
      },
    );
  };
}
