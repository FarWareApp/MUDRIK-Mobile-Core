import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  SQLiteAttachmentRepository,
} = loadTypeScriptModule(
  'src/features/attachments/storage/SQLiteAttachmentRepository.ts',
);

test(
  'orphan query excludes message draft and project attachment links',
  async () => {
    const queries = [];
    const database = {
      getAllAsync: async (sql) => {
        queries.push(sql);
        return [];
      },
    };

    const repository =
      new SQLiteAttachmentRepository(
        async () => database,
      );

    assert.deepEqual(
      await repository.listOrphans(),
      [],
    );
    assert.equal(queries.length, 1);

    const normalized =
      queries[0].replace(/\s+/g, ' ');

    for (const table of [
      'message_attachments',
      'draft_attachments',
      'project_attachments',
    ]) {
      assert.match(
        normalized,
        new RegExp(`LEFT JOIN ${table}`),
      );
    }

    assert.match(
      normalized,
      /ma\.attachment_id IS NULL/,
    );
    assert.match(
      normalized,
      /da\.attachment_id IS NULL/,
    );
    assert.match(
      normalized,
      /pa\.attachment_id IS NULL/,
    );
  },
);
