# UI/UX Hardening Review Checklist

For every batch:

- one primary responsibility per new file;
- no duplicated state machine;
- no permission/persistence/transport logic in visual primitives;
- RTL/LTR considered;
- touch target >= 44x44 where interactive;
- screen-reader label/state present;
- disabled/focus/generation state truthful;
- no silent loss of text or attachment drafts;
- TypeScript/lint/regression/Expo Doctor/CodeQL green before moving to the next batch.
