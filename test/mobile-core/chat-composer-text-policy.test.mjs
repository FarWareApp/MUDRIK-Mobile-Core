import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  MAX_MESSAGE_TEXT_LENGTH,
  MESSAGE_TEXT_COUNTER_REMAINING_THRESHOLD,
  isMessageTextWithinLimit,
  shouldShowMessageTextCounter,
} = loadTypeScriptModule(
  'src/features/chat/messageTextPolicy.ts',
);

test(
  'message text limit policy keeps the composer and send eligibility on one boundary',
  () => {
    assert.equal(MAX_MESSAGE_TEXT_LENGTH, 12_000);
    assert.equal(
      MESSAGE_TEXT_COUNTER_REMAINING_THRESHOLD,
      1_000,
    );

    assert.equal(
      isMessageTextWithinLimit(
        'x'.repeat(MAX_MESSAGE_TEXT_LENGTH),
      ),
      true,
    );
    assert.equal(
      isMessageTextWithinLimit(
        'x'.repeat(MAX_MESSAGE_TEXT_LENGTH + 1),
      ),
      false,
    );
  },
);

test(
  'message length counter appears only in the near-limit range and remains visible over the limit',
  () => {
    const firstVisibleLength =
      MAX_MESSAGE_TEXT_LENGTH
      - MESSAGE_TEXT_COUNTER_REMAINING_THRESHOLD;

    assert.equal(
      shouldShowMessageTextCounter(
        'x'.repeat(firstVisibleLength - 1),
      ),
      false,
    );
    assert.equal(
      shouldShowMessageTextCounter(
        'x'.repeat(firstVisibleLength),
      ),
      true,
    );
    assert.equal(
      shouldShowMessageTextCounter(
        'x'.repeat(MAX_MESSAGE_TEXT_LENGTH + 1),
      ),
      true,
    );
  },
);
