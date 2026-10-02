import {
  gatewayKey,
  parseGatewayRequest,
} from './intelligence-gateway-contract.mjs';

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
      return Object.freeze({
        ok: false,
        code: 'invalid_request',
        retryable: false,
        status: null,
      });
    }

    const adapter =
      this.adapters.get(
        gatewayKey(
          request.providerRef,
          request.modelRef,
        ),
      );

    if (!adapter) {
      return Object.freeze({
        ok: false,
        code: 'route_unavailable',
        retryable: true,
        status: null,
      });
    }

    const now =
      typeof options.now === 'function'
        ? options.now()
        : Date.now();

    if (
      request.deadlineAtMs !== null
      && now >= request.deadlineAtMs
    ) {
      return Object.freeze({
        ok: false,
        code: 'deadline_exceeded',
        retryable: false,
        status: null,
      });
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
}
