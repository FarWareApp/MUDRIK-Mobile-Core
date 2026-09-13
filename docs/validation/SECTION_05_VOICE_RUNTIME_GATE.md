# Section 05 — Voice Runtime and Natural Command Layer Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Section 05 establishes the provider-neutral, privacy-bound, replay-resistant voice runtime below UI and above provider adapters. It does not couple production STT/TTS or AI providers into the Mobile UI.

## Accepted Pre-Device Candidate

`504c42e1902665858a61ce9df6e3fbcab844b67c`

Acceptance evidence is recorded in `SECTION_05_AUTOMATED_EVIDENCE.md`.

## Scope Implemented

- provider-neutral streaming STT and TTS contracts;
- strict runtime validation for untrusted STT/TTS/VAD/provider metadata;
- partial-versus-final transcript boundary;
- session/generation/sequence replay protection;
- monotonic voice generation across reset and barge-in;
- ordered VAD event registry;
- bounded end-of-turn policy;
- deterministic Voice Runtime Coordinator;
- instant-command candidate versus reasoning/clarification routing;
- no voice lane may self-authorize tool execution;
- Section 04 privacy-policy binding for microphone activation;
- direct versus passive microphone-use distinction;
- wake-word/hands-free privacy-lock enforcement;
- evidence-qualified barge-in with echo/noise resistance;
- deterministic TTS receipt/playback lifecycle;
- provider-neutral selection and failover policy;
- no mid-stream cross-provider output mixing after output is observed;
- privacy-safe voice security audit events;
- latency trace primitives that report only evidenced timing.

## Non-Goals / Deferred Layer 4

Pre-device completion does not prove:

- Android microphone permission behavior on physical hardware;
- real audio focus, routing, speaker/headset/Bluetooth behavior;
- production streaming STT accuracy;
- production TTS naturalness or pronunciation;
- wake-word false-positive/false-negative rates;
- acoustic echo cancellation quality;
- far-field/noisy-room behavior;
- real barge-in interruption latency;
- production provider outage/failover behavior;
- real first-audio or command latency;
- offline/degraded voice behavior on target devices;
- production process-death/background/foreground recovery;
- final accessibility/device-matrix behavior.

No production provider credential, endpoint or vendor-specific UI logic is required to satisfy this gate.

## Layer 1 — Specification and Static Correctness

Required PASS evidence:

- `MUDRIK_VOICE_INTERACTION.md` remains the architectural authority;
- voice understanding is never permission authority;
- Mobile UI remains provider-neutral;
- microphone activation delegates to Section 04 privacy/sensor policy;
- passive microphone activation cannot bypass `ambient_off` or `privacy_lock`;
- direct user interaction does not silently unlock passive observation;
- no API key/provider secret is present in provider descriptors or repository code;
- TypeScript and lint pass;
- CodeQL passes;
- full-history secret scan passes;
- dependency High/Critical gate passes.

## Layer 2 — Unit and Component Verification

Mandatory deterministic behavior includes:

- partial STT segments are non-executable;
- final STT segments are accepted only in the correct session phase;
- stale/future generations are rejected;
- sequence conflicts and post-final replay are rejected;
- generationless legacy events normalize only to generation zero;
- generation increases on reset and post-barge-in resume;
- VAD ordering is monotonic and conflict-resistant;
- malformed VAD/STT/TTS input fails closed;
- end-of-turn waits through active speech and insufficient silence;
- bounded maximum duration prevents an indefinitely stuck turn;
- instant-command routing never grants execution authority;
- high/critical capability candidates do not enter direct instant execution;
- direct microphone interaction requires explicit request, permission, trust and runtime availability;
- wake-word/hands-free modes obey passive observation privacy restrictions;
- barge-in requires current assistant speech and qualified input evidence;
- possible echo requires stronger lexical/stability evidence;
- TTS playback start requires accepted first audio;
- TTS completion requires final chunk plus playback completion evidence;
- late TTS chunks after cancellation are rejected;
- provider selection excludes unavailable, non-streaming, wrong-service and language-incompatible candidates;
- provider failover after output requires explicit restart and generation rotation;
- voice audit structurally rejects raw transcript/audio/provider payload content.

## Layer 3 — Integration, Security and Adversarial Verification

Required adversarial cases include:

- stale VAD from a prior generation arriving after barge-in;
- stale STT final arriving after reset;
- stale TTS chunk arriving after cancellation;
- final transcript arriving before the coordinator reaches `finalizing`;
- same-sequence transcript with conflicting content;
- same-sequence VAD with conflicting state;
- malformed timing/confidence/identity/provider metadata;
- caller attempts to forge barge-in while assistant is not speaking;
- assistant self-echo or short noise attempting to stop TTS;
- passive wake/hands-free attempt while privacy lock is active;
- TTS playback-complete reported before first audio or final chunk;
- provider switch after output without generation rotation;
- STT failover without replayable buffered input;
- hidden credential/content fields injected into provider or audit metadata.

Any uncertain identity, ordering, phase, privacy state or provider state must reject or move to a safer non-executing path.

## Layer 4 — Real Device / Provider / Acoustic Verification

**DEFERRED** under the recorded owner-directed physical-validation exception.

Before final closure verify at minimum:

- real Android microphone permission allow/deny/revoke;
- real audio focus/routing and phone-call interruption;
- wired/Bluetooth/headset behavior;
- real streaming STT with Arabic dialects, German, English and code-switching;
- Arabizi/custom vocabulary where supported;
- noisy-room and far-field recognition;
- wake-word false-positive/false-negative rates;
- privacy-lock behavior with actual wake/hands-free services;
- acoustic echo cancellation and assistant self-echo rejection;
- real VAD/end-of-turn timing;
- barge-in stop latency;
- streaming TTS first-audio latency;
- pronunciation, mixed-language speech and Arabic word separation;
- network degradation/outage/provider failover;
- offline/degraded behavior;
- background/foreground/process-death recovery;
- real cancellation with late provider packets;
- device/accessibility matrix;
- independent voice/privacy/security review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact candidate SHA recorded;
- Mobile Core Validation green;
- CodeQL green;
- voice and whole Mobile regression suites green;
- no unresolved Section 05 Critical/High defect;
- dependency and secret gates green;
- known defects and repairs recorded;
- deferred Layer 4 obligations explicit.

Production closure additionally requires all applicable Layer 4 items and a final revalidation after real-world fixes.

## Core Acceptance Rule

Voice input may interpret user intent, select a candidate lane and prepare actions, but it never grants execution authority. Microphone use remains subject to the privacy/sensor policy, and every asynchronous VAD/STT/TTS event is bound to the current session generation so delayed provider or device events cannot revive a cancelled or previous turn.
