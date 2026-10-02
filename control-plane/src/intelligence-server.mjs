import {
  createServer,
} from 'node:http';

import {
  timingSafeEqual,
} from 'node:crypto';

import {
  pathToFileURL,
} from 'node:url';

import {
  OpenAIResponsesAdapter,
} from './openai-responses-adapter.mjs';

import {
  IntelligenceProviderGateway,
} from './intelligence-provider-gateway.mjs';

import {
  createIntelligenceChatHandler,
} from './intelligence-chat-handler.mjs';

import {
  GatewaySessionAuthority,
} from './gateway-session-authority.mjs';

import {
  createGatewaySessionHandler,
} from './gateway-session-handler.mjs';

import {
  FixedWindowRateLimiter,
} from './rate-limiter.mjs';

const PROVIDER_REF =
  'provider_openai_1111111111111111';

const MODEL_REF =
  'model_general_1111111111111111';

const FAST_MODEL_REF =
  'model_fast_2222222222222222';

function requiredEnv(
  env,
  name,
) {
  const value = env[name];

  if (
    typeof value !== 'string'
    || value.trim().length === 0
  ) {
    throw new Error(
      'Missing required environment variable: '
      + name,
    );
  }

  return value.trim();
}

function safeEqual(
  left,
  right,
) {
  const leftBuffer =
    Buffer.from(left);
  const rightBuffer =
    Buffer.from(right);

  if (
    leftBuffer.length
      !== rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer,
  );
}

export function buildIntelligenceRuntime(
  env = process.env,
  fetchImpl = globalThis.fetch,
) {
  const openAiApiKey =
    requiredEnv(
      env,
      'OPENAI_API_KEY',
    );

  const openAiModel =
    requiredEnv(
      env,
      'MUDRIK_OPENAI_MODEL',
    );

  const openAiFastModel =
    requiredEnv(
      env,
      'MUDRIK_OPENAI_FAST_MODEL',
    );

  const accessToken =
    requiredEnv(
      env,
      'MUDRIK_GATEWAY_ACCESS_TOKEN',
    );

  const sessionSecret =
    requiredEnv(
      env,
      'MUDRIK_GATEWAY_SESSION_SECRET',
    );

  if (
    accessToken.length < 32
    || accessToken.length > 4096
    || /[\r\n]/.test(accessToken)
  ) {
    throw new Error(
      'MUDRIK_GATEWAY_ACCESS_TOKEN must be 32-4096 safe characters.',
    );
  }

  const sessionAuthority =
    new GatewaySessionAuthority(
      sessionSecret,
    );

  const adapterOptions = {
    providerRef: PROVIDER_REF,
    credentialRef:
      'secret_ref_openai_primary',
    credentialResolver:
      async () => openAiApiKey,
    fetchImpl,
    instructions:
      'You are MUDRIK. Follow the user language. Be accurate, concise when possible, and do not claim actions that were not actually completed.',
  };

  const primaryAdapter =
    new OpenAIResponsesAdapter({
      ...adapterOptions,
      modelRef: MODEL_REF,
      apiModel: openAiModel,
    });

  const fastAdapter =
    openAiFastModel === openAiModel
      ? null
      : new OpenAIResponsesAdapter({
          ...adapterOptions,
          modelRef:
            FAST_MODEL_REF,
          apiModel:
            openAiFastModel,
        });

  const gateway =
    new IntelligenceProviderGateway(
      fastAdapter
        ? [
            primaryAdapter,
            fastAdapter,
          ]
        : [
            primaryAdapter,
          ],
    );

  const chatRateLimiter =
    new FixedWindowRateLimiter({
      windowMs: 60_000,
      maxEvents: 120,
      maxKeys: 50_000,
    });

  const chatHandler =
    createIntelligenceChatHandler({
      gateway,
      rateLimiter:
        chatRateLimiter,
      authenticateBearer:
        async (token) =>
          sessionAuthority.verify(
            token,
            Date.now(),
          ),
      routeSelector:
        async ({
          inputTextLength,
        }) =>
          Object.freeze({
            candidates:
              fastAdapter
                ? Object.freeze([
                    Object.freeze({
                      providerRef:
                        PROVIDER_REF,
                      modelRef:
                        MODEL_REF,
                    }),
                    Object.freeze({
                      providerRef:
                        PROVIDER_REF,
                      modelRef:
                        FAST_MODEL_REF,
                    }),
                  ])
                : Object.freeze([
                    Object.freeze({
                      providerRef:
                        PROVIDER_REF,
                      modelRef:
                        MODEL_REF,
                    }),
                  ]),
            maxOutputTokens:
              inputTextLength > 40_000
                ? 8192
                : 4096,
          }),
    });

  const sessionHandler =
    createGatewaySessionHandler({
      accessToken,
      sessionAuthority,
    });

  return Object.freeze({
    chatHandler,
    sessionHandler,
    providerRef: PROVIDER_REF,
    modelRef: MODEL_REF,
    fastModelRef:
      fastAdapter
        ? FAST_MODEL_REF
        : null,
  });
}

async function readNodeBody(
  request,
  maxBytes = 300_000,
) {
  const chunks = [];
  let total = 0;

  for await (
    const chunk of request
  ) {
    total += chunk.length;

    if (total > maxBytes) {
      throw new Error(
        'request_too_large',
      );
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function copyHeaders(
  source,
) {
  const headers =
    new Headers();

  for (
    const [
      name,
      value,
    ]
    of Object.entries(source)
  ) {
    if (
      typeof value === 'string'
    ) {
      headers.set(
        name,
        value,
      );
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(
        name,
        value.join(', '),
      );
    }
  }

  return headers;
}

async function sendWebResponse(
  webResponse,
  nodeResponse,
) {
  nodeResponse.statusCode =
    webResponse.status;

  webResponse.headers.forEach(
    (value, name) => {
      nodeResponse.setHeader(
        name,
        value,
      );
    },
  );

  if (!webResponse.body) {
    nodeResponse.end();
    return;
  }

  const reader =
    webResponse.body.getReader();

  try {
    while (true) {
      const item =
        await reader.read();

      if (item.done) {
        break;
      }

      if (item.value) {
        nodeResponse.write(
          Buffer.from(
            item.value,
          ),
        );
      }
    }
  } finally {
    reader.releaseLock();
  }

  nodeResponse.end();
}

export function createGatewayHttpServer({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const runtime =
    buildIntelligenceRuntime(
      env,
      fetchImpl,
    );

  return createServer(
    async (
      request,
      response,
    ) => {
      try {
        if (
          request.method === 'GET'
          && request.url === '/health'
        ) {
          response.statusCode = 200;
          response.setHeader(
            'content-type',
            'application/json; charset=utf-8',
          );
          response.setHeader(
            'cache-control',
            'no-store',
          );
          response.end(
            JSON.stringify({
              ok: true,
              service:
                'mudrik-intelligence-gateway',
            }),
          );
          return;
        }

        if (
          request.url !== '/v1/chat'
          && request.url
            !== '/v1/internal/session'
        ) {
          response.statusCode = 404;
          response.setHeader(
            'content-type',
            'application/json; charset=utf-8',
          );
          response.end(
            JSON.stringify({
              code: 'not_found',
            }),
          );
          return;
        }

        const body =
          await readNodeBody(
            request,
          );

        const origin =
          'http://127.0.0.1';

        const targetPath =
          request.url === '/v1/chat'
            ? '/v1/chat'
            : '/v1/internal/session';

        const webRequest =
          new Request(
            origin + targetPath,
            {
              method:
                request.method,
              headers:
                copyHeaders(
                  request.headers,
                ),
              body:
                request.method
                  === 'GET'
                  || request.method
                    === 'HEAD'
                  ? undefined
                  : body,
            },
          );

        const webResponse =
          request.url === '/v1/chat'
            ? await runtime
              .chatHandler(
                webRequest,
              )
            : await runtime
              .sessionHandler(
                webRequest,
              );

        await sendWebResponse(
          webResponse,
          response,
        );
      } catch (error) {
        response.statusCode =
          error instanceof Error
          && error.message
            === 'request_too_large'
            ? 413
            : 500;

        response.setHeader(
          'content-type',
          'application/json; charset=utf-8',
        );
        response.setHeader(
          'cache-control',
          'no-store',
        );
        response.end(
          JSON.stringify({
            code:
              response.statusCode
                === 413
                ? 'request_too_large'
                : 'gateway_failure',
          }),
        );
      }
    },
  );
}

export function resolveGatewayPort(
  env = process.env,
) {
  const raw =
    env.PORT ?? '3000';
  const port =
    Number(raw);

  if (
    !Number.isInteger(port)
    || port < 1
    || port > 65535
  ) {
    throw new Error(
      'Invalid PORT.',
    );
  }

  return port;
}

const isDirect =
  process.argv[1]
  && import.meta.url
    === pathToFileURL(
      process.argv[1],
    ).href;

if (isDirect) {
  const server =
    createGatewayHttpServer();

  const port =
    resolveGatewayPort();

  server.listen(
    port,
    '0.0.0.0',
    () => {
      process.stdout.write(
        'MUDRIK intelligence gateway listening on port '
        + port
        + '\n',
      );
    },
  );
}
