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
