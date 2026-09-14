import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  filterConversationRecords,
  hasConversationSearchQuery,
  sortConversationRecords,
} = loadTypeScriptModule(
  'src/features/conversations/conversationListPolicy.ts',
);

const records = [
  {
    id: 'active-recent',
    title: 'Project Alpha',
    createdAt: 100,
    updatedAt: 500,
    isArchived: false,
    isPinned: false,
  },
  {
    id: 'active-pinned',
    title: 'محادثة عربية',
    createdAt: 200,
    updatedAt: 300,
    isArchived: false,
    isPinned: true,
  },
  {
    id: 'archived',
    title: 'Archived Notes',
    createdAt: 50,
    updatedAt: 700,
    isArchived: true,
    isPinned: false,
  },
];

test(
  'conversation list policy separates active and archived records',
  () => {
    assert.deepEqual(
      filterConversationRecords(
        records,
        'active',
        '',
      ).map((item) => item.id),
      ['active-recent', 'active-pinned'],
    );

    assert.deepEqual(
      filterConversationRecords(
        records,
        'archived',
        '',
      ).map((item) => item.id),
      ['archived'],
    );
  },
);

test(
  'conversation search is trimmed case insensitive and unicode safe',
  () => {
    assert.deepEqual(
      filterConversationRecords(
        records,
        'active',
        '  ALPHA  ',
      ).map((item) => item.id),
      ['active-recent'],
    );

    assert.deepEqual(
      filterConversationRecords(
        records,
        'active',
        'عربية',
      ).map((item) => item.id),
      ['active-pinned'],
    );

    assert.equal(
      hasConversationSearchQuery('   '),
      false,
    );
    assert.equal(
      hasConversationSearchQuery(' notes '),
      true,
    );
  },
);

test(
  'conversation sorting keeps pinned records first then newest and never mutates input',
  () => {
    const input = [
      records[0],
      records[1],
      records[2],
    ];
    const snapshot = [...input];

    const sorted = sortConversationRecords(input);

    assert.deepEqual(
      sorted.map((item) => item.id),
      [
        'active-pinned',
        'archived',
        'active-recent',
      ],
    );
    assert.deepEqual(input, snapshot);
    assert.notEqual(sorted, input);
  },
);
