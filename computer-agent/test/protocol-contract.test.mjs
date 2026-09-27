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
