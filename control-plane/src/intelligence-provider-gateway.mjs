import {
  gatewayKey,
  parseGatewayRequest,
} from './intelligence-gateway-contract.mjs';

function failure(
  code,
  retryable,
  status = null,
  extra = {},
) {
  return Object.freeze({
    ok: false,
    code,
    retryable,
    status,
    ...extra,
  });
}

function parseCandidates(input) {
  if (
    !Array.isArray(input)
    || input.length < 1
    || input.length > 8
  ) {
    return null;
  }

  const seen = new Set();
  const output = [];

  for (const candidate of input) {
    if (
      !candidate
      || typeof candidate !== 'object'
      || typeof candidate.providerRef
        !== 'string'
      || typeof candidate.modelRef
        !== 'string'
    ) {
      return null;
    }

    const key =
      gatewayKey(
        candidate.providerRef,
        candidate.modelRef,
      );

    if (seen.has(key)) {
      return null;
    }

    seen.add(key);
    output.push(
      Object.freeze({
        providerRef:
          candidate.providerRef,
        modelRef:
          candidate.modelRef,
      }),
    );
  }

  return Object.freeze(output);
}

export class IntelligenceProviderGateway {
  constructor(adapters = []) {
    this.adapters = new Map();

    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  register(adapter) {
    if (
      !adapter
      || typeof adapter !== 'object'
      || typeof adapter.providerRef !== 'string'
      || typeof adapter.modelRef !== 'string'
      || typeof adapter.invoke !== 'function'
    ) {
      throw new TypeError(
        'Invalid intelligence adapter.',
      );
    }

    const key =
      gatewayKey(
        adapter.providerRef,
        adapter.modelRef,
      );

    if (this.adapters.has(key)) {
      throw new TypeError(
        'Duplicate intelligence adapter.',
      );
    }

    this.adapters.set(key, adapter);
  }

  async invoke(input, options = {}) {
    const request =
      parseGatewayRequest(input);

    if (!request) {
      return failure(
        'invalid_request',
        false,
      );
    }

    const adapter =
      this.adapters.get(
        gatewayKey(
          request.providerRef,
          request.modelRef,
        ),
      );

    if (!adapter) {
      return failure(
        'route_unavailable',
        true,
      );
    }

    const now =
      typeof options.now === 'function'
        ? options.now()
        : Date.now();

    if (
      request.deadlineAtMs !== null
      && now >= request.deadlineAtMs
    ) {
      return failure(
        'deadline_exceeded',
        false,
      );
    }

    const controller =
      new AbortController();

    let timer = null;

    if (request.deadlineAtMs !== null) {
      const timeout =
        Math.max(
          0,
          request.deadlineAtMs - now,
        );

      timer = setTimeout(
        () => controller.abort(),
        timeout,
      );
    }

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener(
          'abort',
          () => controller.abort(),
          { once: true },
        );
      }
    }

    try {
      return await adapter.invoke(
        request,
        {
          signal: controller.signal,
          onDelta: options.onDelta,
        },
      );
    } finally {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
  }

  async invokePlan(
    input,
    candidateInput,
    options = {},
  ) {
    const candidates =
      parseCandidates(
        candidateInput,
      );

    if (!candidates) {
      return failure(
        'invalid_route_plan',
        false,
      );
    }

    let previous = null;

    for (
      let index = 0;
      index < candidates.length;
      index += 1
    ) {
      const candidate =
        candidates[index];
      let emittedDeltas = 0;

      options.onAttempt?.(
        Object.freeze({
          index,
          providerRef:
            candidate.providerRef,
          modelRef:
            candidate.modelRef,
        }),
      );

      const result =
        await this.invoke(
          {
            ...input,
            providerRef:
              candidate.providerRef,
            modelRef:
              candidate.modelRef,
          },
          {
            ...options,
            onDelta:
              async (event) => {
                emittedDeltas += 1;
                await options.onDelta?.(
                  event,
                );
              },
          },
        );

      if (result.ok) {
        return Object.freeze({
          ...result,
          routeIndex: index,
          attempts: index + 1,
        });
      }

      previous = result;

      if (emittedDeltas > 0) {
        return failure(
          'partial_stream_failure',
          false,
          result.status ?? null,
          {
            providerCode:
              result.code,
            routeIndex: index,
            attempts: index + 1,
          },
        );
      }

      if (!result.retryable) {
        return Object.freeze({
          ...result,
          routeIndex: index,
          attempts: index + 1,
        });
      }
    }

    return Object.freeze({
      ...(previous
        ?? failure(
          'route_unavailable',
          true,
        )),
      routeIndex:
        candidates.length - 1,
      attempts:
        candidates.length,
    });
  }
}
