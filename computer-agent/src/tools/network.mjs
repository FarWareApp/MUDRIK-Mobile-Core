import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';

import {
  parseNetworkToolInput,
} from '../network-contract.mjs';

export class NetworkToolError
  extends Error {
  constructor(code) {
    super(code);
    this.name = 'NetworkToolError';
    this.code = code;
  }
}

function fail(code) {
  throw new NetworkToolError(code);
}

function ipv4Parts(value) {
  if (net.isIP(value) !== 4) {
    return null;
  }

  const parts =
    value.split('.')
      .map(Number);

  return (
    parts.length === 4
    && parts.every(
      (part) =>
        Number.isInteger(part)
        && part >= 0
        && part <= 255,
    )
      ? parts
      : null
  );
}
function isPublicIpv4(value) {
  const parts = ipv4Parts(value);

  if (!parts) {
    return false;
  }

  const [a, b, c] = parts;

  if (
    a === 0
    || a === 10
    || a === 127
    || a >= 224
    || (
      a === 100
      && b >= 64
      && b <= 127
    )
    || (
      a === 169
      && b === 254
    )
    || (
      a === 172
      && b >= 16
      && b <= 31
    )
    || (
      a === 192
      && b === 168
    )
    || (
      a === 192
      && b === 0
      && c === 0
    )
    || (
      a === 192
      && b === 0
      && c === 2
    )
    || (
      a === 198
      && (
        b === 18
        || b === 19
      )
    )
    || (
      a === 198
      && b === 51
      && c === 100
    )
    || (
      a === 203
      && b === 0
      && c === 113
    )
  ) {
    return false;
  }

  return true;
}
function isPublicIpv6(value) {
  if (net.isIP(value) !== 6) {
    return false;
  }

  const normalized =
    value
      .toLowerCase()
      .split('%')[0];

  // Global unicast is currently 2000::/3.
  // Everything outside that range stays unavailable.
  const first =
    normalized.split(':')[0];

  if (!/^[0-9a-f]{1,4}$/.test(first)) {
    return false;
  }

  const firstWord =
    Number.parseInt(first, 16);

  if (
    firstWord < 0x2000
    || firstWord > 0x3fff
    || normalized.startsWith(
      '2001:db8:',
    )
  ) {
    return false;
  }

  return true;
}

export function isPublicNetworkAddress(
  value,
) {
  const version = net.isIP(value);

  return version === 4
    ? isPublicIpv4(value)
    : version === 6
      ? isPublicIpv6(value)
      : false;
}
async function resolvePinnedAddress(
  hostname,
  lookup,
) {
  let answers;

  try {
    answers =
      await lookup(
        hostname,
        {
          all: true,
          verbatim: true,
        },
      );
  } catch {
    fail('network_dns_failed');
  }

  if (
    !Array.isArray(answers)
    || answers.length < 1
    || answers.length > 32
    || answers.some(
      (answer) =>
        !answer
        || typeof answer.address
          !== 'string'
        || ![
          4,
          6,
        ].includes(answer.family)
        || !isPublicNetworkAddress(
          answer.address,
        ),
    )
  ) {
    fail('network_destination_denied');
  }

  const preferred =
    answers.find(
      (answer) =>
        answer.family === 4,
    )
    ?? answers[0];

  return Object.freeze({
    address: preferred.address,
    family: preferred.family,
  });
}

function safeContentType(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const compact =
    value.slice(0, 512);

  return /^[\x20-\x7E]*$/.test(compact)
    ? compact
    : null;
}
export class ScopedHttpsNetworkAdapter {
  constructor({
    lookup = dns.lookup,
    request = https.request,
  } = {}) {
    if (
      typeof lookup !== 'function'
      || typeof request !== 'function'
    ) {
      throw new TypeError(
        'Invalid network adapter dependencies.',
      );
    }

    this.lookup = lookup;
    this.request = request;
  }

  async run(
    input,
    {
      allowedDomains = [],
      signal,
    } = {},
  ) {
    if (
      !input
      || typeof input !== 'object'
      || !Array.isArray(
        allowedDomains,
      )
      || allowedDomains.length > 256
      || !allowedDomains.every(
        (domain) =>
          typeof domain === 'string'
          && domain.length > 0
          && domain.length <= 253,
      )
    ) {
      fail('network_invalid_input');
    }

    const parsed =
      parseNetworkToolInput(input);

    if (!parsed) {
      fail('network_invalid_input');
    }

    const target =
      new URL(parsed.url);
    const domain =
      target.hostname.toLowerCase();

    if (
      !allowedDomains.some(
        (allowed) =>
          allowed.toLowerCase()
            === domain,
      )
    ) {
      fail('network_scope_denied');
    }

    const pinned =
      await resolvePinnedAddress(
        domain,
        this.lookup,
      );

    return this.requestBounded(
      parsed,
      target,
      pinned,
      signal,
    );
  }
  requestBounded(
    input,
    target,
    pinned,
    signal,
  ) {
    return new Promise(
      (resolve, reject) => {
        let settled = false;
        let body = Buffer.alloc(0);
        let wallTimer = null;

        const finish = (callback) => {
          if (settled) {
            return;
          }

          settled = true;

          if (wallTimer) {
            clearTimeout(wallTimer);
          }

          signal?.removeEventListener(
            'abort',
            onAbort,
          );
          callback();
        };

        let request;

        const onAbort = () => {
          request?.destroy(
            new NetworkToolError(
              'network_aborted',
            ),
          );
        };

        try {
          request =
            this.request(
              {
                protocol: 'https:',
                hostname:
                  target.hostname,
                port: 443,
                method:
                  input.operation === 'head'
                    ? 'HEAD'
                    : 'GET',
                path:
                  target.pathname
                  + target.search,
                servername:
                  target.hostname,
                agent: false,
                minVersion: 'TLSv1.2',
                headers: {
                  Accept: '*/*',
                  'User-Agent':
                    'MUDRIK-Computer-Agent/1',
                  Connection: 'close',
                },
                lookup: (
                  _hostname,
                  _options,
                  callback,
                ) => {
                  callback(
                    null,
                    pinned.address,
                    pinned.family,
                  );
                },
              },
              (response) => {
                const statusCode =
                  response.statusCode
                  ?? 0;

                if (
                  !Number.isInteger(
                    statusCode,
                  )
                  || statusCode < 100
                  || statusCode > 599
                ) {
                  response.resume();
                  request.destroy();
                  finish(
                    () =>
                      reject(
                        new NetworkToolError(
                          'network_response_invalid',
                        ),
                      ),
                  );
                  return;
                }

                response.once(
                  'error',
                  () => {
                    finish(
                      () =>
                        reject(
                          new NetworkToolError(
                            'network_request_failed',
                          ),
                        ),
                    );
                  },
                );

                response.once(
                  'aborted',
                  () => {
                    finish(
                      () =>
                        reject(
                          new NetworkToolError(
                            'network_request_failed',
                          ),
                        ),
                    );
                  },
                );

                if (
                  statusCode >= 300
                  && statusCode <= 399
                ) {
                  response.resume();
                  request.destroy();
                  finish(
                    () =>
                      reject(
                        new NetworkToolError(
                          'network_redirect_denied',
                        ),
                      ),
                  );
                  return;
                }

                const contentLength =
                  Number(
                    response.headers[
                      'content-length'
                    ],
                  );

                if (
                  input.operation
                    !== 'head'
                  && Number.isFinite(
                    contentLength,
                  )
                  && contentLength
                    > input.maxBytes
                ) {
                  response.resume();
                  request.destroy();
                  finish(
                    () =>
                      reject(
                        new NetworkToolError(
                          'network_response_limit',
                        ),
                      ),
                  );
                  return;
                }

                response.on(
                  'data',
                  (chunk) => {
                    if (
                      input.operation
                        === 'head'
                    ) {
                      return;
                    }

                    const next =
                      Buffer.concat([
                        body,
                        Buffer.from(chunk),
                      ]);

                    if (
                      next.byteLength
                        > input.maxBytes
                    ) {
                      response.destroy();
                      request.destroy();
                      finish(
                        () =>
                          reject(
                            new NetworkToolError(
                              'network_response_limit',
                            ),
                          ),
                      );
                      return;
                    }

                    body = next;
                  },
                );

                response.on(
                  'end',
                  () => {
                    finish(
                      () =>
                        resolve(
                          Object.freeze({
                            exitCode: 0,
                            operation:
                              input.operation,
                            url:
                              target.toString(),
                            domain:
                              target.hostname
                                .toLowerCase(),
                            statusCode,
                            contentType:
                              safeContentType(
                                response.headers[
                                  'content-type'
                                ],
                              ),
                            bytes:
                              body.byteLength,
                            body:
                              input.operation
                                === 'head'
                                ? ''
                                : body.toString(
                                    'utf8',
                                  ),
                          }),
                        ),
                    );
                  },
                );
              },
            );
        } catch {
          finish(
            () =>
              reject(
                new NetworkToolError(
                  'network_request_failed',
                ),
              ),
          );
          return;
        }

        const timeout = () => {
          request.destroy(
            new NetworkToolError(
              'network_timeout',
            ),
          );
        };

        request.setTimeout(
          input.timeoutMs,
          timeout,
        );

        wallTimer =
          setTimeout(
            timeout,
            input.timeoutMs,
          );

        request.once(
          'error',
          (error) => {
            const safe =
              error instanceof
                NetworkToolError
                ? error
                : new NetworkToolError(
                    'network_request_failed',
                  );

            finish(
              () => reject(safe),
            );
          },
        );

        if (signal?.aborted) {
          onAbort();
        } else {
          signal?.addEventListener(
            'abort',
            onAbort,
            { once: true },
          );
        }

        request.end();
      },
    );
  }
}
