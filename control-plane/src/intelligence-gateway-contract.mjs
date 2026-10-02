const ID =
  /^[a-z][a-z0-9_:-]{15,159}$/;

const MODEL =
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$/;

const LANGUAGE =
  /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const SERVICES =
  new Set(['general', 'coding']);

const HISTORY_ROLES =
  new Set(['user', 'assistant']);

const CONTEXT_SOURCES =
  new Set([
    'memory',
    'knowledge',
    'project_state',
    'tool_evidence',
  ]);

const CONTEXT_REF =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]{2,239}$/;

function parseContextEvidence(value) {
  if (value === undefined) {
    return Object.freeze([]);
  }

  if (
    !Array.isArray(value)
    || value.length > 24
  ) {
    return null;
  }

  let totalCharacters = 0;
  const output = [];

  for (const item of value) {
    if (
      !item
      || typeof item !== 'object'
      || Array.isArray(item)
      || Object.keys(item)
        .sort()
        .join(',')
        !== [
          'confidenceScore',
          'content',
          'observedAtMs',
          'provenanceRef',
          'sourceKind',
        ].sort().join(',')
      || !CONTEXT_SOURCES.has(
        item.sourceKind,
      )
      || typeof item.content !== 'string'
      || item.content.length < 1
      || item.content.length > 16_000
      || typeof item.provenanceRef
        !== 'string'
      || !CONTEXT_REF.test(
        item.provenanceRef,
      )
      || !Number.isSafeInteger(
        item.observedAtMs,
      )
      || item.observedAtMs < 0
      || !Number.isSafeInteger(
        item.confidenceScore,
      )
      || item.confidenceScore < 0
      || item.confidenceScore > 1000
    ) {
      return null;
    }

    totalCharacters +=
      item.content.length;

    if (totalCharacters > 48_000) {
      return null;
    }

    output.push(
      Object.freeze({
        sourceKind:
          item.sourceKind,
        content:
          item.content,
        provenanceRef:
          item.provenanceRef,
        observedAtMs:
          item.observedAtMs,
        confidenceScore:
          item.confidenceScore,
      }),
    );
  }

  return Object.freeze(output);
}

function parseHistory(value) {
  if (value === undefined) {
    return Object.freeze([]);
  }

  if (
    !Array.isArray(value)
    || value.length > 48
  ) {
    return null;
  }

  let totalCharacters = 0;
  const history = [];

  for (const item of value) {
    if (
      !item
      || typeof item !== 'object'
      || Array.isArray(item)
      || Object.keys(item)
        .sort()
        .join(',')
        !== 'role,text'
      || !HISTORY_ROLES.has(item.role)
      || typeof item.text !== 'string'
      || item.text.length < 1
      || item.text.length > 32_000
    ) {
      return null;
    }

    totalCharacters += item.text.length;

    if (totalCharacters > 64_000) {
      return null;
    }

    history.push(
      Object.freeze({
        role: item.role,
        text: item.text,
      }),
    );
  }

  return Object.freeze(history);
}

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
  const baseKeys = [
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
  ].sort().join(',');
  const historyKeys = [
    'deadlineAtMs',
    'history',
    'inputText',
    'languageTag',
    'maxOutputTokens',
    'modelRef',
    'protocolVersion',
    'providerRef',
    'requestId',
    'service',
    'streaming',
  ].sort().join(',');
  const contextKeys = [
    'contextEvidence',
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
  ].sort().join(',');
  const historyContextKeys = [
    'contextEvidence',
    'deadlineAtMs',
    'history',
    'inputText',
    'languageTag',
    'maxOutputTokens',
    'modelRef',
    'protocolVersion',
    'providerRef',
    'requestId',
    'service',
    'streaming',
  ].sort().join(',');
  const history =
    parseHistory(input.history);
  const contextEvidence =
    parseContextEvidence(
      input.contextEvidence,
    );

  if (
    (
      keys !== baseKeys
      && keys !== historyKeys
      && keys !== contextKeys
      && keys !== historyContextKeys
    )
    || history === null
    || contextEvidence === null
  ) {
    return null;
  }

  const historyCharacters =
    history.reduce(
      (total, item) =>
        total + item.text.length,
      0,
    );

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
    || historyCharacters
      + input.inputText.length
      > 200_000
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
    history,
    contextEvidence,
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
