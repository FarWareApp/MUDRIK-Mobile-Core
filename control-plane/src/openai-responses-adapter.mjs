const API_URL =
  'https://api.openai.com/v1/responses';

function safeSecret(value) {
  return (
    typeof value === 'string'
    && value.length >= 20
    && value.length <= 512
    && !/[\r\n]/.test(value)
  );
}

function extractText(payload) {
  if (
    !payload
    || typeof payload !== 'object'
  ) {
    return null;
  }

  const parts = [];

  for (const item of payload.output ?? []) {
    if (
      !item
      || item.type !== 'message'
      || !Array.isArray(item.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        content
        && content.type === 'output_text'
        && typeof content.text === 'string'
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.length > 0
    ? parts.join('')
    : null;
}

function usageOf(value) {
  if (
    !value
    || typeof value !== 'object'
  ) {
    return null;
  }

  return Object.freeze({
    inputTokens:
      Number.isSafeInteger(
        value.input_tokens,
      )
        ? value.input_tokens
        : null,
    outputTokens:
      Number.isSafeInteger(
        value.output_tokens,
      )
        ? value.output_tokens
        : null,
  });
}

function providerFailure(
  code,
  retryable,
  status = null,
) {
  return Object.freeze({
    ok: false,
    code,
    retryable,
    status,
  });
}

function parseSseFrame(frame) {
  const data =
    frame
      .split(/\r?\n/)
      .filter((line) =>
        line.startsWith('data:'),
      )
      .map((line) =>
        line.slice(5).trimStart(),
      )
      .join('\n');

  if (!data || data === '[DONE]') {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return Symbol.for(
      'mudrik.invalid_sse',
    );
  }
}

async function consumeStream(
  response,
  onDelta,
) {
  if (
    !response.body
    || typeof response.body[
      Symbol.asyncIterator
    ] !== 'function'
  ) {
    return providerFailure(
      'invalid_provider_stream',
      true,
    );
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let sequence = 0;
  let responseRef = null;
  let usage = null;

  for await (
    const chunk of response.body
  ) {
    buffer += decoder.decode(
      chunk,
      { stream: true },
    );

    const frames =
      buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const event =
        parseSseFrame(frame);

      if (
        event
        === Symbol.for(
          'mudrik.invalid_sse',
        )
      ) {
        return providerFailure(
          'invalid_provider_stream',
          true,
        );
      }

      if (!event) {
        continue;
      }

      if (
        event.type
          === 'response.output_text.delta'
        && typeof event.delta === 'string'
      ) {
        text += event.delta;
        sequence += 1;

        if (typeof onDelta === 'function') {
          await onDelta(
            Object.freeze({
              sequence,
              delta: event.delta,
            }),
          );
        }
        continue;
      }

      if (
        event.type === 'response.completed'
      ) {
        if (
          event.response
          && typeof event.response.id
            === 'string'
        ) {
          responseRef =
            event.response.id;
          usage =
            usageOf(
              event.response.usage,
            );
        }
        continue;
      }

      if (
        event.type === 'response.failed'
        || event.type
          === 'response.incomplete'
      ) {
        return providerFailure(
          'provider_generation_failed',
          event.type
            === 'response.incomplete',
        );
      }
    }
  }

  if (
    !responseRef
    || text.length === 0
  ) {
    return providerFailure(
      'invalid_provider_stream',
      true,
    );
  }

  return Object.freeze({
    ok: true,
    providerResponseRef: responseRef,
    text,
    usage,
  });
}

export class OpenAIResponsesAdapter {
  constructor({
    providerRef,
    modelRef,
    apiModel,
    credentialRef,
    credentialResolver,
    fetchImpl = globalThis.fetch,
    instructions = null,
    endpoint = API_URL,
  }) {
    if (
      typeof providerRef !== 'string'
      || typeof modelRef !== 'string'
      || typeof apiModel !== 'string'
      || apiModel.length < 1
      || apiModel.length > 128
      || typeof credentialRef !== 'string'
      || typeof credentialResolver !== 'function'
      || typeof fetchImpl !== 'function'
      || (
        instructions !== null
        && (
          typeof instructions !== 'string'
          || instructions.length > 32_000
        )
      )
      || endpoint !== API_URL
    ) {
      throw new TypeError(
        'Invalid OpenAI adapter configuration.',
      );
    }

    this.providerRef = providerRef;
    this.modelRef = modelRef;
    this.apiModel = apiModel;
    this.credentialRef = credentialRef;
    this.credentialResolver =
      credentialResolver;
    this.fetchImpl = fetchImpl;
    this.instructions = instructions;
    this.endpoint = endpoint;
  }

  async invoke(
    request,
    {
      signal,
      onDelta = null,
    } = {},
  ) {
    let apiKey;

    try {
      apiKey =
        await this.credentialResolver(
          this.credentialRef,
        );
    } catch {
      return providerFailure(
        'credential_unavailable',
        false,
      );
    }

    if (!safeSecret(apiKey)) {
      return providerFailure(
        'credential_unavailable',
        false,
      );
    }

    const history =
      Array.isArray(request.history)
        ? request.history
        : [];

    const body = {
      model: this.apiModel,
      input: [
        ...history.map(
          (item) => ({
            role: item.role,
            content: [
              {
                type:
                  item.role === 'assistant'
                    ? 'output_text'
                    : 'input_text',
                text: item.text,
              },
            ],
          }),
        ),
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: request.inputText,
            },
          ],
        },
      ],
      max_output_tokens:
        request.maxOutputTokens,
      store: false,
    };

    if (request.streaming) {
      body.stream = true;
    }

    if (this.instructions !== null) {
      body.instructions = this.instructions;
    }

    let response;

    try {
      response = await this.fetchImpl(
        this.endpoint,
        {
          method: 'POST',
          headers: {
            authorization:
              'Bearer ' + apiKey,
            'content-type':
              'application/json',
          },
          body: JSON.stringify(body),
          signal,
        },
      );
    } catch (error) {
      if (
        error
        && error.name === 'AbortError'
      ) {
        return providerFailure(
          'cancelled',
          false,
        );
      }

      return providerFailure(
        'network_failure',
        true,
      );
    } finally {
      apiKey = null;
    }

    if (!response?.ok) {
      const status =
        Number.isInteger(response?.status)
          ? response.status
          : null;
      let providerType = null;
      let providerCode = null;

      try {
        const payload =
          await response.json();
        providerType =
          typeof payload?.error?.type
            === 'string'
            ? payload.error.type
            : null;
        providerCode =
          typeof payload?.error?.code
            === 'string'
            ? payload.error.code
            : null;
      } catch {}

      const quotaExhausted =
        status === 429
        && (
          providerType
            === 'insufficient_quota'
          || providerCode
            === 'credit_balance_exhausted'
        );

      return providerFailure(
        quotaExhausted
          ? 'quota_exhausted'
          : status === 401
            ? 'credential_rejected'
            : status === 429
              ? 'rate_limited'
              : status !== null
                && status >= 500
                ? 'provider_unavailable'
                : 'provider_rejected',
        !quotaExhausted
          && (
            status === 429
            || (
              status !== null
              && status >= 500
            )
          ),
        status,
      );
    }

    if (request.streaming) {
      const streamed =
        await consumeStream(
          response,
          onDelta,
        );

      if (!streamed.ok) {
        return streamed;
      }

      return Object.freeze({
        ...streamed,
        providerRef: this.providerRef,
        modelRef: this.modelRef,
      });
    }

    let payload;

    try {
      payload = await response.json();
    } catch {
      return providerFailure(
        'invalid_provider_response',
        true,
      );
    }

    const text = extractText(payload);

    if (
      !text
      || typeof payload.id !== 'string'
    ) {
      return providerFailure(
        'invalid_provider_response',
        true,
      );
    }

    return Object.freeze({
      ok: true,
      providerRef: this.providerRef,
      modelRef: this.modelRef,
      providerResponseRef: payload.id,
      text,
      usage: usageOf(payload.usage),
    });
  }
}
