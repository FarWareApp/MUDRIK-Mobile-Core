# MUDRIK UI/UX Hardening Workstream

## Status

ACTIVE — owner-directed cross-cutting quality workstream while Section 07 remains the primary implementation section.

This workstream improves product design quality without bypassing section gates or coupling future subsystems into the Mobile Core.

## Non-Negotiable Architecture Rule

Every file/module has one responsibility. UI presentation, interaction state, formatting, accessibility metadata, business policy, persistence, transport and device capabilities stay separated wherever practical.

A visual improvement must not silently move authority or application policy into a presentation component.

## First Hardening Target — Chat Composer

### Goals

- replace the current generic `+` attachment affordance with an explicit paperclip affordance;
- improve visual hierarchy of the composer field and action buttons;
- make focus, disabled, sending and attachment states visually truthful;
- preserve text draft and attachments when opening voice or attachment actions;
- preserve mixed RTL/LTR behavior and locale alignment;
- maintain multiline growth without layout jumps;
- keep touch targets >= 44x44;
- improve accessibility labels, roles and disabled state;
- avoid provider/AI coupling;
- preserve attachment-only sending;
- keep Stop distinct from Send while a response is being generated;
- do not hide errors or claim actions succeeded when they did not.

### Decomposition

- `MessageComposer.tsx`: composition/layout and event wiring only.
- `ComposerTextInput.tsx`: text-entry presentation and text-specific accessibility.
- `ComposerActionButton.tsx`: reusable visual/action primitive for attachment/voice/send/stop.
- `ComposerAttachmentButton.tsx`: attachment-specific affordance and intent.
- `ComposerSendButton.tsx`: send/stop state mapping only.
- existing attachment picker/service modules retain picker/permission/import responsibility.

Do not place picker logic, transport logic, permission logic or persistence in the visual primitives.

## Next UI Targets

After the composer passes automated validation:

1. message bubble spacing and hierarchy;
2. localized timestamp rendering and date separators;
3. explicit delivery/generation state presentation separate from timestamps;
4. attachment cards and unavailable/error states;
5. loading/error/offline banners;
6. chat header and new-conversation affordance;
7. Quick Action `+` menu polish;
8. Conversations, Projects, Voice, Companion and Settings visual consistency;
9. reduced-motion, RTL/LTR, screen-reader and large-text pass;
10. final physical-device visual verification in deferred Layer 4.

## Acceptance

Each UI batch must pass at minimum:

- TypeScript;
- lint;
- existing regression suite;
- relevant new static/component regression tests;
- Expo Doctor;
- CodeQL where applicable;
- no regression to source-agnostic app-first boundaries.

Physical visual/keyboard/safe-area/accessibility verification remains required later and cannot be declared complete from CI alone.
