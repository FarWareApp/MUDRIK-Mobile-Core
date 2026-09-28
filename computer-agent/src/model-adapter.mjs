const ROLE_SET =
  new Set([
    'worker',
    'reviewer',
  ]);

export function isModelAdapter(
  value,
) {
  return (
    value
    && typeof value === 'object'
    && typeof value.invoke
      === 'function'
  );
}

export async function invokeModelAdapter(
  adapter,
  request,
  {
    timeoutMs = 30_000,
    signal,
  } = {},
) {
  if (
    !isModelAdapter(adapter)
    || !request
    || typeof request !== 'object'
    || !ROLE_SET.has(
      request.role,
    )
    || !Number.isInteger(timeoutMs)
    || timeoutMs < 100
    || timeoutMs > 300_000
  ) {
    return Object.freeze({
      ok: false,
      reason:
        'model_adapter_invalid',
    });
  }

  if (signal?.aborted) {
    return Object.freeze({
      ok: false,
      reason: 'model_aborted',
    });
  }

  const controller =
    new AbortController();
  let timer = null;
  let terminateReason = null;
  let resolveExternalAbort;

  const externalAbort =
    new Promise((resolve) => {
      resolveExternalAbort = resolve;
    });

  const onAbort = () => {
    if (!terminateReason) {
      terminateReason =
        'model_aborted';
    }

    controller.abort();

    resolveExternalAbort(
      Object.freeze({
        ok: false,
        reason: 'model_aborted',
      }),
    );
  };

  signal?.addEventListener(
    'abort',
    onAbort,
    { once: true },
  );

  try {
    const timeout =
      new Promise((resolve) => {
        timer = setTimeout(
          () => {
            if (!terminateReason) {
              terminateReason =
                'model_timeout';
            }

            controller.abort();

            resolve(
              Object.freeze({
                ok: false,
                reason:
                  'model_timeout',
              }),
            );
          },
          timeoutMs,
        );
      });

    const invocation =
      Promise.resolve()
        .then(() => {
          if (
            controller.signal
              .aborted
          ) {
            throw new Error(
              'model_invocation_aborted',
            );
          }

          return adapter.invoke(
            Object.freeze({
              ...request,
            }),
            {
              signal:
                controller.signal,
            },
          );
        })
        .then(
          (value) =>
            Object.freeze({
              ok: true,
              value,
            }),
          () =>
            Object.freeze({
              ok: false,
              reason:
                terminateReason
                ?? 'model_provider_error',
            }),
        );

    return await Promise.race([
      timeout,
      invocation,
      externalAbort,
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }

    signal?.removeEventListener(
      'abort',
      onAbort,
    );
  }
}
