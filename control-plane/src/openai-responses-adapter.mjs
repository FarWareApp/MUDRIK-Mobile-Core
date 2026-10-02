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

  async invoke(request, { signal } = {}) {
    if (request.streaming) {
      return providerFailure(
        'streaming_not_enabled',
        false,
      );
    }

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

    const body = {
      model: this.apiModel,
      input: [
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

      return providerFailure(
        status === 429
          ? 'rate_limited'
          : status !== null
            && status >= 500
            ? 'provider_unavailable'
            : 'provider_rejected',
        status === 429
          || (
            status !== null
            && status >= 500
          ),
        status,
      );
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
      usage:
        payload.usage
        && typeof payload.usage === 'object'
          ? Object.freeze({
              inputTokens:
                Number.isSafeInteger(
                  payload.usage.input_tokens,
                )
                  ? payload.usage.input_tokens
                  : null,
              outputTokens:
                Number.isSafeInteger(
                  payload.usage.output_tokens,
                )
                  ? payload.usage.output_tokens
                  : null,
            })
          : null,
    });
  }
}
