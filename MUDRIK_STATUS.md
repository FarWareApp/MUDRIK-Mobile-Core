# MUDRIK Project Status

Last consolidated: 2026-10-01

## Authoritative Execution Model

MUDRIK is developed through the twenty-section plan in:

`docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

Every section uses five validation layers:

1. specification/static correctness;
2. unit/component verification;
3. integration/security/adversarial verification;
4. physical/real-environment/E2E/recovery verification;
5. release/independent-review/evidence gate.

The owner elected to defer physical phone/hardware validation until the broader pre-device implementation program is substantially complete. This changes scheduling only; it does **not** waive Layer 4 or authorize production/freeze tags for deferred sections.

## Repository

- Repository: `FarWareApp/MUDRIK-Mobile-Core`
- Branch: `mudrik-core-v1`
- Repository visibility: **public**
- Android application ID: `com.farwareapp.mudrik`
- Production AI/server transport remains decoupled from Mobile UI until the appropriate gates authorize it.

## Section State Summary

### Section 01 — Mobile Core Freeze

`OPEN — PHYSICAL ANDROID LAYER 4 DEFERRED`

Automated/pre-device Mobile Core hardening is strong, but the core is **not finally frozen**. `MOBILE-CORE-FROZEN` remains forbidden until the mandatory physical Android matrix passes.

Reference APK evidence before deferral:

- candidate `acecb662e6bac231e18a62bccc45197794bda172`;
- Mobile Core Validation run #93 / ID `34708290715`: SUCCESS;
- Android Device Validation APK run #2 / ID `34708290677`: SUCCESS.

Important closed defect: `S01-DATA-001` — High / Closed. Project-only attachments are protected from orphan cleanup.

### Section 02 — Platform Security Foundation

`PRE-DEVICE COMPLETE — OPEN / LAYER 4 DEFERRED`

Accepted candidate:

`256d55f2b93f33468d3c98d9e3a8192e2c584e1f`

Evidence:

- Mobile Core Validation #133 / `34714989382`: SUCCESS;
- CodeQL #26 / `34714989334`: SUCCESS;
- regressions: **57/57 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

The section includes default-deny capability policy, exhaustive risk classification, scoped filesystem/network/background/elevation authority, strict runtime validation, secret-reference boundaries, secure-storage contracts, redacted security events, CodeQL/dependency/secret gates and repository security controls.

Important closed defect: `S02-AUTH-001` — High / Closed.

### Section 03 — Account Identity, Authentication and Device Trust

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`5726fc059698ebb36590f8980c862f83099fb00b`

Evidence:

- Mobile Core Validation #159 / `34766097157`: SUCCESS;
- CodeQL #52 / `34766097108`: SUCCESS;
- regressions: **101/101 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

Implemented boundaries include typed account/device/session/key identities, passkey-first assurance, step-up policy, short-lived device/key-bound sessions, refresh-family reuse detection, one-time pairing, scoped revocation, challenge binding, device trust and privacy-safe inventory/audit schemas.

### Section 04 — Privacy, Permissions and Observation Control

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`0bfc86e83bdca2bf79ad1ff061709a08889501c4`

Evidence:

- Mobile Core Validation #192 / `34773109075`: SUCCESS;
- CodeQL #85 / `34773109004`: SUCCESS;
- regressions: **151/151 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

Implemented boundaries include observation privacy state machine, natural-language privacy fast path, dedicated V7 privacy persistence, fail-closed recovery, live monotonic Sensor-State Registry, activation policy, truth resolver, restart/handoff reconciliation, privacy audit events and UI indicator model.

Detailed evidence:

- `docs/validation/SECTION_04_PRIVACY_PERMISSIONS_OBSERVATION_GATE.md`
- `docs/validation/SECTION_04_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_04_DEFECTS.md`

### Section 05 — Voice Runtime

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`504c42e1902665858a61ce9df6e3fbcab844b67c`

Evidence:

- Mobile Core Validation ID `34776183455`: SUCCESS;
- CodeQL ID `34776183457`: SUCCESS;
- regressions: **215/215 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

The authoritative runtime lives in `src/core/voice`. It includes streaming STT/TTS contracts, VAD ordering, turn generation/replay protection, barge-in, privacy-bound microphone activation, provider-neutral routing/failover boundaries, cancellation, end-of-turn logic, latency evidence and privacy-safe audit events.

Detailed evidence:

- `docs/validation/SECTION_05_VOICE_RUNTIME_GATE.md`
- `docs/validation/SECTION_05_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_05_DEFECTS.md`

### Section 06 — Smart Companion

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`

Evidence:

- Mobile Core Validation #284 / `34781835325`: SUCCESS;
- CodeQL #177 / `34781835439`: SUCCESS;
- regressions: **239/239 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS;
- no known unresolved Critical/High Section 06 defect.

Implemented boundaries include one primary companion identity, strict provider-neutral profile validation, bounded personality/presence configuration, V8 non-destructive persistence, monotonic revision protection, consistent text/voice/avatar identity projection, memory-policy reference-only binding and explicit zero execution/sensor/memory/disclosure authority.

Detailed evidence:

- `docs/validation/SECTION_06_SMART_COMPANION_GATE.md`
- `docs/validation/SECTION_06_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_06_DEFECTS.md`

### Section 07 — Cross-Device Presence

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`dabc897cd78133bd2cbaf17cbe3e637f5f9d7b21`

Evidence:

- Mobile Core Validation #614 / `35939368198`: SUCCESS;
- CodeQL #509 / `35939368142`: SUCCESS;
- regressions: **529/529 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency High/Critical gate: PASS;
- full-history secret scan: PASS.

Detailed evidence:

- `docs/validation/SECTION_07_CROSS_DEVICE_PRESENCE_GATE.md`
- `docs/validation/SECTION_07_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_07_DEFECTS.md`

### Section 08 — Ambient Device and Media Orchestration

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`b40b643a1b7f5856f8d727c471269f1829f0bfc1`

Evidence:

- Mobile Core Validation #673 / `36054482695`: SUCCESS;
- CodeQL #568 / `36054482697`: SUCCESS;
- regressions: **591/591 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

Detailed evidence:

- `docs/validation/SECTION_08_AMBIENT_DEVICE_MEDIA_GATE.md`
- `docs/validation/SECTION_08_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_08_DEFECTS.md`

### Section 09 — Smart Device Finder and Spatial Locating

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`936cb35ee4a9e79fa84a9edddb1313fccdd85dd2`

Evidence:

- Mobile Core Validation #706 / `36133983162`: SUCCESS;
- CodeQL #601 / `36133983176`: SUCCESS;
- regressions: **649/649 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS;
- no known unresolved Critical/High Section 09 defect.

Implemented boundaries include strict find requests, trusted target resolution, separately authorized locating evidence, replay-resistant signal sequencing, deterministic confidence/precision fusion, strict fusion-result parsing, re-authorized ring/vibrate/flash/wake actions, surface-privacy disclosure and evidence-bounded guided search.

Detailed evidence:

- `docs/validation/SECTION_09_SMART_DEVICE_FINDER_GATE.md`
- `docs/validation/SECTION_09_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_09_DEFECTS.md`

### Section 10 — Emergency Guardian

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`acc11fe839c12cae38e31ce25870290b1c09199f`

Evidence:

- Mobile Core Validation #724 / `36346111692`: SUCCESS;
- CodeQL #619 / `36346111701`: SUCCESS;
- Emergency Guardian regressions: **143/143 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- tracked/worktree/history secret gates: PASS;
- no known unresolved Blocker/Critical/High Section 10 defect.

Detailed evidence:

- `docs/validation/SECTION_10_EMERGENCY_GUARDIAN_GATE.md`
- `docs/validation/SECTION_10_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_10_DEFECTS.md`

### Section 11 — Durable Computer Agent Runtime

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`e3cc7e8d64b89f584d3cb2f64a052d7f553c495b`

Evidence:

- Mobile Core Validation #726 / `36358953372`: SUCCESS;
- CodeQL #621 / `36358953373`: SUCCESS;
- Computer Agent regressions: **71/71 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- tracked/worktree/history secret gates: PASS;
- no known unresolved Blocker/Critical/High Section 11 defect.

Implemented boundaries include authenticated signed task admission, replay-safe restart reconstruction, HMAC-protected durable state, deterministic lifecycle/checkpoints, uncertain-side-effect blocking, per-task mutation serialization, durable Pause/Cancel, per-step current grant rechecks and strict effective terminal scope/default evaluation.

Detailed evidence:

- `docs/validation/SECTION_11_DURABLE_COMPUTER_AGENT_GATE.md`
- `docs/validation/SECTION_11_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_11_DEFECTS.md`

### Section 12 — Computer Agent Tooling and Capability Sandbox

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

- `ba8204ed2646167b0fef043874d8fbdd8de5e374` — `Decouple filesystem policy test from Bubblewrap`
- primary sandbox hardening candidate beneath it: `3e48c5668ea195c442715e0288424fd67d8d53c3`

Evidence:

- Mobile Core Validation `#738` / ID `36370982106`: **SUCCESS**
- CodeQL Security Analysis `#633` / ID `36370982364`: **SUCCESS**
- real Pop!_OS/Bubblewrap Computer Agent regressions: **152/152 PASS**
- GitHub Computer Agent run: **0 FAIL**, with 24 explicit backend-dependent skips because the hosted runner does not provide Bubblewrap
- whole Mobile Core regressions: **792/792 PASS**
- Expo Doctor: **21/21 PASS**
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**
- tracked/history secret gates: **PASS**
- no known unresolved Blocker/Critical/High Section 12 defect

Implemented boundaries include exact tool contracts and risk floors, covering-grant scope binding, Bubblewrap terminal/process/build isolation, namespace-confined filesystem mutation with race testing, scoped Git operations, opaque secret injection, owned-process references, bounded execution profiles, fail-closed sensitive tool contracts, scoped DNS-pinned HTTPS, result sanitization and prompt/tool-injection resistance.

Detailed evidence:

- `docs/validation/SECTION_12_COMPUTER_AGENT_TOOLING_SANDBOX_GATE.md`
- `docs/validation/SECTION_12_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_12_DEFECTS.md`

Browser/screen/clipboard/system privileged backends, Git push/destructive Git execution and unsupported platform guarantees remain fail-closed unavailable rather than being treated as implemented.

### Section 13 — Coding Engine and Autonomous Work Runner

`PRE-DEVICE COMPLETE — OPEN / REAL-PROVIDER LAYER 4 DEFERRED`

Accepted candidate:

- `2ecce738edc3a15b962f8c92a49934196689a75b` — `Harden coding reviewer inspection flow`

Evidence:

- Mobile Core Validation `#748` / ID `36488827607`: **SUCCESS**
- CodeQL Security Analysis `#643` / ID `36488827657`: **SUCCESS**
- real Pop!_OS Computer Agent regressions: **184/184 PASS**
- GitHub Computer Agent suite: **184 tests / 160 PASS / 24 backend-dependent SKIP / 0 FAIL**
- whole Mobile Core regressions: **792/792 PASS**
- Expo Doctor: **21/21 PASS**
- TypeScript / lint: **PASS**
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**
- tracked/history secret gates: **PASS**
- no known unresolved Blocker/Critical/High Section 13 defect

Implemented boundaries include provider-neutral model adapters, strict job/model contracts, replay-safe turn binding, deterministic workflow/revision semantics, current-revision evidence, worker/reviewer separation, read-only reviewer inspection, bounded autonomous repair loops, Section 11/12 tool handoff, outer lifecycle/capability preservation, secret-signature rejection, tool/prompt-injection resistance and evidence-backed completion.

Detailed evidence:

- `docs/architecture/MUDRIK_CODING_ENGINE_AUTONOMOUS_RUNNER.md`
- `docs/validation/SECTION_13_CODING_ENGINE_GATE.md`
- `docs/validation/SECTION_13_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_13_DEFECTS.md`

Concrete provider routing/failover/credentials remain Section 18. Real-provider/repository validation and durable coding-session restart recovery where required remain deferred to production/Layer 4 and Section 20.

### Section 14 — Control Plane and Reliable Task Routing

`PRE-DEVICE COMPLETE — OPEN / REAL-INFRASTRUCTURE LAYER 4 DEFERRED`

Accepted candidate:

`ec2233eacd28332d13a83b809760e022918cc908`

Evidence:

- Mobile Core Validation #755 / `36591646407`: SUCCESS;
- CodeQL #651 / `36591646475`: SUCCESS;
- Control Plane regressions: **59/59 PASS**;
- Mobile Core regressions: **792/792 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- tracked/history secret gates: PASS.

Current architecture boundary:

`Authenticated Source Session + Trusted Device Registry -> Durable Command Admission -> Approval/Authorization -> Ordered Route State -> At-Least-Once Delivery -> Agent Ack/Event Reconciliation -> Terminal State + Audit`

Sections 11/12 remain the final local execution authority. Gateway, broker, presence or AI state can route work but cannot manufacture local capability grants.

Detailed evidence:

- `docs/validation/SECTION_14_CONTROL_PLANE_ROUTING_GATE.md`
- `docs/validation/SECTION_14_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_14_DEFECTS.md`

### Section 15 — Web and Mobile Command Surfaces

`PRE-DEVICE COMPLETE — OPEN / REAL-SURFACE LAYER 4 DEFERRED`

Accepted candidate:

`a7aa9931c438eae93beea2ceaccdca299b8ad79c`

Evidence:

- Mobile Core Validation `36620054699`: SUCCESS;
- CodeQL `36620054563`: SUCCESS;
- Mobile Core regressions: **842/842 PASS**;
- Computer Agent regressions: **184/184 PASS**;
- Control Plane regressions: **59/59 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency High/Critical gate: PASS.

Detailed evidence:

- `docs/validation/SECTION_15_WEB_MOBILE_COMMAND_SURFACES_GATE.md`
- `docs/validation/SECTION_15_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_15_DEFECTS.md`

### Section 16 — Memory System

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted implementation candidate:

`b367dcd277601e3c1745a58cbffdf818e8497d2f`

Additional adversarial regression coverage continued through `25a0ea77dc64122366df145911e86350c0a3cbbe`.

Evidence:

- accepted-candidate Mobile Core Validation `36626840155`: SUCCESS;
- accepted-candidate CodeQL `36626840066`: SUCCESS;
- provider-independent long-term memory, deletion/tombstone integrity, conflict preservation, bounded retrieval/compaction and restart integrity are covered;
- no known unresolved Blocker/Critical/High Section 16 defect in the automated/pre-device scope.

Detailed evidence:

- `docs/validation/SECTION_16_MEMORY_SYSTEM_GATE.md`
- `docs/validation/SECTION_16_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_16_DEFECTS.md`

### Section 17 — Knowledge Engine and Developer Knowledge System

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`a7a9d305e9af84198bddd945954e285e6d092d12`

Evidence:

- Mobile Core Validation #778 / `36886675072`: SUCCESS;
- CodeQL #674 / `36886674753`: SUCCESS;
- Section 17 knowledge suite: **30/30 PASS**;
- whole Mobile Core regressions: **892/892 PASS**;
- Computer Agent regressions: **184/184 PASS**;
- Control Plane regressions: **59/59 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency audit blocking gate: **0 Critical / 0 High**;
- frozen dependency install, lint, TypeScript and diff checks: PASS.

Implemented boundaries include provenance-bound/versioned source truth, deterministic bounded ingestion/chunking, provider-independent index truth, official/current documentation preference, freshness/version filtering, exact citation/licensing metadata, bounded embedding/reranker abstractions, deletion/revocation invalidation, race-safe publication, prompt/tool-injection resistance and strict zero-authority knowledge projections.

Detailed evidence:

- `docs/architecture/MUDRIK_KNOWLEDGE_ENGINE.md`
- `docs/validation/SECTION_17_KNOWLEDGE_ENGINE_GATE.md`
- `docs/validation/SECTION_17_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_17_DEFECTS.md`

### Section 18 — Intelligence Router and Model/Provider Layer

`PRE-DEVICE COMPLETE — OPEN / REAL-PROVIDER LAYER 4 DEFERRED`

Accepted implementation candidate:

`8ec1c7be240e41df1791e44a65042a4df33327e7`

Evidence:

- Mobile Core Validation #782 / `36894185071`: SUCCESS;
- CodeQL #678 / `36894185109`: SUCCESS;
- Section 18 intelligence-router suite: **27/27 PASS**;
- whole Mobile Core regressions: **919/919 PASS**;
- Computer Agent regressions: **184/184 PASS**;
- Control Plane regressions: **59/59 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency audit blocking gate: **0 Critical / 0 High / 5 reviewed Moderate**;
- frozen install, TypeScript, ESLint and diff checks: PASS.

Implemented boundaries include versioned account/workspace routing policy; provider-independent general/coding/vision/STT/TTS routing; explicit offline/online selection; trusted-time health state; deterministic health/quality/latency/cost routing; bounded fallback plans; request replay protection; registry-issued plan provenance; policy-revision invalidation; adapter-private credential resolution; failover without output mixing; STT buffered-input replay; generation/sequence-bound streaming attempts; secret-safe failure normalization; privacy-safe audit/result envelopes; and strict zero execution/sensor/approval/capability authority on provider/model outputs.

Detailed evidence:

- `docs/architecture/MUDRIK_INTELLIGENCE_ROUTER.md`
- `docs/validation/SECTION_18_INTELLIGENCE_ROUTER_GATE.md`
- `docs/validation/SECTION_18_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_18_DEFECTS.md`

### Section 19 — Smart-Home, External Integrations and Automation

`PRE-DEVICE COMPLETE — OPEN / REAL-INTEGRATION LAYER 4 DEFERRED`

Accepted implementation candidate:

`e82a40c62585ad6b28a1b043825daebf29c9feb3`

Evidence:

- Mobile Core Validation #789 / `36901033163`: SUCCESS;
- CodeQL #685 / `36901033032`: SUCCESS;
- Section 19 integrations/automation suite: **57/57 PASS**;
- whole Mobile Core regressions: **976/976 PASS**;
- Computer Agent regressions: **184/184 PASS**;
- Control Plane regressions: **59/59 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency audit blocking gate: **0 Critical / 0 High / 5 reviewed Moderate**;
- frozen install, TypeScript, ESLint and diff checks: PASS.

Implemented boundaries include zero-authority vendor discovery, explicit discovery-to-admission binding, dedicated home read/access/security capabilities, versioned integration policy, exact command/value contracts, high-risk approval provenance, exact-target routines, cross-device revision binding, bounded automation permissions, short-lived automation executions, action-index replay protection, binding/policy/routine/automation revocation propagation, credential-free adapter invocations, issued-result provenance and content-minimized audit contracts.

Detailed evidence:

- `docs/architecture/MUDRIK_INTEGRATIONS_AUTOMATION.md`
- `docs/validation/SECTION_19_INTEGRATIONS_AUTOMATION_GATE.md`
- `docs/validation/SECTION_19_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_19_DEFECTS.md`

## UI/UX Detail Preservation Rule

Authoritative detail ledger:

`docs/architecture/MUDRIK_UI_UX_DETAIL_REGISTRY.md`

Small product details are mandatory product contract. This includes the text-entry box, its geometry, the intended attachment paperclip (`📎`), image/video/file attachment flows, draft tray, message bubbles, message timestamps, send/stop/retry/error states, keyboard/safe-area behavior, floating quick actions, RTL/LTR and accessibility.

Known chat gaps remain explicitly tracked rather than forgotten:

- current attachment control is `＋`, while paperclip presentation is `INTENDED/MISSING`;
- `ChatMessage.createdAt` exists, while bubble timestamp rendering is `MISSING/INTENDED`.

Deferred UI items are not optional and will be implemented in their correct active scope.

## Mobile Core Architecture Rule

- app-first architecture remains mandatory;
- UI is presentation/interaction, not authority;
- chat remains source-agnostic;
- AI/model output is untrusted input, never authority;
- companion/personality never grants tool/sensor/memory/disclosure authority;
- every module should retain one clear responsibility;
- later server/AI/agent integration must not weaken Mobile privacy/security boundaries.

## Dependency / Tooling Posture

Current stack includes Expo SDK 57, React Native, TypeScript, SQLite and Expo Router.

Validation includes frozen Yarn dependencies, ESLint `9.39.5`, `eslint-config-expo 57.0.2`, TypeScript, Expo Doctor `1.20.4`, Node 22, CodeQL JS/TS, dependency audit, full-history secret scan and pinned GitHub Actions.

Known reviewed Moderate transitive advisories remain:

- `uuid@7.0.3` through Expo configuration tooling;
- `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible override is accepted merely to silence an advisory.

## Physical Validation Debt

No section with physical/OS/provider/real-network obligations is finally closed while Layer 4 is deferred.

The owner does **not** need to stop current implementation work to test the phone now. When the deferred physical phase starts:

1. rebuild artifacts from the then-current exact candidate SHAs;
2. execute every section's Layer 4 matrix;
3. record PASS/FAIL/BLOCKED evidence;
4. classify and repair every failure;
5. add automated regression coverage where feasible;
6. rerun full CI/CodeQL/security gates;
7. only then authorize final freeze/release tags.

Section 20 cannot close until deferred Layer 4 obligations from Sections 01–19 are completed or explicitly proven not applicable.

## Next Work

1. Establish Section 20 Whole-System Integration, Security Certification and Production Release Gate across the accepted Mobile, Web, Control Plane, Computer Agent, Voice, Companion, Memory, Knowledge, Intelligence Router and Integrations boundaries.
2. Preserve Sections 01–19 as open for all deferred Layer 4 obligations until their real-environment matrices are executed.
3. Re-run the complete threat model at subsystem boundaries and verify that no composition path manufactures execution, sensor, approval, memory, disclosure or capability authority.
4. Build whole-system E2E, recovery/rollback, upgrade, key-rotation, incident-response, privacy, reliability/load and final release evidence; no stable production tag before every mandatory gate passes.

## Development Rule

For every section:

1. define scope and explicit non-goals;
2. implement deterministic contracts/policy before adapters/UI where appropriate;
3. run unit/component and integration/adversarial gates;
4. fix failures rather than suppress them;
5. record exact evidence and defects;
6. keep deferred physical obligations explicit;
7. create stable milestone/freeze tags only when all required gates have actually passed.
