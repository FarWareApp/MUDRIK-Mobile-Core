import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  sanitizeDiagnosticText,
} = loadTypeScriptModule(
  'src/core/diagnostics/sanitizeDiagnosticText.ts',
);

const {
  normalizeProjectId,
} = loadTypeScriptModule(
  'src/features/projects/ProjectId.ts',
);

const {
  isManagedAttachmentId,
  isManagedAttachmentUri,
} = loadTypeScriptModule(
  'src/features/attachments/ManagedAttachmentUri.ts',
);

const {
  createDraftPersistenceRepository,
} = loadTypeScriptModule(
  'src/features/chat/DraftPersistencePolicy.ts',
);

const {
  resolveNotificationRoute,
} = loadTypeScriptModule(
  'src/features/notifications/resolveNotificationRoute.ts',
);

const {
  MockMessageTransport,
} = loadTypeScriptModule(
  'src/mocks/MockMessageTransport.ts',
);

const {
  TransportCancelledError,
} = loadTypeScriptModule(
  'src/contracts/TransportCancelledError.ts',
);

const {
  SQLiteMessageRepository,
} = loadTypeScriptModule(
  'src/features/chat/storage/SQLiteMessageRepository.ts',
);

const {
  SQLiteSettingsRepository,
} = loadTypeScriptModule(
  'src/features/settings/storage/SQLiteSettingsRepository.ts',
);

test(
  'diagnostics redact common credentials and sensitive context',
  () => {
    const githubClassic =
      'g' + 'hp_' + 'A'.repeat(32);
    const githubFineGrained =
      'github' + '_pat_' + 'B'.repeat(32);
    const openAi =
      's' + 'k-' + 'C'.repeat(32);
    const google =
      'AI' + 'za' + 'D'.repeat(32);
    const aws =
      'AK' + 'IA' + 'E'.repeat(16);
    const slack =
      'xox' + 'b-' + 'F'.repeat(24);
    const jwt = [
      'eyJ' + 'G'.repeat(12),
      'H'.repeat(16),
      'I'.repeat(16),
    ].join('.');

    const raw = [
      'user@example.com',
      `Bearer ${'J'.repeat(32)}`,
      githubClassic,
      githubFineGrained,
      openAi,
      google,
      aws,
      slack,
      jwt,
      `password=${'K'.repeat(16)}`,
      '/home/user/private/file.txt',
      'https://example.com/path?token=secret',
    ].join(' ');

    const sanitized =
      sanitizeDiagnosticText(raw);

    for (const secret of [
      'user@example.com',
      githubClassic,
      githubFineGrained,
      openAi,
      google,
      aws,
      slack,
      jwt,
      'K'.repeat(16),
      '/home/user/private/file.txt',
      'token=secret',
    ]) {
      assert.equal(
        sanitized.includes(secret),
        false,
      );
    }

    assert.match(
      sanitized,
      /\[redacted-/,
    );
    assert.ok(
      sanitized.length <= 500,
    );
  },
);

test(
  'project IDs accept only the internal MUDRIK project format',
  () => {
    const valid =
      'project-1760000000000-ab12cd34';

    assert.equal(
      normalizeProjectId(`  ${valid}  `),
      valid,
    );

    for (const invalid of [
      '',
      '../settings',
      'project/1760000000000/ab12cd34',
      'PROJECT-1760000000000-ab12cd34',
      'project-abc-ab12cd34',
      'project-1760000000000-../../etc',
      'project-1760000000000-ab12 cd34',
      'x'.repeat(200),
    ]) {
      assert.equal(
        normalizeProjectId(invalid),
        null,
      );
    }
  },
);

test(
  'notification navigation accepts only known routes and validated project IDs',
  () => {
    assert.deepEqual(
      resolveNotificationRoute({
        target: 'settings',
      }),
      {
        kind: 'path',
        target: 'settings',
        path: '/settings',
      },
    );

    assert.deepEqual(
      resolveNotificationRoute({
        target: 'project',
        projectId:
          'project-1760000000000-ab12cd34',
      }),
      {
        kind: 'project',
        target: 'project',
        projectId:
          'project-1760000000000-ab12cd34',
      },
    );

    for (const invalid of [
      null,
      [],
      {},
      { target: '../settings' },
      { target: 'admin' },
      {
        target: 'project',
        projectId: '../settings',
      },
      {
        target: 'project',
        projectId:
          'project-1760000000000-../../db',
      },
    ]) {
      assert.equal(
        resolveNotificationRoute(invalid),
        null,
      );
    }
  },
);

test(
  'attachment storage accepts only generated IDs and direct managed child files',
  () => {
    const id =
      'attachment-1760000000000-ab12cd34';
    const directory =
      'file:///data/user/0/app/files/mudrik/attachments/';

    assert.equal(
      isManagedAttachmentId(id),
      true,
    );
    assert.equal(
      isManagedAttachmentUri(
        `${directory}${id}.jpg`,
        directory,
      ),
      true,
    );

    for (const invalidId of [
      '../settings',
      'attachment-bad-id',
      'attachment-1760000000000-../../db',
    ]) {
      assert.equal(
        isManagedAttachmentId(
          invalidId,
        ),
        false,
      );
    }

    for (const invalidUri of [
      'file:///data/user/0/app/files/database.db',
      `${directory}../database.db`,
      `${directory}${id}/nested.jpg`,
      `${directory}${id}%2Fhidden.jpg`,
      `${directory}not-an-attachment.jpg`,
    ]) {
      assert.equal(
        isManagedAttachmentUri(
          invalidUri,
          directory,
        ),
        false,
      );
    }
  },
);

test(
  'Save Text Drafts off clears old text and refuses new persistence',
  async () => {
    const calls = [];
    const stored = {
      conversationId: 'conversation-1',
      text: 'private draft',
      updatedAt: 1,
    };

    const repository = {
      get: async (conversationId) => {
        calls.push(['get', conversationId]);
        return stored;
      },
      save: async (draft) => {
        calls.push(['save', draft]);
      },
      clear: async (conversationId) => {
        calls.push(['clear', conversationId]);
      },
    };

    const disabled =
      createDraftPersistenceRepository(
        false,
        repository,
      );

    assert.equal(
      await disabled.get('conversation-1'),
      null,
    );

    await disabled.save({
      conversationId: 'conversation-1',
      text: 'must not persist',
      updatedAt: 2,
    });

    await disabled.clear('conversation-1');

    assert.deepEqual(
      calls,
      [
        ['clear', 'conversation-1'],
        ['clear', 'conversation-1'],
      ],
    );

    const enabled =
      createDraftPersistenceRepository(
        true,
        repository,
      );

    assert.equal(
      enabled,
      repository,
    );
  },
);

test(
  'message repository upserts the same logical message identity instead of inserting a second identity',
  async () => {
    const calls = [];
    const database = {
      runAsync: async (sql, params) => {
        calls.push({ sql, params });
      },
    };

    const repository =
      new SQLiteMessageRepository(
        async () => database,
      );

    const base = {
      id: 'user-1760000000000-ab12cd34',
      conversationId: 'conversation-1',
      role: 'user',
      kind: 'text',
      text: 'first attempt',
      createdAt: 1760000000000,
    };

    await repository.save(base);
    await repository.save({
      ...base,
      text: 'retry of same logical message',
    });

    assert.equal(calls.length, 2);

    for (const call of calls) {
      assert.match(
        call.sql,
        /INSERT OR REPLACE INTO messages/,
      );
      assert.equal(
        call.params[0],
        base.id,
      );
      assert.equal(
        call.params[1],
        base.conversationId,
      );
    }
  },
);

test(
  'settings reset storage operation is scoped only to app_settings',
  async () => {
    const calls = [];
    const database = {
      runAsync: async (sql, params) => {
        calls.push({ sql, params });
      },
    };

    const repository =
      new SQLiteSettingsRepository(
        async () => database,
      );

    await repository.clear();

    assert.equal(calls.length, 1);
    assert.match(
      calls[0].sql,
      /^DELETE FROM app_settings$/,
    );
    assert.equal(
      /conversations|projects|attachments|messages|drafts/.test(
        calls[0].sql,
      ),
      false,
    );
  },
);

test(
  'mock transport supports attachment-only messages',
  async () => {
    const transport =
      new MockMessageTransport();

    const task = transport.send({
      id: 'user-1',
      conversationId: 'conversation-1',
      kind: 'message',
      text: '   ',
      attachments: [
        {
          id: 'attachment-1760000000000-ab12cd34',
          kind: 'image',
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
          localUri: 'file:///managed/photo.jpg',
          width: 10,
          height: 10,
          durationMs: null,
        },
      ],
      createdAt: 1,
    });

    const output = await task.result;

    assert.equal(
      output.conversationId,
      'conversation-1',
    );
    assert.match(
      output.text,
      /Received \(1 attachment\)/,
    );
  },
);

test(
  'mock transport cancellation rejects with the dedicated cancellation error',
  async () => {
    const transport =
      new MockMessageTransport();

    const task = transport.send({
      id: 'user-2',
      conversationId: 'conversation-2',
      kind: 'message',
      text: 'cancel me',
      attachments: [],
      createdAt: 2,
    });

    task.cancel();

    await assert.rejects(
      task.result,
      (error) =>
        error instanceof
        TransportCancelledError,
    );

    task.cancel();
  },
);
