# Chat Composer Baseline Before Hardening

This file records the pre-hardening behavior that must not be lost while decomposing and polishing the chat composer.

Required preserved behaviors:

- multiline text input;
- 12,000 character cap;
- source-agnostic send callback;
- attachment-only send remains possible;
- attachment picker remains outside visual primitives;
- voice action remains separate from send;
- active generation maps the primary action to Stop rather than a second Send;
- draft text and attachment drafts are not implicitly cleared by opening attachment or voice actions;
- RTL/LTR text direction remains automatic/content-aware;
- input and actions expose truthful disabled state;
- minimum touch targets remain at least 44x44;
- physical keyboard, safe-area and device visual behavior remain deferred Layer 4 obligations.

Any behavior not explicitly changed by the owner is preserved by default.
