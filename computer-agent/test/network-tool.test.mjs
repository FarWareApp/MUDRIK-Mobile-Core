import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';

import {
  networkPolicyContext,
  normalizeNetworkStep,
  parseNetworkToolInput,
} from '../src/network-contract.mjs';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  isPublicNetworkAddress,
  ScopedHttpsNetworkAdapter,
} from '../src/tools/network.mjs';

function futureIso() {
  return new Date(
    Date.now() + 600_000,
  ).toISOString();
}

function pastIso() {
  return new Date(
    Date.now() - 60_000,
  ).toISOString();
}

function grant(
  domains = ['example.test'],
) {
  return {
    grantId:
      'grant-network-test',
    deviceId: 'device-test',
    capability:
      'network.outbound',
    mode: 'session',
    scope: {
      domains,
      maxTaskDurationSeconds: 30,
    },
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

function step(
  url = 'https://example.test/data',
) {
  return {
    stepId: 'network-step',
    tool: 'network',
    summary: 'Fetch scoped HTTPS',
    requiredCapabilities: [
      'network.outbound',
    ],
    input: {
      operation: 'fetch',
      url,
      timeoutMs: 2_000,
      maxBytes: 4096,
    },
  };
}

function task(
  networkStep = step(),
) {
  return {
    taskId: 'network-task',
    deviceId: 'device-test',
    intent: 'Read scoped HTTPS data',
    risk: 'medium',
    requestedCapabilities: [
      'network.outbound',
    ],
    expiresAt: futureIso(),
    steps: [networkStep],
  };
}

function fakeRequest({
  statusCode = 200,
  headers = {},
  body = 'ok',
  capture = {},
} = {}) {
  return (options, callback) => {
    const request =
      new EventEmitter();

    request.setTimeout =
      (_timeout, handler) => {
        request.timeoutHandler =
          handler;
      };

    request.destroy = (error) => {
      if (error) {
        queueMicrotask(
          () =>
            request.emit(
              'error',
              error,
            ),
        );
      }
    };

    request.end = () => {
      options.lookup(
        options.hostname,
        {},
        (
          error,
          address,
          family,
        ) => {
          if (error) {
            request.emit(
              'error',
              error,
            );
            return;
          }

          capture.address = address;
          capture.family = family;
          capture.options = options;

          const response =
            new PassThrough();

          response.statusCode =
            statusCode;
          response.headers =
            headers;

          callback(response);

          queueMicrotask(() => {
            response.end(body);
          });
        },
      );
    };

    return request;
  };
}

test(
  'network contract accepts HTTPS only and rejects credentials IP literals ports fragments and unknown fields',
  () => {
    assert.ok(
      parseNetworkToolInput({
        operation: 'fetch',
        url:
          'https://example.test/a?q=1',
      }),
    );

    const invalid = [
      'http://example.test/',
      'https://user:pass@example.test/',
      'https://127.0.0.1/',
      'https://[::1]/',
      'https://example.test:444/',
      'https://example.test/#fragment',
    ];

    for (const url of invalid) {
      assert.equal(
        parseNetworkToolInput({
          operation: 'fetch',
          url,
        }),
        null,
      );
    }

    assert.equal(
      parseNetworkToolInput({
        operation: 'fetch',
        url: 'https://example.test/',
        headers: {
          Authorization: 'x',
        },
      }),
      null,
    );
  },
);

test(
  'network policy context binds exact normalized domain and medium risk',
  () => {
    const normalized =
      normalizeNetworkStep(
        step(
          'https://EXAMPLE.test/path',
        ),
      );

    assert.ok(normalized);

    const context =
      networkPolicyContext(
        normalized,
      );

    assert.equal(
      context['network.outbound']
        .domain,
      'example.test',
    );
    assert.equal(
      context['network.outbound']
        .minimumRisk,
      'medium',
    );
  },
);

test(
  'public-address classifier rejects local private link-local documentation multicast and mapped private addresses',
  () => {
    const denied = [
      '0.0.0.0',
      '10.0.0.1',
      '100.64.0.1',
      '127.0.0.1',
      '169.254.1.1',
      '172.16.0.1',
      '192.168.1.1',
      '192.0.2.1',
      '198.18.0.1',
      '198.51.100.1',
      '203.0.113.1',
      '224.0.0.1',
      '::',
      '::1',
      'fc00::1',
      'fd00::1',
      'fe80::1',
      'ff02::1',
      '2001:db8::1',
      '::ffff:127.0.0.1',
    ];

    for (const address of denied) {
      assert.equal(
        isPublicNetworkAddress(
          address,
        ),
        false,
        address,
      );
    }

    assert.equal(
      isPublicNetworkAddress(
        '8.8.8.8',
      ),
      true,
    );
    assert.equal(
      isPublicNetworkAddress(
        '2606:4700:4700::1111',
      ),
      true,
    );
  },
);

test(
  'adapter rejects private or mixed DNS answers before request creation',
  async () => {
    let requests = 0;

    for (
      const answers of [
        [{
          address: '127.0.0.1',
          family: 4,
        }],
        [
          {
            address: '8.8.8.8',
            family: 4,
          },
          {
            address: '10.0.0.1',
            family: 4,
          },
        ],
      ]
    ) {
      const adapter =
        new ScopedHttpsNetworkAdapter({
          lookup:
            async () => answers,
          request: () => {
            requests += 1;
            throw new Error(
              'must not request',
            );
          },
        });

      await assert.rejects(
        () => adapter.run(
          parseNetworkToolInput({
            operation: 'fetch',
            url:
              'https://example.test/',
          }),
          {
            allowedDomains: [
              'example.test',
            ],
          },
        ),
        /network_destination_denied/,
      );
    }

    assert.equal(requests, 0);
  },
);

test(
  'adapter pins approved public DNS result and returns bounded HTTPS response',
  async () => {
    const capture = {};
    const adapter =
      new ScopedHttpsNetworkAdapter({
        lookup:
          async () => [{
            address: '8.8.8.8',
            family: 4,
          }],
        request:
          fakeRequest({
            statusCode: 200,
            headers: {
              'content-type':
                'application/json',
              'content-length': '7',
            },
            body: '{"a":1}',
            capture,
          }),
      });

    const result =
      await adapter.run(
        parseNetworkToolInput({
          operation: 'fetch',
          url:
            'https://example.test/data?q=1',
          maxBytes: 64,
          timeoutMs: 2000,
        }),
        {
          allowedDomains: [
            'example.test',
          ],
        },
      );

    assert.equal(
      capture.address,
      '8.8.8.8',
    );
    assert.equal(
      capture.family,
      4,
    );
    assert.equal(
      capture.options.hostname,
      'example.test',
    );
    assert.equal(
      capture.options.servername,
      'example.test',
    );
    assert.equal(
      capture.options.path,
      '/data?q=1',
    );
    assert.equal(
      result.body,
      '{"a":1}',
    );
    assert.equal(
      result.bytes,
      7,
    );
    assert.equal(
      result.statusCode,
      200,
    );
  },
);

test(
  'adapter rejects redirects oversized responses and wrong domain',
  async () => {
    const publicLookup =
      async () => [{
        address: '8.8.8.8',
        family: 4,
      }];

    const redirect =
      new ScopedHttpsNetworkAdapter({
        lookup: publicLookup,
        request:
          fakeRequest({
            statusCode: 302,
            headers: {
              location:
                'https://other.test/',
            },
          }),
      });

    await assert.rejects(
      () => redirect.run(
        parseNetworkToolInput({
          operation: 'fetch',
          url:
            'https://example.test/',
        }),
        {
          allowedDomains: [
            'example.test',
          ],
        },
      ),
      /network_redirect_denied/,
    );

    const oversized =
      new ScopedHttpsNetworkAdapter({
        lookup: publicLookup,
        request:
          fakeRequest({
            statusCode: 200,
            headers: {
              'content-length':
                '1000',
            },
            body: 'x'.repeat(1000),
          }),
      });

    await assert.rejects(
      () => oversized.run(
        parseNetworkToolInput({
          operation: 'fetch',
          url:
            'https://example.test/',
          maxBytes: 10,
        }),
        {
          allowedDomains: [
            'example.test',
          ],
        },
      ),
      /network_response_limit/,
    );

    await assert.rejects(
      () => oversized.run(
        parseNetworkToolInput({
          operation: 'fetch',
          url:
            'https://example.test/',
          maxBytes: 10,
        }),
        {
          allowedDomains: [
            'other.test',
          ],
        },
      ),
      /network_scope_denied/,
    );
  },
);

test(
  'runner blocks wrong network domain before adapter and passes only covering grant domains',
  async () => {
    const observed = [];
    const adapter = {
      async run(input, options) {
        observed.push({
          input,
          options,
        });

        return {
          exitCode: 0,
          operation: input.operation,
          url: input.url,
          domain:
            new URL(
              input.url,
            ).hostname.toLowerCase(),
          statusCode: 200,
          contentType: 'text/plain',
          bytes: 2,
          body: 'ok',
        };
      },
    };

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant([
            'example.test',
          ]),
        ],
        networkAdapter: adapter,
      });

    const denied =
      await runner.run(
        task(
          step(
            'https://other.test/',
          ),
        ),
      );

    assert.equal(
      denied.status,
      'blocked',
    );
    assert.equal(
      observed.length,
      0,
    );

    const allowed =
      await runner.run(task());

    assert.equal(
      allowed.status,
      'succeeded',
    );
    assert.equal(
      observed.length,
      1,
    );
    assert.deepEqual(
      observed[0].options
        .allowedDomains,
      ['example.test'],
    );
  },
);

test(
  'network adapter enforces total deadline and external abort',
  async () => {
    function hangingRequest() {
      const request =
        new EventEmitter();

      request.setTimeout = () => {};
      request.end = () => {};
      request.destroy = (error) => {
        if (error) {
          queueMicrotask(
            () =>
              request.emit(
                'error',
                error,
              ),
          );
        }
      };

      return request;
    }

    const adapter =
      new ScopedHttpsNetworkAdapter({
        lookup:
          async () => [{
            address: '8.8.8.8',
            family: 4,
          }],
        request: hangingRequest,
      });

    await assert.rejects(
      () => adapter.run(
        {
          operation: 'fetch',
          url:
            'https://example.test/',
          timeoutMs: 100,
          maxBytes: 32,
        },
        {
          allowedDomains: [
            'example.test',
          ],
        },
      ),
      /network_timeout/,
    );

    const controller =
      new AbortController();

    const pending =
      adapter.run(
        {
          operation: 'fetch',
          url:
            'https://example.test/',
          timeoutMs: 2_000,
          maxBytes: 32,
        },
        {
          allowedDomains: [
            'example.test',
          ],
          signal:
            controller.signal,
        },
      );

    setTimeout(
      () => controller.abort(),
      10,
    );

    await assert.rejects(
      () => pending,
      /network_aborted/,
    );
  },
);

test(
  'HEAD ignores representation content-length while returning no body',
  async () => {
    const adapter =
      new ScopedHttpsNetworkAdapter({
        lookup:
          async () => [{
            address: '8.8.8.8',
            family: 4,
          }],
        request:
          fakeRequest({
            statusCode: 200,
            headers: {
              'content-length':
                '1000000',
            },
            body: '',
          }),
      });

    const result =
      await adapter.run(
        {
          operation: 'head',
          url:
            'https://example.test/',
          timeoutMs: 2_000,
          maxBytes: 0,
        },
        {
          allowedDomains: [
            'example.test',
          ],
        },
      );

    assert.equal(
      result.exitCode,
      0,
    );
    assert.equal(
      result.body,
      '',
    );
    assert.equal(
      result.bytes,
      0,
    );
  },
);

test(
  'adapter independently rejects unparsed insecure input',
  async () => {
    const adapter =
      new ScopedHttpsNetworkAdapter({
        lookup:
          async () => [{
            address: '8.8.8.8',
            family: 4,
          }],
        request:
          fakeRequest(),
      });

    await assert.rejects(
      () => adapter.run(
        {
          operation: 'fetch',
          url:
            'http://example.test/',
          timeoutMs: 2_000,
          maxBytes: 32,
        },
        {
          allowedDomains: [
            'example.test',
          ],
        },
      ),
      /network_invalid_input/,
    );
  },
);
