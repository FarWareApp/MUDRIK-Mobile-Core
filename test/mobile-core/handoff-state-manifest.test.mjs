import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseHandoffStateManifest,
} = loadTypeScriptModule(
  'src/core/presence/handoffStateManifest.ts',
);

const SOURCE = 'surf_aaaaaaaaaaaaaaaa';
const TARGET = 'surf_bbbbbbbbbbbbbbbb';
const SESSION = 'psess_aaaaaaaaaaaaaaaa';

function manifest(overrides = {}) {
  return {
    presenceSessionId: SESSION,
    sourceSurfaceId: SOURCE,
    targetSurfaceId: TARGET,
    generation: 1,
    companionId: 'companion_primary',
    companionProfileRevision: 4,
    conversationRef: 'conversation.current',
    shortTermContextRef: 'context.current',
    activeTaskRef: null,
    mediaContextRef: null,
    pendingApprovalRefs: [
      'approval.one',
    ],
    privacyState: 'privacy_lock',
    createdAt: 2_000,
    ...overrides,
  };
}

test(
  'handoff manifest carries references and preserves privacy without inherited authority',
  () => {
    const parsed =
      parseHandoffStateManifest(
        manifest(),
      );

    assert.ok(parsed);
    assert.equal(
      parsed.privacyState,
      'privacy_lock',
    );
    assert.equal(
      parsed.grantsInheritedAuthority,
      false,
    );
    assert.equal(
      parsed.conversationRef,
      'conversation.current',
    );
  },
);

test(
  'handoff manifest rejects same source and target or generation zero',
  () => {
    assert.equal(
      parseHandoffStateManifest(
        manifest({
          targetSurfaceId: SOURCE,
        }),
      ),
      null,
    );

    assert.equal(
      parseHandoffStateManifest(
        manifest({
          generation: 0,
        }),
      ),
      null,
    );
  },
);

test(
  'handoff manifest rejects raw content shaped references and duplicate approval refs',
  () => {
    assert.equal(
      parseHandoffStateManifest(
        manifest({
          conversationRef:
            'contains spaces and raw text',
        }),
      ),
      null,
    );

    assert.equal(
      parseHandoffStateManifest(
        manifest({
          pendingApprovalRefs: [
            'approval.one',
            'approval.one',
          ],
        }),
      ),
      null,
    );
  },
);

test(
  'handoff manifest rejects hidden permission fields',
  () => {
    assert.equal(
      parseHandoffStateManifest({
        ...manifest(),
        permissions: ['all'],
      }),
      null,
    );
  },
);


test(
  'handoff manifest rejects credential-shaped references',
  () => {
    for (const credentialRef of [
      'token.secret-value',
      'api_key.secret-value',
      'ghp.secret-value',
    ]) {
      assert.equal(
        parseHandoffStateManifest(
          manifest({
            conversationRef:
              credentialRef,
          }),
        ),
        null,
      );
    }
  },
);
