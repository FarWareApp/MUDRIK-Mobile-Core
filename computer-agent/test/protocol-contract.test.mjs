import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  fileURLToPath,
} from 'node:url';

import {
  CAPABILITIES,
} from '../src/capabilities.mjs';

import {
  TASK_EVENT_TYPES,
} from '../src/task-event.mjs';

const here = path.dirname(
  fileURLToPath(import.meta.url),
);
const protocolDirectory =
  path.resolve(
    here,
    '../protocol',
  );

function schema(name) {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        protocolDirectory,
        name,
      ),
      'utf8',
    ),
  );
}

test(
  'computer task protocol requires authenticated durable identity fields',
  () => {
    const value =
      schema(
        'computer-task.schema.json',
      );

    assert.equal(
      value.additionalProperties,
      false,
    );

    for (const key of [
      'protocolVersion',
      'taskId',
      'accountId',
      'deviceId',
      'nonce',
      'steps',
      'signerKeyId',
      'signature',
    ]) {
      assert.equal(
        value.required.includes(key),
        true,
      );
    }

    assert.equal(
      value.properties
        .protocolVersion.const,
      '1.0',
    );
    assert.equal(
      value.$defs.step
        .additionalProperties,
      false,
    );
  },
);

test(
  'task and permission schemas share the exact capability vocabulary',
  () => {
    const task =
      schema(
        'computer-task.schema.json',
      );
    const grant =
      schema(
        'computer-permission-grant.schema.json',
      );

    assert.deepEqual(
      [...task.$defs.capability.enum]
        .sort(),
      [...CAPABILITIES].sort(),
    );
    assert.deepEqual(
      [...grant.properties
        .capability.enum]
        .sort(),
      [...CAPABILITIES].sort(),
    );
  },
);

test(
  'durable event schema matches runtime event vocabulary and forbids authority fields',
  () => {
    const value =
      schema(
        'durable-task-event.schema.json',
      );

    assert.equal(
      value.additionalProperties,
      false,
    );
    assert.deepEqual(
      [...value.properties.type.enum]
        .sort(),
      [...TASK_EVENT_TYPES].sort(),
    );
    assert.equal(
      value.properties
        .grantsAuthority.const,
      false,
    );
    assert.equal(
      value.properties
        .performsExternalAction.const,
      false,
    );
  },
);

test(
  'protocol json files are parseable strict objects',
  () => {
    for (const name of [
      'computer-task.schema.json',
      'computer-permission-grant.schema.json',
      'computer-agent-event.schema.json',
      'durable-task-event.schema.json',
    ]) {
      const value = schema(name);

      assert.equal(
        value.type,
        'object',
      );
      assert.equal(
        typeof value.$schema,
        'string',
      );
    }
  },
);

test(
  'permission schema exposes bounded opaque secret reference scope',
  () => {
    const grant =
      schema(
        'computer-permission-grant.schema.json',
      );
    const secretRefs =
      grant.properties
        .scope.properties
        .secretRefs;

    assert.equal(
      secretRefs.type,
      'array',
    );
    assert.equal(
      secretRefs.maxItems,
      64,
    );
    assert.equal(
      secretRefs.uniqueItems,
      true,
    );
    assert.match(
      'secret_ref_0123456789abcdef',
      new RegExp(
        secretRefs.items.pattern,
      ),
    );
    assert.equal(
      new RegExp(
        secretRefs.items.pattern,
      ).test('plaintext-secret'),
      false,
    );
  },
);

test(
  'permission schema exposes opaque process reference scope',
  () => {
    const grant =
      schema(
        'computer-permission-grant.schema.json',
      );
    const processRefs =
      grant.properties
        .scope.properties
        .processRefs;

    assert.equal(
      processRefs.type,
      'array',
    );
    assert.equal(
      processRefs.maxItems,
      128,
    );
    assert.equal(
      processRefs.uniqueItems,
      true,
    );
    assert.match(
      'proc_0123456789abcdef',
      new RegExp(
        processRefs.items.pattern,
      ),
    );
  },
);

test(
  'permission schema scopes sensitive surfaces settings and admin actions',
  () => {
    const grant =
      schema(
        'computer-permission-grant.schema.json',
      );
    const scope =
      grant.properties
        .scope.properties;

    for (const [
      key,
      sample,
    ] of [
      [
        'surfaceRefs',
        'surface_0123456789abcdef',
      ],
      [
        'settingIds',
        'setting_audio.volume',
      ],
      [
        'adminActionIds',
        'admin_service.restart',
      ],
    ]) {
      const descriptor = scope[key];

      assert.equal(
        descriptor.type,
        'array',
      );
      assert.equal(
        descriptor.uniqueItems,
        true,
      );
      assert.equal(
        new RegExp(
          descriptor.items.pattern,
        ).test(sample),
        true,
      );
    }
  },
);
