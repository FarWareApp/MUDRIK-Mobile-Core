# Section 05 — Automated Evidence

## Accepted Candidate

`504c42e1902665858a61ce9df6e3fbcab844b67c`

This SHA is the accepted pre-device implementation candidate for Section 05. Documentation commits after this SHA do not change the recorded runtime candidate.

## GitHub Actions Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run ID: `34776183455`
- Branch: `mudrik-core-v1`
- Head SHA: `504c42e1902665858a61ce9df6e3fbcab844b67c`
- Result: **SUCCESS**

Validated steps:

- frozen dependency installation: PASS;
- dependency manifest reproducibility: PASS;
- Android device build configuration gate: PASS;
- tracked sensitive file gate: PASS;
- full Git-history secret scan: PASS;
- dependency High/Critical gate: PASS;
- reviewed advisory dependency paths: PASS;
- lint: PASS;
- TypeScript: PASS;
- Mobile Core security regressions: **215/215 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**.

Dependency audit at acceptance:

- Critical: **0**
- High: **0**
- Moderate: **2 reviewed transitive advisories**
  - `uuid@7.0.3` via Expo configuration tooling;
  - `decode-uri-component@0.2.2` via `expo-router -> query-string`.

No incompatible dependency override was introduced merely to silence these advisories.

### CodeQL Security Analysis

- Workflow: `CodeQL Security Analysis`
- Run ID: `34776183457`
- Branch: `mudrik-core-v1`
- Head SHA: `504c42e1902665858a61ce9df6e3fbcab844b67c`
- Language job: `javascript-typescript`
- Result: **SUCCESS**

## Section 05 Regression Coverage

The accepted suite includes explicit tests for:

- streaming STT partial/final validation;
- final-only executable speech boundary;
- stale, conflicting and replayed transcript rejection;
- generation-zero compatibility and post-generation stale rejection;
- monotonic session generation across reset/barge-in;
- Voice Runtime Coordinator legal phase transitions;
- wrong-phase transcript registry-poisoning prevention;
- VAD identity/order/time validation;
- end-of-turn bounded silence/stability behavior;
- instant/reasoning lane selection without execution authority;
- microphone activation bound to Section 04 privacy policy;
- direct versus passive microphone use;
- wake-word/hands-free privacy-lock enforcement;
- barge-in qualification under clear, echo and hostile inputs;
- stale VAD rejection after barge-in;
- TTS chunk validation and ordering;
- first-audio requirement before assistant-speaking state;
- final-chunk plus playback-complete requirement before turn completion;
- TTS late-packet rejection after cancellation;
- provider-neutral selection by health/priority/latency/language;
- no same-generation provider output mixing after failover;
- STT failover replay-input requirement;
- privacy-safe voice audit schema;
- structural rejection of raw transcript/audio/provider payloads from security telemetry;
- latency traces that compute only from monotonic evidenced milestones.

## Security Boundary Evidence

The accepted implementation preserves these invariants:

1. Voice interpretation does not grant capability authority.
2. High-confidence speech does not weaken high/critical action authorization.
3. Passive microphone modes remain subject to `ambient_off` and `privacy_lock`.
4. Direct user-initiated microphone interaction does not re-enable passive observation.
5. Delayed VAD/STT/TTS events from an older generation cannot revive a cancelled/reset turn.
6. Barge-in requires current assistant speech plus qualified input evidence.
7. TTS state does not claim playback merely because network chunks arrived.
8. Provider failover cannot mix output from different providers inside one generation after output begins.
9. Provider descriptors/audit metadata cannot contain production secrets.
10. Voice security telemetry does not accept raw audio or transcript content.

## Physical / Provider Evidence Not Yet Claimed

No claim is made that the accepted candidate has passed:

- real Android microphone tests;
- real STT/TTS provider quality tests;
- Arabic dialect/German/English/code-switching acoustic evaluation;
- real wake-word evaluation;
- real echo cancellation or far-field testing;
- real Bluetooth/headset audio routing;
- real first-audio/barge-in latency measurements;
- production provider outage/failover exercises;
- physical device/background/process-death recovery.

Those remain Layer 4 obligations and must be rebuilt/tested from the then-current exact candidate when physical/provider validation begins.
