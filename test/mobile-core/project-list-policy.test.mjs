import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  filterProjectRecords,
  hasProjectSearchQuery,
  sortProjectRecords,
} = loadTypeScriptModule(
  'src/features/projects/projectListPolicy.ts',
);

const records = [
  {
    id: 'older-active',
    name: 'Alpha Workspace',
    description: 'English planning notes',
    createdAt: 1,
    updatedAt: 100,
    isArchived: false,
  },
  {
    id: 'newer-active',
    name: 'مشروع الدراسة',
    description: 'خطة عربية',
    createdAt: 2,
    updatedAt: 300,
    isArchived: false,
  },
  {
    id: 'archived',
    name: 'Archive',
    description: 'Old research workspace',
    createdAt: 3,
    updatedAt: 200,
    isArchived: true,
  },
];

test(
  'project list policy keeps active and archived views separate',
  () => {
    assert.deepEqual(
      filterProjectRecords(records, 'active', '').map((item) => item.id),
      ['older-active', 'newer-active'],
    );
    assert.deepEqual(
      filterProjectRecords(records, 'archived', '').map((item) => item.id),
      ['archived'],
    );
  },
);

test(
  'project search matches names and descriptions across Arabic and English',
  () => {
    assert.deepEqual(
      filterProjectRecords(records, 'active', 'دراسة').map((item) => item.id),
      ['newer-active'],
    );
    assert.deepEqual(
      filterProjectRecords(records, 'active', 'planning').map((item) => item.id),
      ['older-active'],
    );
    assert.deepEqual(
      filterProjectRecords(records, 'archived', 'research').map((item) => item.id),
      ['archived'],
    );
  },
);

test(
  'project search detection ignores whitespace-only queries',
  () => {
    assert.equal(hasProjectSearchQuery('   '), false);
    assert.equal(hasProjectSearchQuery(' مشروع '), true);
  },
);

test(
  'project sorting is deterministic and does not mutate input records',
  () => {
    const originalIds = records.map((item) => item.id);
    const sorted = sortProjectRecords(records);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ['newer-active', 'older-active', 'archived'],
    );
    assert.deepEqual(
      records.map((item) => item.id),
      originalIds,
    );
    assert.notEqual(sorted, records);
  },
);
