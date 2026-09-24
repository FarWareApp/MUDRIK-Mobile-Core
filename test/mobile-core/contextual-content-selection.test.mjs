import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const selectionModule =
  loadTypeScriptModule(
    'src/core/orchestration/contextualContentSelection.ts',
  );

function candidate(
  contentRef,
  overrides = {},
) {
  return {
    contentRef,
    available: true,
    requiresPurchase: false,
    requiresAccountChange: false,
    categoryAllowed: true,
    currentSessionMatch: false,
    temporaryModeMatch: false,
    savedFavorite: false,
    recentPositiveChoice: false,
    ambientContextMatch: false,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    explicitContentRef: null,
    allowAutomaticSelection: true,
    favoritesOnly: false,
    candidates: [
      candidate(
        'content_track_01',
      ),
    ],
    ...overrides,
  };
}

test(
  'explicit content beats contextual ranking when eligible',
  () => {
    const decision =
      selectionModule
        .selectContextualContent(
          input({
            explicitContentRef:
              'content_track_02',
            candidates: [
              candidate(
                'content_track_01',
                {
                  currentSessionMatch:
                    true,
                  savedFavorite: true,
                },
              ),
              candidate(
                'content_track_02',
              ),
            ],
          }),
        );

    assert.equal(
      decision.selectedContentRef,
      'content_track_02',
    );
    assert.equal(
      decision.reason,
      'explicit_selected',
    );
  },
);

test(
  'context ranking follows session temporary mode favorites recent choices then ambient signal',
  () => {
    const candidates = [
      candidate(
        'content_ambient_01',
        {
          ambientContextMatch:
            true,
        },
      ),
      candidate(
        'content_recent_01',
        {
          recentPositiveChoice:
            true,
        },
      ),
      candidate(
        'content_favorite_01',
        {
          savedFavorite: true,
        },
      ),
      candidate(
        'content_mode_01',
        {
          temporaryModeMatch:
            true,
        },
      ),
      candidate(
        'content_session_01',
        {
          currentSessionMatch:
            true,
        },
      ),
    ];

    for (const ordered of [
      candidates,
      [...candidates].reverse(),
    ]) {
      const decision =
        selectionModule
          .selectContextualContent(
            input({
              candidates: ordered,
            }),
          );

      assert.equal(
        decision.selectedContentRef,
        'content_session_01',
      );
      assert.equal(
        decision.reason,
        'context_selected',
      );
    }
  },
);

test(
  'ambient context never becomes emotion authority or long term preference mutation',
  () => {
    const decision =
      selectionModule
        .selectContextualContent(
          input({
            candidates: [
              candidate(
                'content_track_01',
                {
                  ambientContextMatch:
                    true,
                },
              ),
            ],
          }),
        );

    assert.equal(
      decision.assertsEmotion,
      false,
    );
    assert.equal(
      decision.updatesLongTermPreference,
      false,
    );
    assert.equal(
      decision.grantsAuthority,
      false,
    );
  },
);

test(
  'automatic selection excludes purchase account change unavailable and disallowed content',
  () => {
    const decision =
      selectionModule
        .selectContextualContent(
          input({
            candidates: [
              candidate(
                'content_paid_01',
                {
                  requiresPurchase:
                    true,
                  currentSessionMatch:
                    true,
                },
              ),
              candidate(
                'content_account_01',
                {
                  requiresAccountChange:
                    true,
                  currentSessionMatch:
                    true,
                },
              ),
              candidate(
                'content_unavailable_01',
                {
                  available: false,
                  currentSessionMatch:
                    true,
                },
              ),
              candidate(
                'content_blocked_01',
                {
                  categoryAllowed:
                    false,
                  currentSessionMatch:
                    true,
                },
              ),
              candidate(
                'content_safe_01',
                {
                  savedFavorite:
                    true,
                },
              ),
            ],
          }),
        );

    assert.equal(
      decision.selectedContentRef,
      'content_safe_01',
    );
  },
);

test(
  'explicit paid or account-changing content is blocked instead of silently executing',
  () => {
    for (const blocked of [
      candidate(
        'content_paid_01',
        {
          requiresPurchase: true,
        },
      ),
      candidate(
        'content_account_01',
        {
          requiresAccountChange:
            true,
        },
      ),
    ]) {
      const decision =
        selectionModule
          .selectContextualContent(
            input({
              explicitContentRef:
                blocked.contentRef,
              candidates: [
                blocked,
              ],
            }),
          );

      assert.equal(
        decision.selectedContentRef,
        null,
      );
      assert.equal(
        decision.reason,
        'explicit_content_blocked',
      );
    }
  },
);

test(
  'equal contextual candidates require clarification independent of ordering',
  () => {
    const a = candidate(
      'content_track_01',
      {
        savedFavorite: true,
      },
    );
    const b = candidate(
      'content_track_02',
      {
        savedFavorite: true,
      },
    );

    for (const candidates of [
      [a, b],
      [b, a],
    ]) {
      const decision =
        selectionModule
          .selectContextualContent(
            input({
              candidates,
            }),
          );

      assert.equal(
        decision.selectedContentRef,
        null,
      );
      assert.equal(
        decision.reason,
        'clarification_required',
      );
    }
  },
);

test(
  'user can disable automatic choice or restrict selection to favorites',
  () => {
    assert.equal(
      selectionModule
        .selectContextualContent(
          input({
            allowAutomaticSelection:
              false,
          }),
        ).reason,
      'clarification_required',
    );

    const favoritesOnly =
      selectionModule
        .selectContextualContent(
          input({
            favoritesOnly: true,
            candidates: [
              candidate(
                'content_recent_01',
                {
                  recentPositiveChoice:
                    true,
                },
              ),
              candidate(
                'content_favorite_01',
                {
                  savedFavorite: true,
                },
              ),
            ],
          }),
        );

    assert.equal(
      favoritesOnly
        .selectedContentRef,
      'content_favorite_01',
    );
  },
);

test(
  'hidden fields credential shaped refs and duplicate content fail closed',
  () => {
    for (const invalid of [
      {
        ...input(),
        inferredEmotion: 'happy',
      },
      input({
        candidates: [
          {
            ...candidate(
              'content_track_01',
            ),
            token: 'forbidden',
          },
        ],
      }),
      input({
        candidates: [
          candidate(
            'content_token_secret',
          ),
        ],
      }),
      input({
        candidates: [
          candidate(
            'content_track_01',
          ),
          candidate(
            'content_track_01',
          ),
        ],
      }),
    ]) {
      assert.equal(
        selectionModule
          .selectContextualContent(
            invalid,
          ).reason,
        'invalid_input',
      );
    }
  },
);
