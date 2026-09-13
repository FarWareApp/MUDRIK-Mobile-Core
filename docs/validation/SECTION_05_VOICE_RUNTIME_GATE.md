# Section 05 — Voice Runtime and Natural Command Layer Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 05 builds the provider-neutral voice runtime foundation without coupling production STT/TTS/model providers into the Mobile UI.

## Scope

Section 05 pre-device work includes:

- streaming STT contracts;
- streaming TTS contracts;
- VAD / speech-boundary model;
- deterministic end-of-turn policy;
- two-lane routing contract: instant command vs conversational/reasoning;
- ambiguity/confidence escalation rules;
- barge-in and safe cancellation lifecycle;
- voice-session state machine;
- multilingual/code-switching metadata contracts;
- latency tracing/measurement contracts;
- provider health/failure normalization without provider-specific UI coupling;
- separation between speech understanding and execution authority;
- preservation of Section 04 privacy policy and microphone authority.

## Non-goals

Pre-device Section 05 does not yet claim:

- production STT provider quality;
- production TTS provider quality;
- real wake-word accuracy;
- real acoustic echo cancellation/noise suppression performance;
- real far-field microphone quality;
- real sub-second latency on hardware/network;
- voiceprint as an authorization factor;
- production smart-home execution;
- production reasoning-provider integration;
- that recorded mock audio proves real speech recognition quality.

No production API key or provider credential belongs in the client or repository.

## Layer 1 — Specification and Static Correctness

Required evidence:

- `MUDRIK_VOICE_INTERACTION.md` remains authoritative;
- STT/TTS/provider interfaces are replaceable;
- UI does not depend on provider identity;
- instant-command lane is separate from reasoning lane;
- confidence/ambiguity can escalate but cannot silently lower permission requirements;
- voice understanding never grants execution authority;
- cancellation and barge-in semantics are explicit;
- Section 04 privacy lock remains authoritative over passive microphone use;
- TypeScript/lint/CodeQL pass;
- no new production secrets or unjustified runtime dependencies.

## Layer 2 — Unit and Component Verification

Mandatory deterministic tests include:

- voice session legal state transitions;
- invalid/out-of-order session events fail safely;
- VAD speech-start/speech-end ordering;
- short noise/transient does not finalize a turn;
- minimum/maximum silence behavior is bounded;
- end-of-turn decision is deterministic;
- partial STT hypotheses can update without becoming executable final intent;
- final STT result has stable segment identity/order;
- low-confidence/ambiguous instant intent escalates to reasoning/clarification;
- clear allowed simple intent may choose instant lane;
- high-risk intent never becomes "safe" because speech confidence is high;
- barge-in cancels TTS playback before accepting overlapping response audio;
- cancellation is idempotent;
- stale session/segment events are rejected;
- latency trace ordering and durations are validated;
- multilingual metadata accepts Arabic/German/English/code-switching without changing authority.

## Layer 3 — Integration, Security and Adversarial Verification

Required adversarial coverage:

- forged STT final result with unexpected fields;
- partial transcript attempting execution;
- stale transcript from prior session;
- duplicate final segment;
- out-of-order sequence;
- confidence `NaN`, negative, or >1;
- fake provider "success" without final transcription;
- cancellation racing with final transcript;
- barge-in racing with TTS completion;
- provider/network failure mid-stream;
- reasoning lane cannot bypass capability policy;
- privacy lock blocks passive microphone activation;
- direct explicit microphone interaction does not silently enable passive listening;
- spoken high-risk command still requires normal deterministic authorization;
- malformed latency timestamps do not produce false performance claims.

## Layer 4 — Real Device / Audio / Network Verification

**DEFERRED** under the recorded owner-directed physical-validation exception.

Before final Section 05 closure verify on real supported devices:

- microphone permission allow/deny/revoke;
- press-to-talk recording;
- open voice-session microphone behavior;
- app background/foreground/interruption;
- Bluetooth/headset routing;
- speaker echo/barge-in behavior;
- streaming STT partial/final timing;
- Arabic dialect accuracy;
- German accuracy;
- English accuracy;
- Arabic/German/English code-switching;
- noisy-room and far-field behavior;
- TTS first-audio latency;
- TTS interruption latency;
- end-of-turn false-cut and over-wait cases;
- offline/network-loss behavior;
- provider failover if enabled;
- measured p50/p95/p99 latency for supported paths.

Mock/provider-contract tests cannot close real audio quality or latency obligations.

## Layer 5 — Release / Independent Review / Evidence

Before pre-device completion:

- exact candidate SHA recorded;
- Mobile Core Validation green;
- CodeQL green;
- voice runtime regressions/adversarial tests green;
- no unresolved Critical/High Section 05 defect;
- privacy boundary reviewed;
- provider-neutral boundary reviewed;
- deferred hardware/audio limitations recorded.

Before final production closure:

- applicable Layer 4 passes;
- real provider evaluations recorded;
- latency/quality thresholds are measured rather than claimed;
- voice/privacy/security review completed;
- final candidate is revalidated after device/provider fixes.

## Core Acceptance Rule

Speech can propose what the user meant. It cannot grant permission, broaden privacy state, or claim an action succeeded without execution evidence.

Voice must remain low-latency, interruptible, provider-replaceable and safe under partial, duplicate, stale, malformed, ambiguous and cancelled stream events.
