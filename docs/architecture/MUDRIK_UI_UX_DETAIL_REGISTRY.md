# MUDRIK UI/UX Detail Registry

## Purpose

This document is the authoritative registry for user-visible and interaction-level details in MUDRIK. It exists so that small visual, behavioral and accessibility details are not lost while larger architecture, security, voice, agent and AI work progresses.

A UI detail is not considered "minor" merely because it is small. Composer geometry, attachment icons, message timestamps, bubble spacing, loading states, safe-area behavior, RTL/LTR direction, pressed/disabled states, attachment previews, keyboard behavior and similar details are part of the product contract.

This registry supplements the 20-section execution plan. It does not change the active section order. UI changes may be documented here while another section is active, but implementation must still follow the current section/scope rules unless a narrow exception is recorded.

## Non-Negotiable Preservation Rule

No user-visible detail may be silently dropped, replaced or materially changed during refactoring.

Every user-visible component must have:

1. an identifiable component/surface;
2. a known current behavior;
3. an intended behavior;
4. a tracked status;
5. acceptance criteria;
6. verification before the relevant section closes.

If current code and intended design differ, the difference must remain visible in this registry until resolved. A refactor is not allowed to erase a detail simply because a different implementation is easier.

## Status Vocabulary

Each tracked detail may use one of these states:

- `CURRENT` — exists in the current implementation and is accepted as the present baseline;
- `INTENDED` — required product behavior/design that must be implemented;
- `MISSING` — required detail is absent from current implementation;
- `PARTIAL` — some layers exist but the user-visible behavior is incomplete;
- `DEFERRED` — deliberately postponed to its correct section, not forgotten;
- `VERIFY` — implemented but still needs visual/physical/accessibility verification;
- `VERIFIED` — implementation and applicable validation evidence agree.

`DEFERRED` never means optional.

---

# 1. Global UI Contract

## 1.1 Visual Identity

Track and preserve:

- dark/light theme behavior where supported;
- the intended lightweight dark MUDRIK appearance;
- theme tokens rather than scattered arbitrary visual constants where practical;
- spacing rhythm;
- corner-radius system;
- elevation/surface hierarchy;
- text-primary/text-secondary contrast;
- accent color behavior;
- disabled-state contrast;
- selection/highlight states;
- focus-visible behavior where the platform supports it;
- visual consistency across Mobile and future Web control surfaces without forcing identical platform-native interactions.

## 1.2 Layout Safety

Every screen must verify:

- safe-area top/bottom insets;
- status bar overlap;
- gesture/navigation bar overlap;
- keyboard opening/closing;
- keyboard resize/pan behavior;
- composer remaining reachable when keyboard is open;
- orientation changes where supported;
- compact and large phone widths;
- long text and large accessibility font sizes;
- no important control hidden behind floating controls;
- no accidental horizontal scrolling.

## 1.3 RTL/LTR and Mixed Language

Arabic/German/English and mixed text are first-class requirements.

Verify:

- screen direction where applicable;
- per-message text direction based on content;
- input text direction;
- punctuation behavior;
- numbers/timestamps inside Arabic UI;
- URLs, code, email addresses and filenames inside RTL contexts;
- icon meaning does not reverse incorrectly;
- attachment metadata remains readable in RTL;
- mixed Arabic + English/German messages do not become visually broken.

## 1.4 Motion

Every animation must:

- remain subtle;
- avoid blocking input;
- respect Reduced Motion;
- have a static fallback;
- never represent a security/privacy state change before the underlying state has actually changed.

## 1.5 Accessibility

For every interactive control track:

- accessibility role;
- accessible label;
- disabled state;
- selected/expanded state where relevant;
- logical focus order;
- minimum comfortable touch target;
- screen-reader usability;
- sufficient contrast;
- no meaning conveyed by color alone;
- dynamic text behavior where supported.

---

# 2. Chat Screen — Authoritative Detail Inventory

Current implementation root:

- `src/features/chat/ChatScreen.tsx`
- `src/features/chat/components/MessageComposer.tsx`
- `src/features/chat/components/MessageBubble.tsx`
- `src/features/chat/components/MessageList.tsx`
- `src/features/chat/components/MessageAttachmentList.tsx`
- `src/features/attachments/components/AttachmentDraftTray.tsx`

The Chat UI must remain source-agnostic: UI renders messages and interaction state without knowing whether the response came from local logic, AI, server, tool execution or another approved source.

## 2.1 Composer / Text Entry Box

### Current baseline

Current `MessageComposer` uses:

- outer wrapper with horizontal `spacing.md`;
- top/bottom `spacing.sm`;
- hairline top border;
- composer `minHeight: 56`;
- composer `maxHeight: 160`;
- row layout aligned to bottom;
- 1 px border;
- `radius.xl` rounded container;
- 5 px inner padding;
- text input `minHeight: 44`;
- text input `maxHeight: 140`;
- horizontal input padding 8;
- top padding 10;
- bottom padding 9;
- font size 16;
- multiline input;
- `maxLength: 12000`;
- automatic writing direction;
- locale-aware left/right text alignment;
- sending state currently disables editing.

Status: `CURRENT`.

### Composer details that must never be forgotten

Track all of the following independently:

- overall rounded shape;
- exact vertical placement above bottom safe area;
- border visibility;
- background surface;
- placeholder text and localization;
- placeholder color;
- text color;
- text font/size/line height;
- cursor visibility/color if customized later;
- multiline growth behavior;
- min/max height;
- scroll behavior once max height is reached;
- draft persistence behavior;
- empty/whitespace behavior;
- attachment-only send behavior;
- keyboard submit/newline rules;
- focus behavior after send;
- focus behavior after opening/closing attachment picker;
- focus behavior after returning from Voice;
- disabled state while sending, if that remains the final UX decision;
- long pasted text;
- emoji;
- Arabic/German/English/code/URL mixed input;
- selection/copy/paste;
- accessibility labels;
- touch targets around composer controls.

## 2.2 Attachment Control / Paperclip

### Product intent

The attachment affordance must be represented as a clear **paperclip / attachment control (`📎` concept)**, not forgotten during later UI work.

Status: `INTENDED`.

### Current difference

Current `MessageComposer` renders a full-width plus glyph `＋` for attachments.

Status of the icon itself: `MISSING` relative to intended paperclip presentation.

This difference is deliberately recorded rather than silently changed during Section 04.

### Attachment action surface

Current attachment menu offers:

- Camera;
- Photos & Videos;
- Files;
- Cancel.

Status: `CURRENT`, but final visual presentation remains `VERIFY`.

The attachment flow must eventually verify:

- camera capture;
- photo selection;
- video selection;
- document/file selection;
- multiple attachments where supported;
- cancellation at every picker stage;
- denied permission;
- permanently denied permission;
- picker unavailable;
- import/copy failure;
- duplicate filename;
- large file;
- unsupported media;
- corrupt media;
- missing local file after restart;
- attachment removal before send;
- attachment-only message;
- text + attachment message;
- retry after send failure;
- attachment draft survives/reloads according to the intended policy;
- privacy and permission controls remain authoritative.

## 2.3 Attachment Draft Tray

The pre-send attachment tray is a required chat detail and must not disappear in refactors.

Track:

- attachment thumbnail/card;
- filename;
- file type;
- file size where available;
- image preview;
- video identification;
- document identification;
- remove control;
- busy/importing state;
- import error;
- layout with one attachment;
- layout with many attachments;
- horizontal/vertical overflow behavior;
- RTL/LTR;
- keyboard + tray + composer coexistence;
- accessibility labels.

Status: `CURRENT/PARTIAL`, final visual/device verification deferred.

## 2.4 Voice Control in Composer

Current composer includes a voice control represented by `◉` and routes to `/voice`.

Track:

- final microphone/voice icon;
- pressed/disabled state;
- transition to voice screen;
- return to the same draft/conversation;
- preservation of attachments;
- no accidental send;
- permission denial behavior;
- accessibility label;
- RTL-safe position;
- future distinction between one-shot recording and live voice chat.

Status: `CURRENT/PARTIAL`.

## 2.5 Send / Stop Control

Current behavior:

- 44 x 44 send button;
- circular radius 22;
- `↑` send glyph;
- disabled surface when there is no text/attachment;
- when sending, control becomes Stop with a square icon;
- attachment-only messages can be sent;
- sending state currently disables composer side controls/input.

Status: `CURRENT`.

Must verify later:

- send pressed state;
- duplicate-tap protection;
- slow transport;
- immediate cancel;
- cancel-after-response-start;
- retry;
- offline handling;
- accessibility announcement for sending/stopped/failed;
- no stale disabled state after failure;
- no duplicate logical message identity.

## 2.6 Message Bubbles

### Current baseline

Current `MessageBubble` uses:

- maximum width `86%`;
- horizontal padding `spacing.lg`;
- vertical padding `spacing.md`;
- radius `radius.lg`;
- vertical margin `spacing.xs`;
- user message aligned to `flex-end`;
- assistant message aligned to `flex-start`;
- user bubble uses accent surface;
- assistant bubble uses elevated surface;
- text selectable;
- font size 16;
- line height 23;
- per-message direction resolved from the message content.

Status: `CURRENT`.

### Bubble details that must remain tracked

- user vs assistant visual distinction;
- text padding;
- attachment + text spacing;
- image-only bubble behavior;
- attachment-only bubble behavior;
- very short messages;
- very long messages;
- code/URL wrapping;
- selection/copy;
- long-press actions when introduced;
- reply/edit/delete/copy/share affordances only if/when formally designed;
- message grouping spacing;
- first/last bubble corner variants if introduced;
- consecutive messages from the same role;
- RTL/LTR placement;
- accessibility reading order.

## 2.7 Message Timestamp

`ChatMessage` already carries `createdAt`.

Current `MessageBubble` does **not** render the timestamp.

Required: visible message timing must not be forgotten.

Status: `MISSING / INTENDED`.

Final timestamp design must define and verify:

- whether time is always visible or appears contextually;
- hour/minute format using locale preferences;
- 12/24-hour behavior according to product/platform locale policy;
- date separators for older messages;
- timezone handling;
- daylight-saving transitions;
- device clock changes;
- messages restored after restart;
- RTL placement;
- contrast and size;
- accessibility reading without excessive verbosity.

The exact final visual style may be chosen in the relevant UI pass, but timestamp presence and correctness are mandatory acceptance items.

## 2.8 Message Delivery / Execution State

Do not conflate a timestamp with message state.

Track separately:

- local draft;
- queued/pending where applicable;
- sending;
- sent/persisted;
- generating/working;
- cancelled;
- failed;
- retryable failure;
- attachment import failure;
- offline waiting if that behavior is later enabled.

The UI must never display a success state before the corresponding repository/transport contract proves it.

Status: `PARTIAL`.

## 2.9 Attachment Rendering Inside Messages

Current behavior:

- images render at 220 x 180 with radius 14;
- unavailable attachments render a fallback card;
- video cards show a play symbol;
- document cards show a document symbol;
- file card min width 210 / max width 260;
- file card min height 58;
- filename is single-line;
- file size is shown when available;
- unavailable file text currently says `Unavailable on this device`.

Status: `CURRENT/PARTIAL`.

Must verify:

- image aspect ratios;
- portrait/landscape media;
- video thumbnail and playback entry;
- document open/share flow when introduced;
- missing files;
- corrupted files;
- filename truncation;
- extension visibility;
- large sizes;
- mixed attachment sets;
- attachment accessibility;
- localization of unavailable/error text;
- privacy when files are no longer present on the device.

## 2.10 Message List

Track:

- initial scroll position;
- scroll to newest message;
- behavior while response is arriving;
- no forced jump when user intentionally scrolls upward;
- loading older history;
- conversation switch;
- keyboard interactions;
- empty state;
- very long conversations;
- memory/performance;
- attachment-heavy threads;
- date separators;
- floating action controls not obscuring messages;
- RTL/LTR.

Status: `CURRENT/PARTIAL`.

## 2.11 Sending / Thinking Indicator

The current chat has `SendingIndicator` while a send is active.

Track:

- exact placement;
- wording/animation;
- Reduced Motion fallback;
- no false implication that an AI provider is necessarily the source;
- stop/cancel coordination;
- disappearance on success/failure/cancel;
- accessibility announcement without repetitive screen-reader noise.

Status: `CURRENT/VERIFY`.

## 2.12 Chat Errors

Current Chat uses `ChatErrorBanner` for transport and attachment errors.

Track:

- placement;
- retry action;
- dismiss action;
- error wording;
- localization;
- attachment vs message failure distinction;
- offline vs server vs validation vs permission errors;
- no secret/internal stack leakage;
- persistence of unsent draft and attachments after failure;
- accessibility focus/announcement.

Status: `CURRENT/PARTIAL`.

## 2.13 Keyboard Behavior

Current Chat is wrapped in `KeyboardAvoidingView`:

- iOS: `padding`;
- other platforms: `height`.

Status: `CURRENT/VERIFY`.

Mandatory physical verification:

- keyboard opens without covering composer;
- keyboard closes without leaving blank area;
- attachment tray remains usable;
- message list resize is stable;
- switching language keyboards does not break layout;
- multiline composer expansion is stable;
- Android gesture navigation and keyboard inset combinations;
- voice-screen navigation returns correctly.

## 2.14 Chat Header and New Conversation

The Chat header and new-conversation action are required permanent interaction points.

Track:

- current conversation title/state;
- new conversation control;
- no accidental loss of old conversations;
- fresh conversation behavior;
- later automatic retrieval of relevant prior context remains a memory-system concern, not a reason to merge visible threads incorrectly;
- accessibility and safe-area placement.

Status: `CURRENT/PARTIAL`.

## 2.15 Floating Plus / Quick Actions

MUDRIK's preferred navigation direction remains:

- no permanent bottom icon bar;
- floating `+` control;
- polished expanding vertical quick-action menu;
- quick access to Conversations, Projects, Companion and Settings;
- new conversation accessible without losing existing history.

Current Chat already contains `QuickActionButton` and `QuickActionMenu`.

Status: `CURRENT/PARTIAL`.

Track:

- collapsed icon;
- expanded icon/state;
- placement;
- menu spacing;
- labels;
- outside-tap dismissal;
- back-button dismissal;
- Reduced Motion;
- overlap with keyboard/composer/messages;
- RTL-safe placement if final design requires mirroring;
- screen-reader expanded/collapsed state.

---

# 3. Conversation History Surface

Must track and verify:

- conversation list rows;
- title;
- latest-message preview if used;
- timestamp/date;
- pinned state;
- archived state;
- search;
- empty state;
- selection/opening;
- rename;
- archive/unarchive;
- delete confirmation if deletion is offered;
- no accidental history loss;
- scroll restoration where appropriate;
- RTL/LTR;
- loading/error states;
- accessibility.

Status: `PARTIAL`, exact UI inventory to be expanded when its implementation section is active.

---

# 4. Projects Surface

Track:

- project list cards/rows;
- project name and description;
- linked conversations;
- linked files;
- file previews;
- add/remove/link controls;
- empty state;
- loading/error state;
- archive state;
- project detail hierarchy;
- attachment ownership and cleanup safety;
- timestamps where shown;
- RTL/LTR;
- accessibility.

Status: `PARTIAL`.

---

# 5. Voice Surface

Track separately from text composer:

- recording affordance;
- live-listening indication;
- stop/cancel;
- timer if shown;
- waveform/level indicator if used;
- microphone permission state;
- STT partial/final text;
- TTS playing state;
- barge-in;
- mute/speaker/output controls where supported;
- natural error recovery;
- privacy-state visibility;
- wake-word mode vs explicitly opened voice chat;
- background behavior;
- Reduced Motion;
- accessibility.

Status: `PARTIAL`; full runtime belongs to Section 05.

---

# 6. Companion Surface

Track:

- avatar visibility;
- selected presentation;
- selected voice;
- captions;
- companion name;
- personality/presence controls;
- audio-only fallback;
- privacy indicators;
- observation truthfulness;
- eye-close/open presentation must follow real privacy state, never precede it;
- handoff presentation later;
- Reduced Motion;
- accessibility.

Status: `PARTIAL`; deeper implementation belongs to later sections.

---

# 7. Settings Surface

Track:

- every toggle/row;
- current value;
- saved value;
- reset behavior;
- confirmation for destructive reset where appropriate;
- settings grouping;
- language;
- theme;
- draft persistence;
- diagnostics;
- permissions links/status;
- privacy controls;
- security/session/device controls when introduced;
- no ordinary "Reset Settings" may silently clear authoritative privacy lock state;
- RTL/LTR;
- accessibility.

Status: `CURRENT/PARTIAL`.

---

# 8. Permission and Privacy UI

Section 04 adds a stronger requirement than ordinary OS permissions.

Track visibly where applicable:

- camera permission;
- microphone permission;
- location permission;
- health permission;
- presence/spatial permission;
- current Observation Privacy state;
- active sensor indicators;
- why a sensor is active;
- which device is the source;
- local vs remote processing;
- immediate stop action;
- `visual_off`;
- `ambient_off`;
- `privacy_lock`;
- explicit re-enable;
- state unavailable/unverifiable;
- no false "off" claim when MUDRIK cannot verify the sensor state.

Status: `ACTIVE SECTION 04`.

---

# 9. Empty, Loading, Error and Offline States

Every major surface must explicitly define:

- initial loading;
- empty content;
- recoverable error;
- non-recoverable local corruption;
- offline;
- permission denied;
- permission permanently denied;
- feature unavailable on this device;
- partial data available;
- retry;
- cancellation;
- no hidden progress that leaves the user unsure whether something is happening.

A feature is not considered visually complete if only its happy path is designed.

---

# 10. Touch and Interaction Detail Checklist

For every button/control verify:

- idle;
- pressed;
- focused where applicable;
- disabled;
- loading/busy;
- success acknowledgment where needed;
- failure;
- rapid repeated tap;
- back navigation;
- interrupted navigation;
- app background/foreground;
- screen rotation where supported;
- RTL/LTR;
- screen reader.

---

# 11. Text and Content Detail Checklist

For every textual surface verify:

- Arabic;
- German;
- English;
- mixed Arabic + Latin;
- numbers;
- dates;
- timestamps;
- long filenames;
- long titles;
- long messages;
- emoji;
- URLs;
- email addresses;
- code fragments;
- punctuation;
- multiline content;
- selectable text where useful;
- truncation only where intentional and recoverable.

---

# 12. Visual Regression / Review Rule

Before a UI-affecting section is marked complete, perform a deliberate detail audit against this registry.

Minimum evidence where technically applicable:

- component/unit behavior tests;
- RTL/LTR checks;
- accessibility semantics checks;
- dark/light theme checks where supported;
- compact/large viewport checks;
- keyboard/safe-area checks;
- physical-device screenshots or visual inspection in the deferred Layer 4 phase;
- comparison against the intended component inventory;
- explicit record of any visual difference that remains deferred.

A green TypeScript build does not prove visual correctness.

---

# 13. Change-Control Rule

Whenever a future request changes a visual/interaction detail:

1. update the relevant registry item;
2. record the intended new behavior;
3. identify affected component(s);
4. implement only in the correct active scope;
5. update tests where possible;
6. visually verify later on real hardware where applicable;
7. do not silently preserve obsolete behavior merely because it existed first;
8. do not silently discard the newly requested behavior during later refactors.

This document therefore acts as a durable product-detail ledger, not only a one-time checklist.

---

# 14. Explicit User-Requested Chat Details — Mandatory

The following details are explicitly protected requirements and must not be forgotten:

- the text-entry box itself;
- the visual shape and behavior of the text-entry box;
- the attachment paperclip concept `📎`;
- attachment support for images;
- attachment support for videos;
- attachment support for other files/documents;
- pre-send attachment handling;
- message bubbles;
- message timestamps;
- user/assistant message distinction;
- message sending/stopping/retry/error states;
- all future modifications to these details.

These items remain mandatory even if implementation is refactored into different files or components later.

## Current Known Gap Snapshot

As of this registry's creation:

- composer exists: `CURRENT`;
- composer geometry/styles exist: `CURRENT/VERIFY`;
- attachment flow exists: `CURRENT/PARTIAL`;
- attachment control currently renders `＋`: `CURRENT`, but desired paperclip presentation is `INTENDED/MISSING`;
- image/video/file selection exists: `CURRENT/PARTIAL`;
- attachment draft tray exists: `CURRENT/PARTIAL`;
- message bubbles exist: `CURRENT/VERIFY`;
- `createdAt` exists in `ChatMessage`: `CURRENT`;
- timestamp rendering in bubble: `MISSING/INTENDED`;
- message attachments render: `CURRENT/PARTIAL`;
- floating quick actions exist: `CURRENT/PARTIAL`;
- keyboard avoidance exists: `CURRENT/VERIFY`;
- full physical visual validation: `DEFERRED` under the recorded Layer 4 exception.

## Core Rule

**MUDRIK is not visually complete if the large feature works but the small interaction details have been lost. Every visible control, state, spacing relationship, timestamp, attachment affordance and user-requested modification must remain traceable until verified.**
