import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  AttachmentCleanupService,
} = loadTypeScriptModule(
  'src/features/attachments/AttachmentCleanupService.ts',
);

function attachment(id, localUri) {
  return {
    id,
    kind: 'document',
    source: 'document',
    name: `${id}.txt`,
    mimeType: 'text/plain',
    sizeBytes: 10,
    localUri,
    width: null,
    height: null,
    durationMs: null,
    createdAt: 1,
  };
}

test(
  'orphan cleanup operates only on repository-reported orphans',
  async () => {
    const deletedRecords = [];
    const deletedFiles = [];
    const orphans = [
      attachment(
        'attachment-1760000000000-ab12cd34',
        'file:///managed/orphan-a.txt',
      ),
      attachment(
        'attachment-1760000000001-bc23de45',
        'file:///managed/orphan-b.txt',
      ),
    ];

    const repository = {
      listOrphans: async () => orphans,
      delete: async (id) => {
        deletedRecords.push(id);
      },
    };

    const fileStore = {
      exists: () => true,
      delete: (uri) => {
        deletedFiles.push(uri);
      },
    };

    const service =
      new AttachmentCleanupService(
        repository,
        fileStore,
      );

    assert.equal(
      await service.cleanupOrphans(),
      2,
    );

    assert.deepEqual(
      deletedRecords,
      orphans.map((item) => item.id),
    );
    assert.deepEqual(
      deletedFiles,
      orphans.map((item) => item.localUri),
    );
  },
);

test(
  'orphan cleanup continues after one orphan fails and counts only successful cleanup',
  async () => {
    const first = attachment(
      'attachment-1760000000000-ab12cd34',
      'file:///managed/failing.txt',
    );
    const second = attachment(
      'attachment-1760000000001-bc23de45',
      'file:///managed/good.txt',
    );
    const deletedRecords = [];

    const repository = {
      listOrphans: async () => [first, second],
      delete: async (id) => {
        if (id === first.id) {
          throw new Error('simulated database failure');
        }
        deletedRecords.push(id);
      },
    };

    const fileStore = {
      exists: () => false,
      delete: () => {
        throw new Error('delete must not run when file does not exist');
      },
    };

    const service =
      new AttachmentCleanupService(
        repository,
        fileStore,
      );

    assert.equal(
      await service.cleanupOrphans(),
      1,
    );
    assert.deepEqual(
      deletedRecords,
      [second.id],
    );
  },
);
