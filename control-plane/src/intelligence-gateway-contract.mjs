const ID =
  /^[a-z][a-z0-9_:-]{15,159}$/;

const MODEL =
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$/;

const LANGUAGE =
  /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const SERVICES =
  new Set(['general', 'coding']);

export function parseGatewayRequest(input) {
  if (
    !input
    || typeof input !== 'object'
    || Array.isArray(input)
  ) {
    return null;
  }

  const keys =
    Object.keys(input).sort().join(',');

  if (
    keys !== [
      'deadlineAtMs',
      'inputText',
      'languageTag',
      'maxOutputTokens',
      'modelRef',
      'protocolVersion',
      'providerRef',
      'requestId',
      'service',
      'streaming',
    ].sort().join(',')
  ) {
    return null;
  }

  if (
    input.protocolVersion !== '1.0'
    || typeof input.requestId !== 'string'
    || !ID.test(input.requestId)
    || typeof input.providerRef !== 'string'
    || !ID.test(input.providerRef)
    || typeof input.modelRef !== 'string'
    || !MODEL.test(input.modelRef)
    || !SERVICES.has(input.service)
    || typeof input.languageTag !== 'string'
    || !LANGUAGE.test(input.languageTag)
    || typeof input.inputText !== 'string'
    || input.inputText.length < 1
    || input.inputText.length > 200_000
    || typeof input.streaming !== 'boolean'
    || !Number.isSafeInteger(input.maxOutputTokens)
    || input.maxOutputTokens < 16
    || input.maxOutputTokens > 65_536
    || (
      input.deadlineAtMs !== null
      && (
        !Number.isSafeInteger(input.deadlineAtMs)
        || input.deadlineAtMs < 0
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    requestId: input.requestId,
    providerRef: input.providerRef,
    modelRef: input.modelRef,
    service: input.service,
    languageTag: input.languageTag,
    inputText: input.inputText,
    streaming: input.streaming,
    maxOutputTokens: input.maxOutputTokens,
    deadlineAtMs: input.deadlineAtMs,
  });
}

export function gatewayKey(
  providerRef,
  modelRef,
) {
  return providerRef + ':' + modelRef;
}
