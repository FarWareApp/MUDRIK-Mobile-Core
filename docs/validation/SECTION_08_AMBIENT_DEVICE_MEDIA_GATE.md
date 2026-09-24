# Section 08 — Ambient Device and Media Orchestration Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 08 establishes a provider-neutral orchestration layer for safe device, application, media, content, game and companion-placement intents. It resolves **what authorized operation should be requested and where it should be routed**; it does not create device trust, grant capabilities, expose a raw remote shell, install software, purchase content, or bypass later Computer Agent / Control Plane boundaries.

## Authoritative Architecture

- `docs/architecture/MUDRIK_AMBIENT_DEVICE_MEDIA_ORCHESTRATION.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- Section 02 capability policy remains authoritative for execution authorization.
- Section 03 remains authoritative for device identity and trust.
- Section 04 remains authoritative for sensor/observation privacy.
- Section 07 remains authoritative for cross-device presence, primary-surface ownership and handoff.

Target flow:

`Natural Request -> Normalized Intent -> Target Resolver -> App/Media Resolver -> Capability Check -> Adapter Contract -> Action Result`

No model receives unrestricted device control.

## Scope

- strict normalized device/media intent contracts;
- deterministic mapping from each intent to an existing MUDRIK capability;
- provider-neutral device and application adapter capability declarations;
- authorized target resolution without inventing trust;
- explicit ambiguity/clarification state instead of unsafe guessing;
- app open/close requests where supported by an authorized adapter;
- media play/pause/next/previous/seek/volume control;
- channel selection where supported;
- content search/play references;
- game launch references where platform support exists;
- media-session transfer/resume references;
- short-lived ambient-context model;
- deterministic contextual preference ordering;
- explicit distinction between ambient context and inferred emotion;
- companion placement policy using supplied layout metadata only;
- shared/private display restrictions;
- reduced-motion-aware placement decisions;
- provider/hardware-neutral adapter result contracts.

## Explicit Non-Goals

The following are not implemented as Section 08 authority:

- device pairing/trust establishment — Section 03;
- presence sensing, Follow Me or primary-surface ownership — Section 07;
- precision device locating/ringing — Section 09;
- emergency actions — Section 10;
- unrestricted computer commands, terminal execution or filesystem control — Sections 11–12;
- autonomous coding work — Section 13;
- internet-facing control-plane delivery — Section 14;
- production mobile/web remote-control transport — Section 15;
- long-term preference memory — Section 16;
- production provider/model routing — Section 18;
- arbitrary smart-home automation — Section 19;
- silent application installation;
- purchases, subscriptions or account changes;
- destructive save/data operations;
- raw vendor credentials/tokens in intent or adapter payloads;
- raw scripts, shell commands, executable paths or arbitrary URLs in device/media intents.

## Core Security / Privacy Invariants

1. A normalized intent never grants authority. Authorization remains Section 02.
2. Target proximity/activity/presence never creates device trust. Trust remains Section 03/07.
3. Every executable intent maps to one explicit capability; unknown intents fail closed.
4. Intent parsers use exact-key schemas and reject hidden authority/credential/script fields.
5. Device IDs are existing Section 03 identities; Section 08 does not invent a parallel identity model.
6. Adapter capability declarations describe support only; they never prove authorization.
7. Ambiguous materially different targets/content resolve to clarification, not side effects.
8. App installation, purchase, account change and destructive actions are outside the pre-device execution contract.
9. Media transfer carries session/content references only and inherits zero permissions.
10. Ambient context is ephemeral by default and never grants memory authority.
11. Lighting/activity/room/time context may influence selection but must never be represented as proof of emotion, mental state or intent.
12. Shared/public displays cannot receive private content merely because they are active or convenient.
13. Companion placement consumes authorized layout metadata only; it does not grant screen capture/vision authority.
14. Reduced Motion disables distracting automatic movement behavior.
15. Unknown fields, malformed IDs, oversized values, NaN/infinity, stale/replayed sequencing and credential-shaped references fail closed.
16. No normalized intent contains a raw shell command, executable path, arbitrary code or unrestricted URL.
17. Adapter errors are typed/sanitized and cannot leak credentials.
18. Section 08 cannot mutate Section 04 privacy state or Section 07 ownership state.

## Layer 1 — Specification / Static Correctness

Required PASS evidence:

- Section 08 Gate and architecture agree on ownership boundaries;
- normalized intents have strict discriminated schemas;
- every intent has deterministic capability mapping;
- no wildcard/general-purpose authority is introduced;
- provider-neutral references reject credential-shaped values;
- device identity reuses Section 03 validators;
- adapter declarations are support metadata only;
- ambient context is explicitly ephemeral/non-authoritative;
- lint, TypeScript, CodeQL, dependency and secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory deterministic cases include:

- each supported normalized intent parses correctly;
- unknown intent kind rejected;
- unknown/hidden fields rejected;
- malformed device/app/content/session/game references rejected;
- credential/script/URL-shaped injection rejected where references are expected;
- NaN/infinity/unsafe integers rejected;
- volume and seek bounds enforced;
- duplicate adapter capabilities rejected;
- unsupported capability produces unsupported result, never fallback authority;
- exact target beats contextual target;
- ambiguous target returns clarification;
- inactive/untrusted/revoked target cannot be selected;
- media-session transfer preserves reference identity without permission inheritance;
- ambient-context TTL and field bounds enforced;
- no ambient field represents inferred emotion;
- contextual ranking deterministic across input order;
- private content excluded from shared/public destinations unless independently authorized policy permits it;
- companion placement avoids reserved regions deterministically;
- reduced motion suppresses automatic animated repositioning.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory adversarial cases include:

- spoofed device identity;
- adapter claims support for an unauthorized capability;
- hidden `permissions`, `toolScopes`, `apiKey`, `token`, `command`, `script` or equivalent fields;
- raw shell/PowerShell/bash payload in an intent;
- arbitrary URL/URI injection where an opaque reference is required;
- stale/replayed media-session transfer;
- target changes trust state between resolution and execution;
- shared TV/speaker chosen for private content;
- Follow Me/presence state attempting to bypass execution authorization;
- ambient lighting attempting to become an emotion claim;
- recommendation ambiguity attempting automatic paid/destructive action;
- malformed layout metadata attempting companion overlay outside bounds;
- adapter error containing credential-like data;
- deterministic behavior under candidate reordering.

Any ambiguity resolves to **no side effect**.

## Layer 4 — Physical / Real-Environment Verification

**DEFERRED** under the owner-directed physical-validation exception.

Before final closure verify where supported:

- real phone/TV/computer/display media controls;
- actual supported application open/close behavior;
- real playback pause/resume/seek/volume;
- media transfer/resume between at least two supported physical devices;
- real network loss/reconnect;
- adapter unavailable/unsupported behavior;
- real shared-screen private-content suppression;
- companion placement over representative video/subtitle/menu/game layouts;
- reduced-motion behavior on device;
- platform restrictions for consoles/TVs/streaming devices;
- latency, battery and recovery behavior;
- accessibility and visible execution/status feedback.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact implementation candidate SHA;
- Mobile Core Validation green;
- CodeQL green;
- Section 08 plus whole-core regressions green;
- zero unresolved Critical/High Section 08 defects;
- dependency/secret gates green;
- defect/evidence records;
- Layer 4 obligations explicit.

Production/final Section 08 closure requires Layer 4 and exact-candidate revalidation.

## Core Acceptance Rule

Section 08 may determine **which already-authorized device/media operation best matches the user's request**. It never turns context, AI output, proximity, adapter support, or convenience into permission.
