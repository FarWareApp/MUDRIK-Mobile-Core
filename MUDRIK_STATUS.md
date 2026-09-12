# MUDRIK Project Status

Last consolidated: 2026-09-12

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

## Current Branch and Repository

- Repository: `FarWareApp/MUDRIK-Mobile-Core`
- Branch: `mudrik-core-v1`
- Repository visibility: **public**
- Branch/ruleset enforcement: **not currently protected**
- Production repository-governance requirements: `docs/validation/REPOSITORY_PROTECTION_REQUIREMENTS.md`

`CODEOWNERS` exists for security-sensitive paths, but it is advisory until GitHub rules enforce review/status checks.

## Current Section State

### Section 01 — Mobile Core Freeze

Status:

`OPEN — PHYSICAL ANDROID LAYER 4 DEFERRED`

The Mobile Core implementation, hardening and automated pre-device gates are strong and operational. It is **not frozen** and must not receive `MOBILE-CORE-FROZEN` until the mandatory physical-device matrix passes.

Permanent Android application ID:

`com.farwareapp.mudrik`

Device validation assets:

- `eas.json` with `device-validation` internal APK profile;
- `scripts/section01-device-preflight.mjs`;
- `yarn device:preflight`;
- `docs/validation/SECTION_01_ANDROID_DEVICE_RUNBOOK.md`;
- `docs/validation/SECTION_01_DEVICE_EVIDENCE_RECORD.md`;
- manual `.github/workflows/android-device-validation-apk.yml`.

The APK workflow is manual while phone testing is deferred. It performs exact-SHA preflight, Expo native generation, Gradle APK build, SHA-256 evidence and provenance attestation. Production release signing remains a separate future security boundary.

Reference APK build proven successful before deferral:

- candidate: `acecb662e6bac231e18a62bccc45197794bda172`;
- Mobile Core Validation run #93 / ID `34708290715`: SUCCESS;
- Android Device Validation APK run #2 / ID `34708290677`: SUCCESS;
- artifact was temporary reference evidence and is not the future final test binary.

When physical testing starts, rebuild the APK from the then-current exact candidate SHA.

Important closed Section 01 defect:

`S01-DATA-001` — High / Closed. Project-only attachments could previously be misclassified as orphans and deleted by cleanup. The ownership query now protects message, draft and project attachment links, with regression coverage.

Detailed record:

`docs/validation/SECTION_01_DEFECTS.md`

### Section 02 — Platform Security Foundation

Status:

`PRE-DEVICE COMPLETE — OPEN / LAYER 4 REAL-ENVIRONMENT VALIDATION DEFERRED`

Validated security code candidate:

`256d55f2b93f33468d3c98d9e3a8192e2c584e1f`

Evidence:

- Mobile Core Validation run #133 / ID `34714989382`: SUCCESS;
- CodeQL Security Analysis run #26 / ID `34714989334`: SUCCESS;
- Mobile + Platform Security regressions: **57/57 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: PASS.

Implemented security foundation:

- canonical capability registry with no wildcard authority;
- exhaustive capability risk classification;
- deterministic default-deny authorization outside AI/model control;
- runtime validation of untrusted request/grant objects;
- revoked/expired grant rejection;
- exact identity binding;
- non-root workspace scopes for filesystem/git/terminal authority;
- exact-host allowlists for network authority;
- explicit background/elevation scope;
- traversal/encoding/ambiguous-path rejection;
- secret-reference boundary;
- secure-storage contract without pretending ordinary storage is secure;
- privacy-safe security-event schema and credential redaction;
- CodeQL SAST;
- dependency and secret gates;
- Dependabot proposals;
- CODEOWNERS;
- vulnerability-reporting policy;
- threat-model template;
- security-review checklist;
- APK build-provenance foundation.

Important closed Section 02 defect:

`S02-AUTH-001` — High / Closed. The first policy implementation could treat an unscoped capability grant as allowing background/elevated use. It was detected during adversarial review before production coupling and fixed so missing scope fails toward foreground/no-elevation, with stronger explicit scopes for high-authority capabilities.

Detailed evidence and defects:

- `docs/validation/SECTION_02_PLATFORM_SECURITY_GATE.md`
- `docs/validation/SECTION_02_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_02_DEFECTS.md`

Layer 4 still required before final production closure:

- Android hardware-backed secure storage;
- iOS secure storage when iOS enters release scope;
- desktop OS key-store/TPM where supported;
- real credential invalidation/revocation;
- production-like secret-manager integration;
- production signing/verification failure tests;
- outage/degraded authorization behavior;
- kill/revoke behavior during partial failure;
- independent security review of cryptographic/authentication boundaries;
- enforced repository protection/rulesets.

### Section 03 — Account Identity, Authentication and Device Trust

Status:

`NEXT PRE-DEVICE SECTION — NOT YET VALIDATED`

Planned scope:

- account/session architecture;
- passkey-first design where supported;
- MFA/step-up authentication for sensitive actions;
- local device identity and cryptographic key binding;
- pairing/unpairing/revocation;
- session inventory and remote sign-out;
- short-lived credentials and rotation;
- recovery-flow threat model;
- signed task/device identity foundations and replay protection interfaces.

No device is trusted merely because it shares a local network or account session.

## Mobile Core Architecture Rule

The app-first boundary remains mandatory:

- Mobile UI is presentation/interaction, not the authority layer;
- chat accepts input and renders output without depending on the output source;
- production AI/provider/server transport remains decoupled from Mobile UI until the Mobile Core physical freeze obligation is satisfied;
- modules retain one responsibility where practical;
- future server/AI/agent systems must not silently weaken Mobile privacy or permission behavior.

## Computer Agent Direction

Target topology:

`MUDRIK Mobile/Web -> protected Control Plane -> outbound Computer Agent`

The browser/phone sends high-level tasks. The local Computer Agent executes only inside deterministic capability policy. No raw unauthenticated remote shell is exposed.

Computer Agent Phase 0 already includes:

- versioned task/grant/event protocols;
- default-deny policy;
- scoped filesystem/executable handling;
- expiration/revocation checks;
- critical one-shot approval model;
- per-step permission re-evaluation;
- Linux-first terminal adapter with `shell: false`;
- restricted inherited environment;
- timeout/output limits/cancellation;
- structured task lifecycle and CLI;
- automated regression tests.

Future autonomous work loop:

`Understand -> Inspect -> Research -> Plan -> Implement -> Build -> Test -> Diagnose -> Repair -> Re-test -> Review -> Finish`

Completion must be based on verification evidence, not on code generation alone.

## High-Assurance Control Plane Direction

The future server is not a generic relay. Architecture is defined for a high-assurance, low-latency real-time control plane with:

- protected edge and regional gateways;
- persistent authenticated outbound device channels;
- encrypted transport;
- independently signed/validated sensitive commands;
- nonce/expiry/sequence/replay protection;
- durable task/event delivery;
- idempotency and duplicate-execution defense;
- reconnect/resume;
- rate/resource limits;
- kill/revoke controls;
- compartmentalized identity/authorization/execution boundaries;
- durable source-of-truth state;
- failover/recovery/load/latency acceptance tests.

Architecture and threat model:

- `docs/architecture/MUDRIK_HIGH_ASSURANCE_CONTROL_PLANE.md`
- `docs/architecture/MUDRIK_CONTROL_PLANE_THREAT_MODEL.md`
- `docs/validation/SECTION_14_CONTROL_PLANE_ACCEPTANCE_GATE.md`

The Control Plane routes/authorizes state; it does not replace the Computer Agent's local permission boundary.

## Privacy and Companion Principles

MUDRIK must truthfully report current observation state. Commands such as "لا تراقبني" / "غمّض عيونك" change the underlying observation state, not only avatar animation. Disabled passive observation must not silently reactivate after restart, handoff, room change or model restart.

Relevant architecture:

- `docs/architecture/MUDRIK_OBSERVATION_PRIVACY.md`
- `docs/architecture/MUDRIK_SMART_COMPANION.md`
- `docs/architecture/MUDRIK_VOICE_INTERACTION.md`
- `docs/architecture/MUDRIK_AMBIENT_DEVICE_MEDIA_ORCHESTRATION.md`
- `docs/architecture/MUDRIK_SMART_DEVICE_FINDING.md`
- `docs/architecture/MUDRIK_EMERGENCY_GUARDIAN.md`

AI/personality/prompt state never grants sensor/tool authority.

## Security Principles

Authoritative baseline:

- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_SECURITY_ASSURANCE_PROGRAM.md`
- `docs/architecture/MUDRIK_THREAT_MODEL_TEMPLATE.md`
- `docs/validation/SECURITY_REVIEW_CHECKLIST.md`

Core rules:

- Zero Trust;
- least privilege;
- deny by default;
- defense in depth;
- fail secure;
- compartmentalize compromise;
- AI/model output is untrusted input, never authority;
- production secrets/private keys are not committed;
- security telemetry is minimized/redacted;
- sensitive actions require deterministic policy;
- security incidents are not hidden to protect brand reputation;
- user protection and lawful incident response take priority.

## Dependency / Tooling Posture

Current stack includes Expo SDK 57, React Native, TypeScript, SQLite and Expo Router.

Validation toolchain includes:

- frozen Yarn lockfile;
- ESLint `9.39.5` + `eslint-config-expo 57.0.2` because Expo/React plugin compatibility currently prevents a clean ESLint 10 migration;
- TypeScript;
- Expo Doctor `1.20.4` pinned in CI;
- Node 22 in CI;
- CodeQL JS/TS;
- dependency audit;
- full-history secret scan;
- pinned GitHub Actions in trust-sensitive workflows.

Known reviewed Moderate transitive advisories remain visible:

- `uuid@7.0.3` through Expo configuration tooling;
- `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible override is accepted merely to silence an audit warning.

## Physical Validation Debt

Because physical testing is deferred, no section with hardware/OS/production-like obligations may be represented as fully closed until those obligations are executed.

Section 20 cannot close until deferred Layer 4 obligations from Sections 01–19 are completed or explicitly proven not applicable.

When deferred testing begins:

1. rebuild every test artifact/service from exact current candidate SHAs;
2. execute each section's Layer 4 matrix;
3. record PASS/FAIL/BLOCKED evidence;
4. classify every failure;
5. add automated regression coverage where feasible;
6. fix and retest the failure plus adjacent cases;
7. rerun full CI/SAST/security gates;
8. only then authorize freeze/release tags.

## Next Work

1. Confirm documentation-only Section 02 closing commits remain green in Mobile Validation and CodeQL.
2. Begin Section 03 — Account Identity, Authentication and Device Trust in pre-device mode.
3. Keep Section 01 and Section 02 formally open for deferred Layer 4 evidence.
4. Do not couple production AI/server authority into the Mobile UI.

## Development Rule

For every major section:

1. implement the defined scope;
2. run all applicable validation layers;
3. fix failures rather than suppress them;
4. record exact evidence and defects;
5. update this status summary;
6. create stable milestone tags only when all required gates, including deferred physical gates, are satisfied.
