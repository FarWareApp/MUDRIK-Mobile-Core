import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  selectProjectConversations,
} = loadTypeScriptModule(
  'src/features/projects/projectConversationPolicy.ts',
);

const conversations = [
  {
    id: 'active-new',
    title: 'Active new',
    createdAt: 1,
    updatedAt: 400,
    isArchived: false,
    isPinned: false,
  },
  {
    id: 'archived-linked',
    title: 'Archived linked',
    createdAt: 2,
    updatedAt: 200,
    isArchived: true,
    isPinned: false,
  },
  {
    id: 'active-linked',
    title: 'Active linked',
    createdAt: 3,
    updatedAt: 100,
    isArchived: false,
    isPinned: false,
  },
  {
    id: 'archived-unlinked',
    title: 'Archived unlinked',
    createdAt: 4,
    updatedAt: 500,
    isArchived: true,
    isPinned: false,
  },
];

test(
  'project conversation policy keeps linked archived conversations manageable',
  () => {
    const selected = selectProjectConversations(
      conversations,
      ['archived-linked', 'active-linked'],
    );

    assert.deepEqual(
      selected.map((item) => item.id),
      [
        'archived-linked',
        'active-linked',
        'active-new',
      ],
    );
    assert.equal(
      selected.some((item) => item.id === 'archived-unlinked'),
      false,
    );
  },
);

test(
  'project conversation policy keeps active unlinked conversations available',
  () => {
    const selected = selectProjectConversations(
      conversations,
      [],
    );

    assert.deepEqual(
      selected.map((item) => item.id),
      ['active-new', 'active-linked'],
    );
  },
);
