# Section 05 — Defect Record

This record tracks significant defects discovered while implementing and adversarially testing the Voice Runtime pre-device scope.

## S05-VOICE-001 — Reset Could Reuse Generation Zero

- Severity: **High**
- Status: **Closed**
- Area: voice session replay protection

### Problem

An early `reset` transition returned the voice session generation to `0`. A sufficiently delayed generation-zero VAD/STT/TTS event could therefore become generation-valid again after reset.

### Repair

- generation is monotonic;
- reset increments generation instead of restoring zero;
- registries are recreated for the new generation;
- stale/future-generation checks remain explicit.

### Regression Evidence

Tests prove reset rotates generation and pre-reset events remain rejected.

---

## S05-VOICE-002 — Wrong-Phase Final Transcript Could Poison Registry

- Severity: **High**
- Status: **Closed**
- Area: coordinator / STT ordering

### Problem

An early coordinator implementation applied a validated final transcript to the speech registry before verifying that the session was in `finalizing`. A premature final could create registry state even though the session transition was rejected, causing later corrected input to conflict with poisoned state.

### Repair

- phase validation now happens before speech-registry mutation;
- wrong-phase final transcripts leave no registry state;
- adversarial regression reuses the same segment identity with corrected content after the proper phase and proves it is accepted.

---

## S05-VOICE-003 — Barge-In Could Be Represented Without Sufficient Evidence

- Severity: **Medium**
- Status: **Closed**
- Area: interruption / echo handling

### Problem

The first session-state design exposed `barge_in` as a simple event. Without qualification below the UI/model layer, short noise or MUDRIK's own speaker echo could be represented as an interruption and stop TTS.

### Repair

`bargeInPolicy.ts` and the coordinator now require:

- current `assistant_speaking` phase derived internally;
- authorized microphone input;
- active speech;
- minimum speech duration;
- VAD confidence;
- stronger lexical/stability evidence when echo is possible or unknown.

The caller cannot supply/forge `assistantSpeaking` to the coordinator API.

---

## S05-VOICE-004 — TTS Phase Could Advance Without Playback Evidence

- Severity: **Medium**
- Status: **Closed**
- Area: TTS lifecycle / truthful state

### Problem

Early session transitions could conceptually advance to `assistant_speaking` or complete a response without proving first audio actually started or final audio actually finished playback. Network metadata alone is not playback evidence.

### Repair

`TtsStreamLifecycle` separates:

- first chunk receipt;
- stream continuation;
- final chunk receipt;
- playback start confirmation;
- playback completion confirmation;
- cancellation/failure.

The Voice Runtime Coordinator now binds state transitions to this lifecycle. TTS start requires accepted first audio plus playback-start confirmation; completion requires final chunk plus playback-complete confirmation.

---

## S05-VOICE-005 — Generic Telemetry Could Admit Private Voice Content

- Severity: **Medium**
- Status: **Closed**
- Area: privacy / security telemetry

### Problem

Generic sanitized telemetry is not a sufficient boundary for highly private voice data because callers could attempt to supply transcript/audio/provider payload fields before redaction.

### Repair

`voiceAudit.ts` uses a strict allowlist and accepts only bounded references/state metadata. It structurally rejects extra fields including:

- raw transcript;
- raw audio;
- audio payload references;
- provider response objects;
- API keys/credential-shaped fields.

Voice audit events are therefore content-minimized by schema, not only sanitized after collection.

---

## Acceptance Defect State

At accepted pre-device candidate:

`504c42e1902665858a61ce9df6e3fbcab844b67c`

- unresolved Critical Section 05 defects: **0 known**;
- unresolved High Section 05 defects: **0 known**.

This statement is limited to the automated pre-device scope. Layer 4 physical/provider/acoustic testing may discover additional defects and remains mandatory before final production closure.
